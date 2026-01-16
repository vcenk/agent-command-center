import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import { usePersonas } from '@/hooks/usePersonas';
import { useKnowledgeSources } from '@/hooks/useKnowledgeSources';
import { useChatSessions } from '@/hooks/useChatSessions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Bot,
  Users,
  Activity,
  Zap,
  BookOpen,
  Plus,
  ArrowRight,
  CheckCircle2,
  Circle,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';

const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: personas, isLoading: personasLoading } = usePersonas();
  const { data: knowledgeSources, isLoading: knowledgeLoading } = useKnowledgeSources();
  const { data: sessions } = useChatSessions({});

  if (!workspace) return null;

  const isLoading = agentsLoading || personasLoading || knowledgeLoading;

  const workspaceAgents = agents || [];
  const workspacePersonas = personas || [];
  const workspaceKnowledge = knowledgeSources || [];
  const recentSessions = sessions || [];

  const liveAgents = workspaceAgents.filter(a => a.status === 'live').length;
  const draftAgents = workspaceAgents.filter(a => a.status === 'draft').length;

  // Setup checklist items
  const setupChecklist = [
    { label: 'Create a persona', completed: workspacePersonas.length > 0, link: '/dashboard/personas/new' },
    { label: 'Add knowledge source', completed: workspaceKnowledge.length > 0, link: '/dashboard/knowledge/new' },
    { label: 'Create an agent', completed: workspaceAgents.length > 0, link: '/dashboard/agents/new' },
    { label: 'Publish an agent', completed: liveAgents > 0, link: '/dashboard/agents' },
  ];
  const completedSteps = setupChecklist.filter(item => item.completed).length;
  const setupProgress = (completedSteps / setupChecklist.length) * 100;
  const isSetupComplete = completedSteps === setupChecklist.length;

  // Alerts
  const alerts: { type: 'warning' | 'info'; message: string; link: string }[] = [];
  if (draftAgents > 0) {
    alerts.push({
      type: 'warning',
      message: `${draftAgents} agent${draftAgents > 1 ? 's' : ''} in draft mode`,
      link: '/dashboard/agents',
    });
  }
  if (workspaceAgents.length > 0 && workspaceKnowledge.length === 0) {
    alerts.push({
      type: 'warning',
      message: 'No knowledge sources added yet',
      link: '/dashboard/knowledge/new',
    });
  }

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
      <PageHeader
        title="Dashboard"
        description={`Welcome to ${workspace.name}'s command center`}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/dashboard/sessions">
                View Sessions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild>
              <Link to="/dashboard/agents/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Link>
            </Button>
          </div>
        }
      />

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Card
              key={index}
              className="border-warning/30 bg-warning/5 cursor-pointer hover:bg-warning/10 transition-colors"
              onClick={() => navigate(alert.link)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                <span className="text-sm text-foreground flex-1">{alert.message}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Setup Checklist - only show if not complete */}
      {!isSetupComplete && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Getting Started
            </CardTitle>
            <CardDescription>
              Complete these steps to set up your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{completedSteps} of {setupChecklist.length}</span>
              </div>
              <Progress value={setupProgress} className="h-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {setupChecklist.map((item, index) => (
                <button
                  key={index}
                  onClick={() => !item.completed && navigate(item.link)}
                  disabled={item.completed}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    item.completed
                      ? 'bg-success/10 cursor-default'
                      : 'bg-secondary/50 hover:bg-secondary cursor-pointer'
                  }`}
                >
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={`text-sm ${item.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Agent Status
              </CardTitle>
              <CardDescription>Your AI agents at a glance</CardDescription>
            </div>
            {workspaceAgents.length > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/agents">
                  View all
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {workspaceAgents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No agents configured</p>
                <p className="text-sm mb-4">Create your first agent to get started</p>
                <Button size="sm" asChild>
                  <Link to="/dashboard/agents/new">
                    <Plus className="w-4 h-4 mr-1" />
                    Create Agent
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {workspaceAgents.slice(0, 4).map((agent) => {
                  const persona = personas?.find(p => p.id === agent.persona_id);
                  return (
                    <div
                      key={agent.id}
                      onClick={() => navigate(`/dashboard/agents/${agent.id}`)}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
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

        {/* Recent Sessions */}
        <Card className="glass border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Recent Sessions
              </CardTitle>
              <CardDescription>Latest chat conversations</CardDescription>
            </div>
            {recentSessions.length > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/sessions">
                  View all
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No sessions yet</p>
                <p className="text-sm">Sessions will appear when users chat with your agents</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.slice(0, 4).map((session) => (
                  <div
                    key={session.id}
                    onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
                    className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div className={`p-2 rounded-md ${
                      session.status === 'active' ? 'bg-success/10' : 'bg-muted'
                    }`}>
                      <MessageSquare className={`w-4 h-4 ${
                        session.status === 'active' ? 'text-success' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {session.agents?.name || 'Unknown Agent'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {session.last_message || 'No messages'}
                      </p>
                    </div>
                    <Badge
                      variant={session.status === 'active' ? 'default' : 'secondary'}
                      className={session.status === 'active' ? 'bg-success/20 text-success border-success/30' : ''}
                    >
                      {session.status === 'active' ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personas */}
        <Card className="glass border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Personas
              </CardTitle>
              <CardDescription>Configured AI personalities</CardDescription>
            </div>
            {workspacePersonas.length > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/personas">
                  View all
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {workspacePersonas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No personas configured</p>
                <p className="text-sm mb-4">Create your first persona to get started</p>
                <Button size="sm" asChild>
                  <Link to="/dashboard/personas/new">
                    <Plus className="w-4 h-4 mr-1" />
                    Create Persona
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {workspacePersonas.slice(0, 4).map((persona) => (
                  <div
                    key={persona.id}
                    onClick={() => navigate(`/dashboard/personas/${persona.id}`)}
                    className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
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

        {/* Knowledge Base */}
        <Card className="glass border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Knowledge Base
              </CardTitle>
              <CardDescription>Content for your agents</CardDescription>
            </div>
            {workspaceKnowledge.length > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/knowledge">
                  View all
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {workspaceKnowledge.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No knowledge sources</p>
                <p className="text-sm mb-4">Add content to power your agents</p>
                <Button size="sm" asChild>
                  <Link to="/dashboard/knowledge/new">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Knowledge
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {workspaceKnowledge.slice(0, 4).map((source) => (
                  <div
                    key={source.id}
                    onClick={() => navigate(`/dashboard/knowledge/${source.id}`)}
                    className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div className="p-2 rounded-md bg-primary/10">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {source.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {source.type} · {(source.raw_text?.length || 0).toLocaleString()} chars
                      </p>
                    </div>
                    <Badge variant="outline">
                      {source.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Overview;