import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents, useUpdateAgent, AgentRow } from '@/hooks/useAgents';
import { useChannelConfigs, useUpsertChannelConfig } from '@/hooks/useChannelConfigs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Phone,
  MessageCircle,
  Smartphone,
  Settings,
  Copy,
  Check,
  Bot,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ChannelType = 'webChat' | 'phone' | 'sms' | 'whatsapp';

interface ChannelCardProps {
  type: ChannelType;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onConfigure: () => void;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  title,
  description,
  icon,
  enabled,
  onConfigure,
}) => (
  <Card className="glass border-border/50 hover:border-primary/30 transition-all">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${enabled ? 'bg-success/10' : 'bg-secondary'}`}>
            <div className={enabled ? 'text-success' : 'text-muted-foreground'}>
              {icon}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge variant={enabled ? 'default' : 'secondary'} className={enabled ? 'bg-success text-success-foreground' : ''}>
          {enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={onConfigure}>
          <Settings className="w-4 h-4 mr-2" />
          Configure
        </Button>
      </div>
    </CardContent>
  </Card>
);

const ChannelsPage: React.FC = () => {
  const { workspace, hasPermission } = useAuth();
  const { toast } = useToast();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelType | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const { data: agents = [], isLoading: isLoadingAgents } = useAgents();
  const { data: channelConfigs = [] } = useChannelConfigs(selectedAgentId || undefined);
  const updateAgent = useUpdateAgent();
  const upsertChannelConfig = useUpsertChannelConfig();

  // Channel configs state
  const [webChatConfig, setWebChatConfig] = useState({ enabled: false, greeting: '', embedSnippet: '' });
  const [phoneConfig, setPhoneConfig] = useState({ 
    enabled: false, 
    phoneNumber: '', 
    businessHours: '9am-5pm', 
    voicemailFallback: true,
    escalationToHuman: false,
    provider: 'twilio'
  });
  const [smsConfig, setSmsConfig] = useState({ enabled: false, senderId: '' });
  const [whatsappConfig, setWhatsappConfig] = useState({ enabled: false, senderId: '' });

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  // Load channel configs when agent changes
  useEffect(() => {
    if (selectedAgentId && selectedAgent) {
      const webChat = channelConfigs.find(c => c.channel === 'webChat');
      const phone = channelConfigs.find(c => c.channel === 'phone');
      const sms = channelConfigs.find(c => c.channel === 'sms');
      const whatsapp = channelConfigs.find(c => c.channel === 'whatsapp');

      const channels = selectedAgent.channels as { webChat?: boolean; phone?: boolean; sms?: boolean; whatsapp?: boolean };
      const snippet = generateEmbedSnippet(selectedAgentId);

      setWebChatConfig({
        enabled: channels?.webChat || false,
        greeting: webChat?.greeting || 'Hello! How can I help you today?',
        embedSnippet: snippet,
      });

      setPhoneConfig({
        enabled: channels?.phone || false,
        phoneNumber: phone?.phone_number || '+1 (555) 123-4567',
        businessHours: phone?.business_hours || '9am-5pm',
        voicemailFallback: phone?.voicemail_fallback ?? true,
        escalationToHuman: phone?.escalation_to_human ?? false,
        provider: phone?.provider || 'twilio',
      });

      setSmsConfig({
        enabled: channels?.sms || false,
        senderId: sms?.greeting || '',
      });

      setWhatsappConfig({
        enabled: channels?.whatsapp || false,
        senderId: whatsapp?.greeting || '',
      });
    }
  }, [selectedAgentId, selectedAgent, channelConfigs]);

  if (!workspace) return null;

  const generateEmbedSnippet = (agentId: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ehvcrdooykxmcpcopuxz.supabase.co';
    return `<!-- Agent Cockpit Chat Widget -->
<script>
(function() {
  const CHAT_API = '${supabaseUrl}/functions/v1/chat';
  const LOG_API = '${supabaseUrl}/functions/v1/log-chat-session';
  const AGENT_ID = '${agentId}';
  const SESSION_ID = 'sess_' + Math.random().toString(36).substr(2, 9);
  
  // Create chat widget container
  const container = document.createElement('div');
  container.id = 'agent-cockpit-widget';
  container.innerHTML = \`
    <style>
      #ac-chat-btn { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; border-radius: 50%; background: #6366f1; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 9999; display: flex; align-items: center; justify-content: center; }
      #ac-chat-btn svg { width: 28px; height: 28px; fill: white; }
      #ac-chat-window { position: fixed; bottom: 90px; right: 20px; width: 380px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12); z-index: 9999; display: none; flex-direction: column; overflow: hidden; }
      #ac-chat-header { padding: 16px; background: #6366f1; color: white; font-weight: 600; }
      #ac-chat-messages { flex: 1; padding: 16px; overflow-y: auto; }
      #ac-chat-input-container { padding: 12px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; }
      #ac-chat-input { flex: 1; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; outline: none; }
      #ac-chat-send { padding: 10px 16px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; }
      .ac-msg { margin-bottom: 12px; max-width: 80%; padding: 10px 14px; border-radius: 12px; word-wrap: break-word; }
      .ac-msg-user { background: #6366f1; color: white; margin-left: auto; }
      .ac-msg-assistant { background: #f3f4f6; color: #1f2937; }
    </style>
    <button id="ac-chat-btn"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></button>
    <div id="ac-chat-window">
      <div id="ac-chat-header">Chat with us</div>
      <div id="ac-chat-messages"></div>
      <div id="ac-chat-input-container">
        <input id="ac-chat-input" placeholder="Type a message..." />
        <button id="ac-chat-send">Send</button>
      </div>
    </div>
  \`;
  document.body.appendChild(container);
  
  const btn = document.getElementById('ac-chat-btn');
  const win = document.getElementById('ac-chat-window');
  const msgContainer = document.getElementById('ac-chat-messages');
  const input = document.getElementById('ac-chat-input');
  const sendBtn = document.getElementById('ac-chat-send');
  
  let messages = [];
  let isOpen = false;
  
  btn.onclick = () => { isOpen = !isOpen; win.style.display = isOpen ? 'flex' : 'none'; };
  
  function logSession() {
    fetch(LOG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: AGENT_ID, sessionId: SESSION_ID, messages })
    }).catch(e => console.log('Log error:', e));
  }
  
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    
    messages.push({ role: 'user', content: text });
    addMessage('user', text);
    input.value = '';
    
    try {
      const resp = await fetch(CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: AGENT_ID, messages, sessionId: SESSION_ID })
      });
      
      if (!resp.ok) throw new Error('Failed to send');
      
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';
      let msgEl = addMessage('assistant', '');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { assistantMsg += content; msgEl.textContent = assistantMsg; }
          } catch {}
        }
      }
      
      messages.push({ role: 'assistant', content: assistantMsg });
      logSession();
    } catch (e) { addMessage('assistant', 'Sorry, something went wrong.'); }
  }
  
  function addMessage(role, text) {
    const el = document.createElement('div');
    el.className = 'ac-msg ac-msg-' + role;
    el.textContent = text;
    msgContainer.appendChild(el);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    return el;
  }
  
  sendBtn.onclick = sendMessage;
  input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
})();
</script>`;
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(webChatConfig.embedSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
    toast({
      title: 'Snippet copied',
      description: 'Embed snippet copied to clipboard.',
    });
  };

  const openConfigDialog = (channel: ChannelType) => {
    setActiveChannel(channel);
    setConfigDialogOpen(true);
  };

  const saveChannelConfig = async (channel: ChannelType, enabled: boolean, config: Record<string, unknown>) => {
    if (!selectedAgentId || !hasPermission('write') || !selectedAgent) return;

    // Update agent's channel status
    const currentChannels = selectedAgent.channels as { webChat?: boolean; phone?: boolean; sms?: boolean; whatsapp?: boolean };
    const updatedChannels = { 
      webChat: currentChannels?.webChat ?? false,
      phone: currentChannels?.phone ?? false,
      sms: currentChannels?.sms ?? false,
      whatsapp: currentChannels?.whatsapp ?? false,
      [channel]: enabled 
    };
    
    await updateAgent.mutateAsync({ 
      id: selectedAgentId, 
      channels: updatedChannels 
    });

    // Save channel config
    await upsertChannelConfig.mutateAsync({
      agent_id: selectedAgentId,
      channel,
      greeting: (config.greeting as string) || '',
      voicemail_fallback: (config.voicemail_fallback as boolean) ?? false,
      business_hours: (config.business_hours as string) || '',
      escalation_to_human: (config.escalation_to_human as boolean) ?? false,
      provider: (config.provider as string) || null,
      phone_number: (config.phone_number as string) || null,
    });

    setConfigDialogOpen(false);
  };

  const renderWebChatDialog = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="webchat-enabled">Enable Web Chat</Label>
        <Switch
          id="webchat-enabled"
          checked={webChatConfig.enabled}
          onCheckedChange={(checked) => setWebChatConfig(prev => ({ ...prev, enabled: checked }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="greeting">Greeting Message</Label>
        <Input
          id="greeting"
          value={webChatConfig.greeting}
          onChange={(e) => setWebChatConfig(prev => ({ ...prev, greeting: e.target.value }))}
          placeholder="Hello! How can I help you today?"
        />
      </div>

      <div className="space-y-2">
        <Label>Embed Snippet</Label>
        <div className="relative">
          <pre className="p-4 bg-secondary/50 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
            {webChatConfig.embedSnippet}
          </pre>
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2"
            onClick={handleCopySnippet}
          >
            {copiedSnippet ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Add this snippet to your website to enable the chat widget.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
        <Button onClick={() => saveChannelConfig('webChat', webChatConfig.enabled, { greeting: webChatConfig.greeting })}>
          Save Configuration
        </Button>
      </div>
    </div>
  );

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const webhookUrl = `${supabaseUrl}/functions/v1/voice/incoming`;
  const statusCallbackUrl = `${supabaseUrl}/functions/v1/voice/status`;

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedStatusUrl, setCopiedStatusUrl] = useState(false);

  const handleCopyWebhookUrl = (url: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(url);
    setter(true);
    setTimeout(() => setter(false), 2000);
    toast({ title: 'Copied', description: 'URL copied to clipboard.' });
  };

  const renderPhoneDialog = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="phone-enabled">Enable Phone</Label>
        <Switch
          id="phone-enabled"
          checked={phoneConfig.enabled}
          onCheckedChange={(checked) => setPhoneConfig(prev => ({ ...prev, enabled: checked }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider">Provider</Label>
        <Select value={phoneConfig.provider} onValueChange={(value) => setPhoneConfig(prev => ({ ...prev, provider: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="twilio">Twilio</SelectItem>
            <SelectItem value="telnyx">Telnyx</SelectItem>
            <SelectItem value="vonage">Vonage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone-number">Phone Number</Label>
        <Input
          id="phone-number"
          value={phoneConfig.phoneNumber}
          onChange={(e) => setPhoneConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
          placeholder="+15551234567"
        />
        <p className="text-xs text-muted-foreground">
          Your Twilio phone number in E.164 format (e.g., +15551234567)
        </p>
      </div>

      {/* Twilio Webhook URLs */}
      {phoneConfig.provider === 'twilio' && supabaseUrl && (
        <div className="space-y-3 p-3 bg-secondary/50 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground">
            Configure these URLs in your Twilio phone number settings:
          </p>
          <div className="space-y-1">
            <Label className="text-xs">Voice Webhook URL (HTTP POST)</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="text-xs font-mono bg-background"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyWebhookUrl(webhookUrl, setCopiedWebhook)}
              >
                {copiedWebhook ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status Callback URL (HTTP POST)</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={statusCallbackUrl}
                className="text-xs font-mono bg-background"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyWebhookUrl(statusCallbackUrl, setCopiedStatusUrl)}
              >
                {copiedStatusUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="business-hours">Business Hours</Label>
        <Select value={phoneConfig.businessHours} onValueChange={(value) => setPhoneConfig(prev => ({ ...prev, businessHours: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select hours" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24/7">24/7</SelectItem>
            <SelectItem value="9am-5pm">9am - 5pm</SelectItem>
            <SelectItem value="9am-9pm">9am - 9pm</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="voicemail">Voicemail Fallback</Label>
          <p className="text-xs text-muted-foreground">Allow voicemail if outside business hours</p>
        </div>
        <Switch
          id="voicemail"
          checked={phoneConfig.voicemailFallback}
          onCheckedChange={(checked) => setPhoneConfig(prev => ({ ...prev, voicemailFallback: checked }))}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="escalation">Escalate to Human</Label>
          <p className="text-xs text-muted-foreground">Transfer to human agent when requested</p>
        </div>
        <Switch
          id="escalation"
          checked={phoneConfig.escalationToHuman}
          onCheckedChange={(checked) => setPhoneConfig(prev => ({ ...prev, escalationToHuman: checked }))}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
        <Button onClick={() => saveChannelConfig('phone', phoneConfig.enabled, {
          phone_number: phoneConfig.phoneNumber,
          business_hours: phoneConfig.businessHours,
          voicemail_fallback: phoneConfig.voicemailFallback,
          escalation_to_human: phoneConfig.escalationToHuman,
          provider: phoneConfig.provider,
        })}>
          Save Configuration
        </Button>
      </div>
    </div>
  );

  const renderSmsDialog = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="sms-enabled">Enable SMS</Label>
        <Switch
          id="sms-enabled"
          checked={smsConfig.enabled}
          onCheckedChange={(checked) => setSmsConfig(prev => ({ ...prev, enabled: checked }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sms-sender">Sender ID</Label>
        <Input
          id="sms-sender"
          value={smsConfig.senderId}
          onChange={(e) => setSmsConfig(prev => ({ ...prev, senderId: e.target.value }))}
          placeholder="AGENTBOT"
        />
        <p className="text-xs text-muted-foreground">
          The sender name or number that appears on outgoing SMS.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
        <Button onClick={() => saveChannelConfig('sms', smsConfig.enabled, { greeting: smsConfig.senderId })}>
          Save Configuration
        </Button>
      </div>
    </div>
  );

  const renderWhatsappDialog = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="whatsapp-enabled">Enable WhatsApp</Label>
        <Switch
          id="whatsapp-enabled"
          checked={whatsappConfig.enabled}
          onCheckedChange={(checked) => setWhatsappConfig(prev => ({ ...prev, enabled: checked }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-sender">WhatsApp Business Number</Label>
        <Input
          id="whatsapp-sender"
          value={whatsappConfig.senderId}
          onChange={(e) => setWhatsappConfig(prev => ({ ...prev, senderId: e.target.value }))}
          placeholder="+1 555 123 4567"
        />
        <p className="text-xs text-muted-foreground">
          Your WhatsApp Business API number.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
        <Button onClick={() => saveChannelConfig('whatsapp', whatsappConfig.enabled, { greeting: whatsappConfig.senderId })}>
          Save Configuration
        </Button>
      </div>
    </div>
  );

  const getDialogContent = () => {
    switch (activeChannel) {
      case 'webChat': return renderWebChatDialog();
      case 'phone': return renderPhoneDialog();
      case 'sms': return renderSmsDialog();
      case 'whatsapp': return renderWhatsappDialog();
      default: return null;
    }
  };

  const getDialogTitle = () => {
    switch (activeChannel) {
      case 'webChat': return 'Web Chat Configuration';
      case 'phone': return 'Phone Configuration';
      case 'sms': return 'SMS Configuration';
      case 'whatsapp': return 'WhatsApp Configuration';
      default: return '';
    }
  };

  if (isLoadingAgents) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Channels</h1>
        <p className="text-muted-foreground">
          Configure communication channels for your AI agents
        </p>
      </div>

      {/* Agent Selector */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Select Agent</CardTitle>
          <CardDescription>
            Choose an agent to configure its communication channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    <span>{agent.name}</span>
                    <Badge variant="secondary" className="text-xs ml-2">
                      {agent.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {agents.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              No agents found. Create an agent first to configure channels.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Channel Cards */}
      {selectedAgentId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChannelCard
            type="webChat"
            title="Web Chat"
            description="Embed a chat widget on your website"
            icon={<MessageSquare className="w-5 h-5" />}
            enabled={webChatConfig.enabled}
            onConfigure={() => openConfigDialog('webChat')}
          />
          <ChannelCard
            type="phone"
            title="Phone"
            description="Handle inbound and outbound calls"
            icon={<Phone className="w-5 h-5" />}
            enabled={phoneConfig.enabled}
            onConfigure={() => openConfigDialog('phone')}
          />
          <ChannelCard
            type="sms"
            title="SMS"
            description="Send and receive text messages"
            icon={<MessageCircle className="w-5 h-5" />}
            enabled={smsConfig.enabled}
            onConfigure={() => openConfigDialog('sms')}
          />
          <ChannelCard
            type="whatsapp"
            title="WhatsApp"
            description="Connect via WhatsApp Business"
            icon={<Smartphone className="w-5 h-5" />}
            enabled={whatsappConfig.enabled}
            onConfigure={() => openConfigDialog('whatsapp')}
          />
        </div>
      )}

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              Configure settings for this channel
            </DialogDescription>
          </DialogHeader>
          {getDialogContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChannelsPage;
