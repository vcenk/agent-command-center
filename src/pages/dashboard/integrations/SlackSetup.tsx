import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { secureApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Slack,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Send,
  Hash,
  Bell,
  UserPlus,
  Calendar,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';

interface SlackIntegration {
  id: string;
  provider: 'slack';
  status: 'pending' | 'connected' | 'error' | 'disconnected';
  config: {
    team_name?: string;
    team_id?: string;
    available_channels?: { id: string; name: string }[];
  };
  settings: {
    channel_id?: string;
    channel_name?: string;
    notify_new_lead?: boolean;
    notify_session_start?: boolean;
    notify_human_handoff?: boolean;
    notify_booking?: boolean;
  };
  connected_at: string | null;
  error_message?: string;
}

const SlackSetup: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Check for OAuth callback params
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      toast.success('Slack connected successfully!');
      queryClient.invalidateQueries({ queryKey: ['slack-integration'] });
    } else if (error) {
      toast.error(`Failed to connect Slack: ${error}`);
    }
  }, [searchParams, queryClient]);

  // Fetch Slack integration status
  const { data: integration, isLoading } = useQuery({
    queryKey: ['slack-integration'],
    queryFn: () => secureApi.get<SlackIntegration>('/integrations/slack'),
  });

  // Connect to Slack mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await secureApi.post<{ authorizeUrl: string }>(
        '/integrations/slack/connect',
        {}
      );
      return response;
    },
    onSuccess: (data) => {
      // Redirect to Slack OAuth
      window.location.href = data.authorizeUrl;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start Slack connection');
      setIsConnecting(false);
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<SlackIntegration['settings']>) => {
      return secureApi.patch('/integrations/slack/settings', { settings });
    },
    onSuccess: () => {
      toast.success('Settings updated');
      queryClient.invalidateQueries({ queryKey: ['slack-integration'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: async ({ channelId, channelName }: { channelId: string; channelName: string }) => {
      return secureApi.post('/slack/channels', { channelId, channelName });
    },
    onSuccess: () => {
      toast.success('Channel updated');
      queryClient.invalidateQueries({ queryKey: ['slack-integration'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update channel');
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => secureApi.delete('/integrations/slack'),
    onSuccess: () => {
      toast.success('Slack disconnected');
      queryClient.invalidateQueries({ queryKey: ['slack-integration'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to disconnect');
    },
  });

  // Test notification mutation
  const testMutation = useMutation({
    mutationFn: () => secureApi.post('/slack/test', {}),
    onSuccess: () => {
      toast.success('Test notification sent! Check your Slack channel.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send test notification');
    },
  });

  const handleConnect = () => {
    setIsConnecting(true);
    connectMutation.mutate();
  };

  const handleSettingChange = (key: keyof SlackIntegration['settings'], value: boolean) => {
    if (!integration?.settings) return;
    updateSettingsMutation.mutate({
      ...integration.settings,
      [key]: value,
    });
  };

  const handleChannelChange = (channelId: string) => {
    const channel = integration?.config.available_channels?.find(c => c.id === channelId);
    if (channel) {
      updateChannelMutation.mutate({ channelId, channelName: channel.name });
    }
  };

  const isConnected = integration?.status === 'connected';
  const hasChannel = !!integration?.settings?.channel_id;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Slack Integration"
          description="Configure Slack notifications for your AI agents"
          backLink="/dashboard/integrations"
        />
        <Card className="glass border-border/50 animate-pulse">
          <CardHeader>
            <div className="h-8 w-48 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Slack Integration"
        description="Get instant notifications when leads are captured or appointments are booked"
        backLink="/dashboard/integrations"
      />

      {/* Connection Status Card */}
      <Card className="glass border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#4A154B] flex items-center justify-center shadow-lg">
                <Slack className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Slack</CardTitle>
                <CardDescription>
                  {isConnected
                    ? `Connected to ${integration?.config.team_name || 'your workspace'}`
                    : 'Not connected'}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                isConnected
                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                  : 'bg-muted text-muted-foreground'
              }
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {isConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Slack workspace to receive real-time notifications when:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 pl-4">
                <li className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  A new lead is captured by your AI agent
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  An appointment is booked
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                  A customer requests human assistance
                </li>
              </ul>
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full sm:w-auto"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect to Slack
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Channel Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Notification Channel
                </Label>
                <Select
                  value={integration?.settings?.channel_id || ''}
                  onValueChange={handleChannelChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {integration?.config.available_channels?.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        # {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the channel where you want to receive notifications
                </p>
              </div>

              {!hasChannel && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-600 dark:text-yellow-400">
                  Please select a channel to start receiving notifications
                </div>
              )}

              <Separator />

              {/* Notification Settings */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notification Types
                </Label>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">New Lead Captured</p>
                      <p className="text-xs text-muted-foreground">
                        When someone shares their contact info
                      </p>
                    </div>
                    <Switch
                      checked={integration?.settings?.notify_new_lead ?? true}
                      onCheckedChange={(checked) => handleSettingChange('notify_new_lead', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Appointment Booked</p>
                      <p className="text-xs text-muted-foreground">
                        When a meeting is scheduled via the agent
                      </p>
                    </div>
                    <Switch
                      checked={integration?.settings?.notify_booking ?? true}
                      onCheckedChange={(checked) => handleSettingChange('notify_booking', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Human Handoff Request</p>
                      <p className="text-xs text-muted-foreground">
                        When a customer asks to speak with a human
                      </p>
                    </div>
                    <Switch
                      checked={integration?.settings?.notify_human_handoff ?? true}
                      onCheckedChange={(checked) => handleSettingChange('notify_human_handoff', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">New Chat Session</p>
                      <p className="text-xs text-muted-foreground">
                        When someone starts chatting (can be noisy)
                      </p>
                    </div>
                    <Switch
                      checked={integration?.settings?.notify_session_start ?? false}
                      onCheckedChange={(checked) => handleSettingChange('notify_session_start', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => testMutation.mutate()}
                  disabled={!hasChannel || testMutation.isPending}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Test Notification
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Slack?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will stop receiving notifications in Slack. You can reconnect at any time.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => disconnectMutation.mutate()}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Need help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Make sure you have permission to add apps to your Slack workspace.
            Contact your Slack admin if you need access.
          </p>
          <Button variant="link" className="p-0 h-auto" asChild>
            <a href="https://slack.com/help/articles/202035138" target="_blank" rel="noopener noreferrer">
              Learn more about Slack apps
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SlackSetup;
