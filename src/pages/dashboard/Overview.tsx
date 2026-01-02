import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import { usePersonas } from '@/hooks/usePersonas';
import { useKnowledgeSources } from '@/hooks/useKnowledgeSources';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Users, Phone, Activity, TrendingUp, Zap, BookOpen } from 'lucide-react';

const Overview: React.FC = () => {
  const { workspace } = useAuth();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: personas, isLoading: personasLoading } = usePersonas();
  const { data: knowledgeSources, isLoading: knowledgeLoading } = useKnowledgeSources();

  if (!workspace) return null;

  const isLoading = agentsLoading || personasLoading || knowledgeLoading;

  const workspaceAgents = agents || [];
  const workspacePersonas = personas || [];
  const workspaceKnowledge = knowledgeSources || [];

  const liveAgents = workspaceAgents.filter(a => a.status === 'live').length;

  const stats = [
    {
      name: 'Total Agents',
      value: workspaceAgents.length,
      change: liveAgents > 0 ? `${liveAgents} live` : 'None live',
      icon: Bot,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      name: 'Personas',
      value: workspacePersonas.length,
      change: 'Configured',
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      name: 'Knowledge Sources',
      value: workspaceKnowledge.length,
      change: 'Available',
      icon: BookOpen,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      name: 'Channels',
      value: workspaceAgents.reduce((acc, a) => {
        const channels = a.channels as { webChat?: boolean; phone?: boolean; sms?: boolean; whatsapp?: boolean };
        return acc + (channels.webChat ? 1 : 0) + (channels.phone ? 1 : 0) + (channels.sms ? 1 : 0) + (channels.whatsapp ? 1 : 0);
      }, 0),
      change: 'Enabled',
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground">
          Welcome to {workspace.name}'s command center
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="glass border-border/50 hover:border-border transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.name}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Status */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Agent Status
            </CardTitle>
            <CardDescription>Your AI agents at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            {workspaceAgents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No agents configured</p>
                <p className="text-sm">Create your first agent to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workspaceAgents.slice(0, 5).map((agent) => {
                  const persona = personas?.find(p => p.id === agent.persona_id);
                  return (
                    <div
                      key={agent.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className={`p-2 rounded-md ${
                        agent.status === 'live' ? 'bg-success/10' : 'bg-muted'
                      }`}>
                        <Bot className={`w-4 h-4 ${
                          agent.status === 'live' ? 'text-success' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {agent.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {persona?.name || 'No persona'} · {agent.business_domain}
                        </p>
                      </div>
                      <Badge 
                        variant={agent.status === 'live' ? 'default' : 'secondary'}
                        className={agent.status === 'live' ? 'bg-success text-success-foreground' : ''}
                      >
                        {agent.status === 'live' ? 'Live' : 'Draft'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personas */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Personas
            </CardTitle>
            <CardDescription>Configured AI personalities</CardDescription>
          </CardHeader>
          <CardContent>
            {workspacePersonas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No personas configured</p>
                <p className="text-sm">Create your first persona to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workspacePersonas.slice(0, 5).map((persona) => (
                  <div
                    key={persona.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="p-2 rounded-md bg-primary/10">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {persona.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {persona.role_title} · {persona.tone}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {persona.tone}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Widget */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Resources Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Agents</p>
              <p className="text-2xl font-semibold text-foreground">{workspaceAgents.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Personas</p>
              <p className="text-2xl font-semibold text-foreground">{workspacePersonas.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Knowledge Sources</p>
              <p className="text-2xl font-semibold text-foreground">{workspaceKnowledge.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Live Agents</p>
              <p className="text-2xl font-semibold text-foreground">{liveAgents}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;