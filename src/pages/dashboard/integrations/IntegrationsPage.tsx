import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { secureApi } from '@/lib/api';
import {
  Slack,
  Calendar,
  Zap,
  MessageSquare,
  Plug,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface Integration {
  id?: string;
  provider: string;
  status: 'pending' | 'connected' | 'error' | 'disconnected';
  settings: Record<string, unknown>;
  connected_at: string | null;
  error_message?: string;
}

// Integration metadata for display
const INTEGRATION_INFO: Record<string, {
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  category: 'notifications' | 'calendar' | 'crm' | 'automation';
  comingSoon?: boolean;
}> = {
  slack: {
    name: 'Slack',
    description: 'Get instant lead alerts and session notifications in your Slack workspace.',
    icon: Slack,
    color: 'bg-[#4A154B]',
    category: 'notifications',
  },
  google_calendar: {
    name: 'Google Calendar',
    description: 'Sync appointments booked by your AI agents directly to Google Calendar.',
    icon: Calendar,
    color: 'bg-blue-500',
    category: 'calendar',
  },
  hubspot: {
    name: 'HubSpot CRM',
    description: 'Automatically sync leads to HubSpot for seamless sales pipeline management.',
    icon: MessageSquare,
    color: 'bg-orange-500',
    category: 'crm',
    comingSoon: true,
  },
  zapier: {
    name: 'Zapier',
    description: 'Connect to 5000+ apps with automated workflows triggered by agent events.',
    icon: Zap,
    color: 'bg-orange-400',
    category: 'automation',
    comingSoon: true,
  },
};

const STATUS_CONFIG = {
  connected: {
    label: 'Connected',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    className: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
  disconnected: {
    label: 'Not Connected',
    icon: Plug,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

const IntegrationCard: React.FC<{ integration: Integration }> = ({ integration }) => {
  const info = INTEGRATION_INFO[integration.provider];
  if (!info) return null;

  const status = STATUS_CONFIG[integration.status];
  const StatusIcon = status.icon;
  const Icon = info.icon;

  const getSetupUrl = (provider: string) => {
    switch (provider) {
      case 'slack':
        return '/dashboard/integrations/slack';
      case 'google_calendar':
        return '/dashboard/integrations/calendar';
      default:
        return null;
    }
  };

  const setupUrl = getSetupUrl(integration.provider);

  return (
    <Card className="glass border-border/50 hover:border-primary/30 transition-all duration-200 group">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${info.color} flex items-center justify-center shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {info.name}
                {info.comingSoon && (
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                )}
              </CardTitle>
              <Badge variant="outline" className={`mt-1 ${status.className}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">{info.description}</CardDescription>

        {integration.status === 'error' && integration.error_message && (
          <p className="text-sm text-red-500 mb-4">
            Error: {integration.error_message}
          </p>
        )}

        {integration.status === 'connected' && integration.connected_at && (
          <p className="text-xs text-muted-foreground mb-4">
            Connected {new Date(integration.connected_at).toLocaleDateString()}
          </p>
        )}

        {info.comingSoon ? (
          <Button variant="outline" disabled className="w-full">
            <Clock className="w-4 h-4 mr-2" />
            Coming Soon
          </Button>
        ) : setupUrl ? (
          <Link to={setupUrl}>
            <Button
              variant={integration.status === 'connected' ? 'outline' : 'default'}
              className="w-full group-hover:translate-x-0"
            >
              {integration.status === 'connected' ? (
                <>
                  Manage Settings
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              ) : (
                <>
                  Connect {info.name}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </Link>
        ) : (
          <Button variant="outline" disabled className="w-full">
            Not Available
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const IntegrationsPage: React.FC = () => {
  const { data: integrations, isLoading, error } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => secureApi.get<Integration[]>('/integrations'),
  });

  // Group integrations by category
  const groupedIntegrations = React.useMemo(() => {
    const groups: Record<string, Integration[]> = {
      notifications: [],
      calendar: [],
      crm: [],
      automation: [],
    };

    // If we have API data, use it
    if (integrations) {
      integrations.forEach((integration) => {
        const info = INTEGRATION_INFO[integration.provider];
        if (info) {
          groups[info.category].push(integration);
        }
      });
    } else {
      // Show all available integrations as disconnected
      Object.entries(INTEGRATION_INFO).forEach(([provider, info]) => {
        groups[info.category].push({
          provider,
          status: 'disconnected',
          settings: {},
          connected_at: null,
        });
      });
    }

    return groups;
  }, [integrations]);

  const categoryLabels: Record<string, string> = {
    notifications: 'Notifications',
    calendar: 'Calendar & Scheduling',
    crm: 'CRM & Sales',
    automation: 'Automation',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Integrations"
          description="Connect your favorite tools to supercharge your AI agents"
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass border-border/50 animate-pulse">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted" />
                  <div className="space-y-2">
                    <div className="h-5 w-24 bg-muted rounded" />
                    <div className="h-4 w-16 bg-muted rounded" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-12 bg-muted rounded mb-4" />
                <div className="h-10 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Integrations"
        description="Connect your favorite tools to supercharge your AI agents"
      />

      {Object.entries(groupedIntegrations).map(([category, items]) => {
        if (items.length === 0) return null;

        return (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {categoryLabels[category]}
              <Badge variant="secondary" className="text-xs">
                {items.filter(i => i.status === 'connected').length}/{items.length}
              </Badge>
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((integration) => (
                <IntegrationCard key={integration.provider} integration={integration} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Help section */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Need a different integration?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            We're constantly adding new integrations. Let us know what tools you'd like to connect!
          </p>
          <Button variant="outline">
            Request Integration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsPage;
