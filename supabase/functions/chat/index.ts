import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import {
  rateLimit,
  RATE_LIMITS,
  getClientIP,
} from "../_shared/ratelimit.ts";
import {
  ChatRequestSchema,
  validationErrorResponse,
} from "../_shared/schemas.ts";
import { ZodError } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  agentId: string;
  messages: ChatMessage[];
  sessionId?: string;
}

// Email regex pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Phone regex pattern - supports various formats
const PHONE_REGEX = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;

// Extract contact info from text
function extractContactInfo(text: string): { email: string | null; phone: string | null } {
  const emailMatches = text.match(EMAIL_REGEX);
  const phoneMatches = text.match(PHONE_REGEX);

  // Get first valid email
  const email = emailMatches?.[0] || null;

  // Get first valid phone and normalize it
  let phone: string | null = null;
  if (phoneMatches?.[0]) {
    // Remove all non-digit characters except leading +
    const rawPhone = phoneMatches[0];
    const digits = rawPhone.replace(/\D/g, '');
    // Format as E.164 if US number
    if (digits.length === 10) {
      phone = `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      phone = `+${digits}`;
    } else {
      phone = rawPhone; // Store raw if can't normalize
    }
  }

  return { email, phone };
}

// Generate embedding for a text using OpenAI API
async function generateQueryEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      console.error('Embedding API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (err) {
    console.error('Failed to generate embedding:', err);
    return null;
  }
}

// Send Slack notification - non-blocking
async function sendSlackNotification(
  workspaceId: string,
  notificationType: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) return;

    const slackUrl = `${supabaseUrl}/functions/v1/slack/notify`;
    await fetch(slackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, notificationType, data }),
    });
  } catch (err) {
    // Don't let Slack errors affect chat
    console.error('Slack notification error:', err);
  }
}

// Types for Supabase operations
interface SupabaseClientType {
  from: (table: string) => unknown;
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}

interface LeadUpdates {
  email?: string;
  phone?: string;
  updated_at: string;
}

// Upsert lead - non-blocking
async function upsertLead(
  supabase: SupabaseClientType,
  workspaceId: string,
  agentId: string,
  sessionId: string,
  email: string | null,
  phone: string | null,
  channel: string = 'web',
  agentName: string = 'AI Agent'
): Promise<string | null> {
  try {
    // Check if lead already exists for this session
    const { data: existingLead } = await (supabase as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { id: string; email: string | null; phone: string | null } | null }> } } } })
      .from('leads')
      .select('id, email, phone')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existingLead) {
      // Merge - update only if we have new info
      const updates: LeadUpdates = { updated_at: new Date().toISOString() };
      let isNewInfo = false;
      if (email && !existingLead.email) {
        updates.email = email;
        isNewInfo = true;
      }
      if (phone && !existingLead.phone) {
        updates.phone = phone;
        isNewInfo = true;
      }

      if (Object.keys(updates).length > 1) {
        await supabase
          .from('leads')
          .update(updates)
          .eq('id', existingLead.id);
        console.log(`Lead updated: ${existingLead.id}`);

        // Send Slack notification for new contact info
        if (isNewInfo) {
          sendSlackNotification(workspaceId, 'lead_captured', {
            email: email || existingLead.email,
            phone: phone || existingLead.phone,
            agentName,
          });
        }
      }
      return existingLead.id;
    } else {
      // Create new lead
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          workspace_id: workspaceId,
          agent_id: agentId,
          session_id: sessionId,
          email,
          phone,
          channel,
          source: 'chat_autodetect',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating lead:', error);
        return null;
      }

      console.log(`Lead created: ${newLead.id}`);

      // Update chat session with lead info
      await supabase
        .from('chat_sessions')
        .update({
          lead_captured: true,
          lead_id: newLead.id,
        })
        .eq('session_id', sessionId)
        .eq('agent_id', agentId);

      // Send Slack notification for new lead
      sendSlackNotification(workspaceId, 'lead_captured', {
        email,
        phone,
        agentName,
      });

      return newLead.id;
    }
  } catch (err) {
    console.error('Lead upsert error:', err);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check - by IP and session
    const rateLimitResult = rateLimit(req, 'chat', RATE_LIMITS.WIDGET_CHAT);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const body = await req.json();

    // Validate input with Zod schema
    const validation = ChatRequestSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    const { agentId, messages, sessionId } = validation.data;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for backend access
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Load agent data with LLM model info
    console.log(`Loading agent: ${agentId}`);
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select(`
        *,
        llm_model:llm_models(id, provider, model_id, display_name, supports_function_calling)
      `)
      .eq("id", agentId)
      .maybeSingle();

    if (agentError) {
      console.error("Error loading agent:", agentError);
    }

    // Determine which model to use (agent's configured model or default)
    let modelId = "gpt-4o-mini"; // Default fallback
    let temperature = 0.7;
    let maxTokens = 1024;

    if (agent?.llm_model?.model_id) {
      modelId = agent.llm_model.model_id;
      console.log(`Using agent's configured model: ${modelId}`);
    }
    if (agent?.llm_temperature !== null && agent?.llm_temperature !== undefined) {
      temperature = agent.llm_temperature;
    }
    if (agent?.llm_max_tokens !== null && agent?.llm_max_tokens !== undefined) {
      maxTokens = agent.llm_max_tokens;
    }

    // Validate domain against allowed_domains
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    let requestHostname = "";
    try {
      if (origin) {
        requestHostname = new URL(origin).hostname;
      }
    } catch (e) {
      console.log("Could not parse origin:", origin);
    }

    // Load widget config to check allowed domains
    const { data: widgetConfig } = await supabase
      .from("agent_web_widget_config")
      .select("allowed_domains, enabled")
      .eq("agent_id", agentId)
      .maybeSingle();

    if (widgetConfig && widgetConfig.allowed_domains && widgetConfig.allowed_domains.length > 0) {
      const allowed = widgetConfig.allowed_domains.some((domain: string) => {
        return requestHostname === domain ||
               requestHostname.endsWith("." + domain) ||
               (domain === "localhost" && (requestHostname === "localhost" || requestHostname === "127.0.0.1"));
      });

      if (!allowed && requestHostname) {
        console.log(`Domain not allowed: ${requestHostname}. Allowed: ${widgetConfig.allowed_domains.join(", ")}`);
        return new Response(
          JSON.stringify({ error: "Domain not allowed" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Extract contact info from user messages (non-blocking lead capture)
    if (sessionId && agent?.workspace_id) {
      const allUserText = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' ');

      const { email, phone } = extractContactInfo(allUserText);

      if (email || phone) {
        console.log(`Contact info detected - Email: ${email}, Phone: ${phone}`);
        // Fire and forget - don't await to keep response fast
        upsertLead(supabase, agent.workspace_id, agentId, sessionId, email, phone, 'web', agent.name || 'AI Agent');
      }
    }

    // Load persona if agent has one
    let persona = null;
    if (agent?.persona_id) {
      console.log(`Loading persona: ${agent.persona_id}`);
      const { data: personaData, error: personaError } = await supabase
        .from("personas")
        .select("*")
        .eq("id", agent.persona_id)
        .maybeSingle();

      if (personaError) {
        console.error("Error loading persona:", personaError);
      } else {
        persona = personaData;
      }
    }

    // Load knowledge base content if agent has knowledge sources
    let knowledgeContext = "";
    if (agent?.knowledge_source_ids && agent.knowledge_source_ids.length > 0) {
      console.log(`Loading knowledge from ${agent.knowledge_source_ids.length} sources`);

      // Get the latest user message for retrieval
      const latestUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";

      // Try vector-based semantic search first
      let matchedChunks: Array<{ content: string; source_name?: string }> = [];
      const queryEmbedding = await generateQueryEmbedding(latestUserMessage, OPENAI_API_KEY!);

      if (queryEmbedding) {
        // Use vector similarity search via RPC function
        const { data: vectorResults, error: vectorError } = await supabase.rpc(
          'match_knowledge_chunks',
          {
            query_embedding: queryEmbedding,
            match_source_ids: agent.knowledge_source_ids,
            match_threshold: 0.5,
            match_count: 5,
          }
        );

        if (!vectorError && vectorResults && vectorResults.length > 0) {
          console.log(`Vector search found ${vectorResults.length} relevant chunks`);
          matchedChunks = vectorResults;
        } else if (vectorError) {
          console.log('Vector search unavailable, falling back to keyword search:', vectorError.message);
        }
      }

      // Fallback to keyword-based retrieval if vector search didn't return results
      if (matchedChunks.length === 0) {
        console.log('Using keyword-based fallback for knowledge retrieval');
        const { data: chunks, error: chunksError } = await supabase
          .from("knowledge_chunks")
          .select("content, source_id")
          .in("source_id", agent.knowledge_source_ids)
          .limit(10);

        if (!chunksError && chunks && chunks.length > 0) {
          // Simple scoring based on keyword matching
          const queryWords = latestUserMessage.toLowerCase().split(/\s+/);
          matchedChunks = chunks.map(chunk => {
            const chunkLower = chunk.content.toLowerCase();
            let score = 0;
            for (const word of queryWords) {
              if (word.length > 2 && chunkLower.includes(word)) {
                score++;
              }
            }
            return { ...chunk, similarity: score / queryWords.length };
          }).filter(c => c.similarity > 0).sort((a, b) => b.similarity - a.similarity).slice(0, 5);
        }
      }

      // Build knowledge context from matched chunks
      if (matchedChunks.length > 0) {
        knowledgeContext = "\n\n## Relevant Knowledge:\n" +
          matchedChunks.map(c => c.content).join("\n---\n");
        console.log(`Added ${matchedChunks.length} chunks to context (${knowledgeContext.length} chars)`);
      }
    }

    // Build system prompt based on agent and persona
    let systemPrompt = "You are a helpful AI assistant.";

    if (agent) {
      systemPrompt = `You are an AI assistant for ${agent.name}.`;

      if (agent.goals) {
        systemPrompt += `\n\nYour goals: ${agent.goals}`;
      }

      if (agent.business_domain && agent.business_domain !== "other") {
        systemPrompt += `\n\nYou specialize in ${agent.business_domain}.`;
      }
    }

    if (persona) {
      systemPrompt = `You are ${persona.name}, ${persona.role_title}.`;

      // Tone
      const toneInstructions: Record<string, string> = {
        professional: "Maintain a professional and courteous tone in all interactions.",
        friendly: "Be warm, friendly, and approachable in your responses.",
        casual: "Keep your responses casual and conversational.",
        formal: "Use formal language and maintain proper etiquette.",
      };
      systemPrompt += `\n\n${toneInstructions[persona.tone] || toneInstructions.professional}`;

      // Style notes
      if (persona.style_notes) {
        systemPrompt += `\n\nStyle guidelines: ${persona.style_notes}`;
      }

      // Greeting script
      if (persona.greeting_script) {
        systemPrompt += `\n\nWhen greeting users, use: "${persona.greeting_script}"`;
      }

      // Do not do restrictions
      if (persona.do_not_do && persona.do_not_do.length > 0) {
        systemPrompt += `\n\nRestrictions - Do NOT:\n- ${persona.do_not_do.join("\n- ")}`;
      }

      // Fallback policy
      const fallbackPolicies: Record<string, string> = {
        apologize: "If you don't know something, apologize politely and offer to help in another way.",
        escalate: "If you cannot help with a request, let the user know you'll escalate to a human agent.",
        retry: "If you don't understand, ask clarifying questions to better assist the user.",
        transfer: "If the request is beyond your capabilities, offer to transfer to a human representative.",
      };
      systemPrompt += `\n\n${fallbackPolicies[persona.fallback_policy] || fallbackPolicies.apologize}`;

      // Escalation rules
      if (persona.escalation_rules) {
        systemPrompt += `\n\nEscalation rules: ${persona.escalation_rules}`;
      }
    }

    // Add soft lead capture guidelines
    systemPrompt += `\n\n## Lead Capture Guidelines:
- If the user asks for a quote, appointment, pricing, availability, or follow-up, politely ask: "I can help with that. Would you like to leave an email or phone number so we can follow up?"
- Never demand contact information; only ask once if the user declines or ignores the request.
- Do not collect sensitive data beyond basic contact info (email, phone, name).
- If the user provides their contact info naturally, acknowledge it briefly and continue helping them.`;

    // Add knowledge context
    if (knowledgeContext) {
      systemPrompt += knowledgeContext;
      systemPrompt += "\n\nUse the above knowledge to answer user questions when relevant.";
    }

    // Load agent's enabled tools for function calling
    interface OpenAITool {
      type: string;
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      };
    }
    let openAITools: OpenAITool[] = [];
    if (agent?.id) {
      const { data: agentTools, error: toolsError } = await supabase
        .from("agent_tools")
        .select("*")
        .eq("agent_id", agent.id)
        .eq("is_enabled", true);

      if (!toolsError && agentTools && agentTools.length > 0) {
        console.log(`Loaded ${agentTools.length} tools for agent`);

        // Convert to OpenAI tools format
        openAITools = agentTools.map(tool => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        }));

        // Add tool usage instructions to system prompt
        systemPrompt += `\n\n## Available Tools:
You have access to the following tools. Use them when appropriate to help the user:
${agentTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

When you need to use a tool, call the appropriate function with the required parameters.`;
      }
    }

    console.log(`System prompt built (${systemPrompt.length} chars), sending to OpenAI`);

    // Build OpenAI API request body
    const openAIRequestBody: Record<string, unknown> = {
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    // Add tools if available
    if (openAITools.length > 0) {
      openAIRequestBody.tools = openAITools;
      openAIRequestBody.tool_choice = "auto";
    }

    // Call OpenAI API with agent's configured model settings
    console.log(`Calling OpenAI with model: ${modelId}, temperature: ${temperature}, max_tokens: ${maxTokens}, tools: ${openAITools.length}`);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openAIRequestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
