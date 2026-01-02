import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { agents, channelConfigs, auditLogs } from '@/lib/mockDb';
import { Agent, ChannelConfig } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  Radio,
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
  type,
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
  const { workspace, user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelType | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [, forceUpdate] = useState({});

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

  if (!workspace) return null;

  const workspaceAgents = agents.getByWorkspace(workspace.id);
  const selectedAgent = selectedAgentId ? agents.getById(selectedAgentId) : null;

  // Load channel configs when agent changes
  useEffect(() => {
    if (selectedAgentId) {
      const configs = channelConfigs.getByAgent(selectedAgentId);
      
      const webChat = configs.find(c => c.channel === 'webChat');
      const phone = configs.find(c => c.channel === 'phone');
      const sms = configs.find(c => c.channel === 'sms');
      const whatsapp = configs.find(c => c.channel === 'whatsapp');

      const snippet = generateEmbedSnippet(selectedAgentId);

      setWebChatConfig({
        enabled: selectedAgent?.channels.webChat || false,
        greeting: webChat?.greeting || 'Hello! How can I help you today?',
        embedSnippet: snippet,
      });

      setPhoneConfig({
        enabled: selectedAgent?.channels.phone || false,
        phoneNumber: phone?.phoneNumber || '+1 (555) 123-4567',
        businessHours: phone?.businessHours || '9am-5pm',
        voicemailFallback: phone?.voicemailFallback ?? true,
        escalationToHuman: phone?.escalationToHuman ?? false,
        provider: phone?.provider || 'twilio',
      });

      setSmsConfig({
        enabled: selectedAgent?.channels.sms || false,
        senderId: sms?.greeting || '',
      });

      setWhatsappConfig({
        enabled: selectedAgent?.channels.whatsapp || false,
        senderId: whatsapp?.greeting || '',
      });
    }
  }, [selectedAgentId, selectedAgent]);

  const generateEmbedSnippet = (agentId: string) => {
    return `<!-- Agent Cockpit Chat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['AgentCockpit']=o;w[o]=w[o]||function(){
    (w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;
    fjs.parentNode.insertBefore(js,fjs);
  })(window,document,'script','ac','https://cdn.agentcockpit.ai/widget.js');
  ac('init', { agentId: '${agentId}' });
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

  const saveChannelConfig = (channel: ChannelType, enabled: boolean, config: Partial<ChannelConfig>) => {
    if (!selectedAgentId || !hasPermission('write')) return;

    // Get current state for audit log
    const existingConfigs = channelConfigs.getByAgent(selectedAgentId);
    const existingConfig = existingConfigs.find(c => c.channel === channel);

    // Update agent's channel status
    const agent = agents.getById(selectedAgentId);
    if (agent) {
      const updatedChannels = { ...agent.channels, [channel]: enabled };
      agents.update(selectedAgentId, { channels: updatedChannels });
    }

    // Save channel config
    channelConfigs.upsert({
      agentId: selectedAgentId,
      channel,
      greeting: config.greeting || '',
      voicemailFallback: config.voicemailFallback ?? false,
      businessHours: config.businessHours || '',
      escalationToHuman: config.escalationToHuman ?? false,
      provider: config.provider,
      phoneNumber: config.phoneNumber,
    });

    // Audit log
    auditLogs.create({
      workspaceId: workspace.id,
      actorEmail: user?.email || '',
      actionType: 'update',
      entityType: 'channel_config',
      entityId: `${selectedAgentId}_${channel}`,
      before: existingConfig ? { enabled: agent?.channels[channel], ...existingConfig } as unknown as Record<string, unknown> : null,
      after: { enabled, channel, ...config } as unknown as Record<string, unknown>,
    });

    toast({
      title: 'Channel updated',
      description: `${channel} configuration saved.`,
    });

    forceUpdate({});
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
          <pre className="p-4 bg-secondary/50 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
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
          placeholder="+1 (555) 123-4567"
        />
        <p className="text-xs text-muted-foreground">
          This is your assigned number for inbound calls.
        </p>
      </div>

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
          <p className="text-xs text-muted-foreground">Allow voicemail if agent unavailable</p>
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
          phoneNumber: phoneConfig.phoneNumber,
          businessHours: phoneConfig.businessHours,
          voicemailFallback: phoneConfig.voicemailFallback,
          escalationToHuman: phoneConfig.escalationToHuman,
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
              {workspaceAgents.map(agent => (
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

          {workspaceAgents.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              No agents found. Create an agent first to configure channels.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Channel Cards */}
      {selectedAgent && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChannelCard
            type="webChat"
            title="Web Chat"
            description="Embed a chat widget on your website"
            icon={<MessageSquare className="w-6 h-6" />}
            enabled={selectedAgent.channels.webChat}
            onConfigure={() => openConfigDialog('webChat')}
          />
          <ChannelCard
            type="phone"
            title="Phone"
            description="Handle inbound and outbound voice calls"
            icon={<Phone className="w-6 h-6" />}
            enabled={selectedAgent.channels.phone}
            onConfigure={() => openConfigDialog('phone')}
          />
          <ChannelCard
            type="sms"
            title="SMS"
            description="Send and receive text messages"
            icon={<MessageCircle className="w-6 h-6" />}
            enabled={selectedAgent.channels.sms}
            onConfigure={() => openConfigDialog('sms')}
          />
          <ChannelCard
            type="whatsapp"
            title="WhatsApp"
            description="Connect via WhatsApp Business API"
            icon={<Smartphone className="w-6 h-6" />}
            enabled={selectedAgent.channels.whatsapp}
            onConfigure={() => openConfigDialog('whatsapp')}
          />
        </div>
      )}

      {/* Empty State */}
      {!selectedAgentId && workspaceAgents.length > 0 && (
        <Card className="glass border-border/50">
          <CardContent className="py-16 text-center">
            <Radio className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Select an agent to configure channels
            </h3>
            <p className="text-muted-foreground">
              Choose an agent from the dropdown above to view and configure its communication channels.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              Configure how this channel works for {selectedAgent?.name}
            </DialogDescription>
          </DialogHeader>
          {getDialogContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChannelsPage;
