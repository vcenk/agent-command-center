import React from 'react';
import { useWizard } from './WizardContext';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, MessageCircle, Phone, Smartphone } from 'lucide-react';

export const StepChannels: React.FC = () => {
  const { data, updateData } = useWizard();

  const channels = [
    {
      id: 'webChat',
      icon: Globe,
      title: 'Web Chat',
      description: 'Embed a chat widget on your website',
      enabled: data.webChatEnabled,
      available: true,
    },
    {
      id: 'whatsapp',
      icon: MessageCircle,
      title: 'WhatsApp',
      description: 'Connect your WhatsApp Business account',
      enabled: false,
      available: false,
    },
    {
      id: 'sms',
      icon: Smartphone,
      title: 'SMS',
      description: 'Send and receive text messages',
      enabled: false,
      available: false,
    },
    {
      id: 'phone',
      icon: Phone,
      title: 'Phone',
      description: 'Voice calls with AI agent',
      enabled: false,
      available: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Channels</h3>
        <p className="text-sm text-muted-foreground">
          Configure how customers can reach your agent
        </p>
      </div>

      <div className="space-y-3">
        {channels.map(({ id, icon: Icon, title, description, enabled, available }) => (
          <Card
            key={id}
            className={!available ? 'opacity-60' : undefined}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{title}</p>
                      {!available && (
                        <Badge variant="secondary" className="text-xs">
                          Enable later
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={id === 'webChat' ? data.webChatEnabled : false}
                  onCheckedChange={(checked) => {
                    if (id === 'webChat') {
                      updateData({ webChatEnabled: checked });
                    }
                  }}
                  disabled={!available}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Web Chat is the recommended starting channel. 
          You can enable WhatsApp, SMS, and Phone channels after creating your agent.
        </p>
      </div>
    </div>
  );
};
