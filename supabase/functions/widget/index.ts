import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate widget script with environment variables injected
function generateWidgetScript(): string {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

  return `(function() {
  'use strict';

  // Get the script element and extract agent ID
  var scriptTag = document.currentScript;
  var agentId = scriptTag && scriptTag.getAttribute('data-agent');

  if (!agentId) {
    console.error('[Widget] Missing data-agent attribute');
    return;
  }

  // API configuration - injected from server environment
  var SUPABASE_URL = '${SUPABASE_URL}';
  var ANON_KEY = '${SUPABASE_ANON_KEY}';
  var CONFIG_ENDPOINT = SUPABASE_URL + '/functions/v1/widget-config?agentId=' + agentId;
  var CHAT_ENDPOINT = SUPABASE_URL + '/functions/v1/chat';
  var LOG_ENDPOINT = SUPABASE_URL + '/functions/v1/log-chat-session';

  var config = null;
  var isOpen = false;
  var messages = [];
  var sessionId = null;

  // Generate session ID
  function generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Check if current domain is allowed
  function isDomainAllowed(allowedDomains) {
    var currentHost = window.location.hostname;

    // If no domains specified, allow all (for development)
    if (!allowedDomains || allowedDomains.length === 0) {
      return true;
    }

    return allowedDomains.some(function(domain) {
      // Exact match or subdomain match
      return currentHost === domain ||
             currentHost.endsWith('.' + domain) ||
             domain === 'localhost' && (currentHost === 'localhost' || currentHost === '127.0.0.1');
    });
  }

  // Fetch widget config
  async function fetchConfig() {
    try {
      var response = await fetch(CONFIG_ENDPOINT, {
        headers: { 'Authorization': 'Bearer ' + ANON_KEY }
      });

      if (!response.ok) {
        console.error('[Widget] Failed to fetch config');
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[Widget] Config fetch error:', error);
      return null;
    }
  }

  // Create and inject styles
  function injectStyles(primaryColor, position) {
    var style = document.createElement('style');
    style.textContent =
      '.chat-widget-container {' +
        'position: fixed;' +
        'bottom: 20px;' +
        (position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;') +
        'z-index: 999999;' +
        "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" +
      '}' +
      '.chat-widget-launcher {' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 8px;' +
        'padding: 12px 20px;' +
        'background: ' + primaryColor + ';' +
        'color: white;' +
        'border: none;' +
        'border-radius: 50px;' +
        'cursor: pointer;' +
        'font-size: 14px;' +
        'font-weight: 500;' +
        'box-shadow: 0 4px 20px rgba(0,0,0,0.15);' +
        'transition: transform 0.2s, box-shadow 0.2s;' +
      '}' +
      '.chat-widget-launcher:hover {' +
        'transform: translateY(-2px);' +
        'box-shadow: 0 6px 25px rgba(0,0,0,0.2);' +
      '}' +
      '.chat-widget-launcher svg {' +
        'width: 20px;' +
        'height: 20px;' +
      '}' +
      '.chat-widget-window {' +
        'position: absolute;' +
        'bottom: 70px;' +
        (position === 'bottom-left' ? 'left: 0;' : 'right: 0;') +
        'width: 380px;' +
        'height: 520px;' +
        'background: white;' +
        'border-radius: 16px;' +
        'box-shadow: 0 10px 40px rgba(0,0,0,0.15);' +
        'display: none;' +
        'flex-direction: column;' +
        'overflow: hidden;' +
      '}' +
      '.chat-widget-window.open {' +
        'display: flex;' +
      '}' +
      '.chat-widget-header {' +
        'padding: 16px 20px;' +
        'background: ' + primaryColor + ';' +
        'color: white;' +
        'display: flex;' +
        'justify-content: space-between;' +
        'align-items: center;' +
      '}' +
      '.chat-widget-header h3 {' +
        'margin: 0;' +
        'font-size: 16px;' +
        'font-weight: 600;' +
      '}' +
      '.chat-widget-close {' +
        'background: none;' +
        'border: none;' +
        'color: white;' +
        'cursor: pointer;' +
        'padding: 4px;' +
        'opacity: 0.8;' +
        'transition: opacity 0.2s;' +
      '}' +
      '.chat-widget-close:hover {' +
        'opacity: 1;' +
      '}' +
      '.chat-widget-messages {' +
        'flex: 1;' +
        'overflow-y: auto;' +
        'padding: 16px;' +
        'display: flex;' +
        'flex-direction: column;' +
        'gap: 12px;' +
        'background: white;' +
      '}' +
      '.chat-widget-message {' +
        'max-width: 85%;' +
        'padding: 10px 14px;' +
        'border-radius: 12px;' +
        'font-size: 14px;' +
        'line-height: 1.4;' +
        'word-wrap: break-word;' +
      '}' +
      '.chat-widget-message.user {' +
        'align-self: flex-end;' +
        'background: ' + primaryColor + ';' +
        'color: white;' +
        'border-bottom-right-radius: 4px;' +
      '}' +
      '.chat-widget-message.assistant {' +
        'align-self: flex-start;' +
        'background: #f1f5f9;' +
        'color: #1e293b;' +
        'border-bottom-left-radius: 4px;' +
      '}' +
      '.chat-widget-input-container {' +
        'padding: 12px 16px;' +
        'border-top: 1px solid #e2e8f0;' +
        'display: flex;' +
        'gap: 8px;' +
        'background: white;' +
      '}' +
      '.chat-widget-input {' +
        'flex: 1;' +
        'padding: 10px 14px;' +
        'border: 1px solid #e2e8f0;' +
        'border-radius: 8px;' +
        'font-size: 14px;' +
        'outline: none;' +
        'transition: border-color 0.2s;' +
        'color: #1e293b !important;' +
        'background: white !important;' +
        'background-color: white !important;' +
        'caret-color: #1e293b !important;' +
        '-webkit-text-fill-color: #1e293b !important;' +
      '}' +
      '.chat-widget-input:focus {' +
        'border-color: ' + primaryColor + ';' +
      '}' +
      '.chat-widget-input::placeholder {' +
        'color: #94a3b8;' +
      '}' +
      '.chat-widget-send {' +
        'padding: 10px 16px;' +
        'background: ' + primaryColor + ';' +
        'color: white;' +
        'border: none;' +
        'border-radius: 8px;' +
        'cursor: pointer;' +
        'font-size: 14px;' +
        'font-weight: 500;' +
        'transition: opacity 0.2s;' +
      '}' +
      '.chat-widget-send:hover {' +
        'opacity: 0.9;' +
      '}' +
      '.chat-widget-send:disabled {' +
        'opacity: 0.5;' +
        'cursor: not-allowed;' +
      '}' +
      '.chat-widget-typing {' +
        'display: flex;' +
        'gap: 4px;' +
        'padding: 10px 14px;' +
        'background: #f1f5f9;' +
        'border-radius: 12px;' +
        'align-self: flex-start;' +
        'border-bottom-left-radius: 4px;' +
      '}' +
      '.chat-widget-typing span {' +
        'width: 8px;' +
        'height: 8px;' +
        'background: #94a3b8;' +
        'border-radius: 50%;' +
        'animation: typing 1.4s infinite;' +
      '}' +
      '.chat-widget-typing span:nth-child(2) { animation-delay: 0.2s; }' +
      '.chat-widget-typing span:nth-child(3) { animation-delay: 0.4s; }' +
      '@keyframes typing {' +
        '0%, 60%, 100% { transform: translateY(0); }' +
        '30% { transform: translateY(-6px); }' +
      '}' +
      '@media (max-width: 440px) {' +
        '.chat-widget-window {' +
          'width: calc(100vw - 40px);' +
          'height: 70vh;' +
          'max-height: 500px;' +
        '}' +
      '}';
    document.head.appendChild(style);
  }

  // Create widget DOM
  function createWidget(launcherLabel) {
    var container = document.createElement('div');
    container.className = 'chat-widget-container';
    container.innerHTML =
      '<div class="chat-widget-window">' +
        '<div class="chat-widget-header">' +
          '<h3>' + launcherLabel + '</h3>' +
          '<button class="chat-widget-close" aria-label="Close chat">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="18" y1="6" x2="6" y2="18"></line>' +
              '<line x1="6" y1="6" x2="18" y2="18"></line>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<div class="chat-widget-messages"></div>' +
        '<div class="chat-widget-input-container">' +
          '<input type="text" class="chat-widget-input" placeholder="Type a message..." style="color: #1e293b !important; background: white !important; caret-color: #1e293b !important; -webkit-text-fill-color: #1e293b !important;" />' +
          '<button class="chat-widget-send">Send</button>' +
        '</div>' +
      '</div>' +
      '<button class="chat-widget-launcher">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' +
        '</svg>' +
        launcherLabel +
      '</button>';
    document.body.appendChild(container);
    return container;
  }

  // Send message to chat API
  async function sendMessage(userMessage) {
    var messagesContainer = document.querySelector('.chat-widget-messages');
    var input = document.querySelector('.chat-widget-input');
    var sendBtn = document.querySelector('.chat-widget-send');

    if (!userMessage.trim()) return;

    // Add user message
    messages.push({ role: 'user', content: userMessage });
    messagesContainer.innerHTML += '<div class="chat-widget-message user">' + escapeHtml(userMessage) + '</div>';

    // Show typing indicator
    messagesContainer.innerHTML +=
      '<div class="chat-widget-typing" id="typing-indicator">' +
        '<span></span><span></span><span></span>' +
      '</div>';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    try {
      var response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
        },
        body: JSON.stringify({
          agentId: agentId,
          sessionId: sessionId,
          messages: messages,
        }),
      });

      // Remove typing indicator
      var typingEl = document.getElementById('typing-indicator');
      if (typingEl) typingEl.remove();

      if (!response.ok) {
        var error = await response.json().catch(function() { return { error: 'Chat failed' }; });
        throw new Error(error.error || 'Chat failed');
      }

      // Stream response
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var assistantContent = '';

      // Add empty assistant message
      var msgElement = document.createElement('div');
      msgElement.className = 'chat-widget-message assistant';
      messagesContainer.appendChild(msgElement);

      while (true) {
        var result = await reader.read();
        if (result.done) break;

        var chunk = decoder.decode(result.value, { stream: true });
        var lines = chunk.split('\\n');

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.indexOf('data: ') === 0) {
            var data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              var parsed = JSON.parse(data);
              var content = parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content;
              if (content) {
                assistantContent += content;
                msgElement.textContent = assistantContent;
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      messages.push({ role: 'assistant', content: assistantContent });

      // Log session
      fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
        },
        body: JSON.stringify({
          agentId: agentId,
          sessionId: sessionId,
          messages: messages,
        }),
      }).catch(function() {}); // Fire and forget

    } catch (error) {
      var typingEl2 = document.getElementById('typing-indicator');
      if (typingEl2) typingEl2.remove();
      messagesContainer.innerHTML +=
        '<div class="chat-widget-message assistant">Sorry, something went wrong. Please try again.</div>';
      console.error('[Widget] Chat error:', error);
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize widget
  async function init() {
    config = await fetchConfig();

    if (!config || !config.enabled) {
      console.warn('[Widget] Widget is disabled for this agent');
      return;
    }

    if (!isDomainAllowed(config.allowed_domains)) {
      console.warn('[Widget] This domain is not in the allowed domains list');
      return;
    }

    // Generate session ID
    sessionId = generateSessionId();

    // Inject styles and create widget
    injectStyles(config.primary_color, config.position);
    var container = createWidget(config.launcher_label);

    // Event listeners
    var launcher = container.querySelector('.chat-widget-launcher');
    var closeBtn = container.querySelector('.chat-widget-close');
    var chatWindow = container.querySelector('.chat-widget-window');
    var input = container.querySelector('.chat-widget-input');
    var sendBtn = container.querySelector('.chat-widget-send');

    // Force input styles via JavaScript (overrides any CSS)
    input.style.setProperty('color', '#1e293b', 'important');
    input.style.setProperty('background-color', 'white', 'important');
    input.style.setProperty('caret-color', '#1e293b', 'important');
    input.style.setProperty('-webkit-text-fill-color', '#1e293b', 'important');

    launcher.addEventListener('click', function() {
      isOpen = !isOpen;
      if (isOpen) {
        chatWindow.classList.add('open');
        input.focus();
      } else {
        chatWindow.classList.remove('open');
      }
    });

    closeBtn.addEventListener('click', function() {
      isOpen = false;
      chatWindow.classList.remove('open');
    });

    sendBtn.addEventListener('click', function() {
      sendMessage(input.value);
    });

    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendMessage(input.value);
      }
    });

    console.log('[Widget] Initialized successfully');
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Generate and serve the widget JavaScript with injected env vars
  const widgetScript = generateWidgetScript();

  return new Response(widgetScript, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300", // 5 min cache (shorter due to env vars)
    },
  });
});
