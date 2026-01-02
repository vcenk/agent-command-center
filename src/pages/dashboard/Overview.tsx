import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { agents, personas, callSessions, knowledgeSources, usage as usageDb } from '@/lib/mockDb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Users, Phone, Activity, TrendingUp, Clock, Zap } from 'lucide-react';

const Overview: React.FC = () => {
  const { workspace } = useAuth();

  if (!workspace) return null;

  const workspaceAgents = agents.getByWorkspace(workspace.id);
  const workspacePersonas = personas.getByWorkspace(workspace.id);
  const workspaceCalls = callSessions.getByWorkspace(workspace.id);
  const workspaceKnowledge = knowledgeSources.getByWorkspace(workspace.id);
  const workspaceUsage = usageDb.get(workspace.id);

  const liveAgents = workspaceAgents.filter(a => a.status === 'live').length;
  const totalCallMinutes = workspaceCalls.reduce((acc, c) => acc + Math.ceil(c.durationSec / 60), 0);

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
      name: 'Total Calls',
      value: workspaceCalls.length,
      change: `${totalCallMinutes} min`,
      icon: Phone,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      name: 'Messages',
      value: workspaceUsage.messages,
      change: 'This period',
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  const recentCalls = workspaceCalls.slice(0, 5);

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
        {/* Recent Calls */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Recent Calls
            </CardTitle>
            <CardDescription>Latest interactions handled by your agents</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCalls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No calls yet</p>
                <p className="text-sm">Calls will appear here once agents are active</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCalls.map((call) => {
                  const agent = agents.getById(call.agentId);
                  return (
                    <div
                      key={call.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className={`p-2 rounded-md ${
                        call.status === 'completed' ? 'bg-success/10' : 
                        call.status === 'transferred' ? 'bg-warning/10' : 'bg-muted'
                      }`}>
                        <Phone className={`w-4 h-4 ${
                          call.status === 'completed' ? 'text-success' : 
                          call.status === 'transferred' ? 'text-warning' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {call.from}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {agent?.name || 'Unknown Agent'} · {Math.ceil(call.durationSec / 60)} min
                        </p>
                      </div>
                      <Badge variant={call.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                        {call.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions / Status */}
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
                  const persona = agent.personaId ? personas.getById(agent.personaId) : null;
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
                          {persona?.name || 'No persona'} · {agent.businessDomain}
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
      </div>

      {/* Usage Widget */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Usage This Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Messages</p>
              <p className="text-2xl font-semibold text-foreground">{workspaceUsage.messages}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Call Minutes</p>
              <p className="text-2xl font-semibold text-foreground">{workspaceUsage.callMinutes}</p>
            </div>
            <div>
          <p className="text-sm text-muted-foreground">Knowledge Sources</p>
              <p className="text-2xl font-semibold text-foreground">{workspaceKnowledge.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Actions Executed</p>
              <p className="text-2xl font-semibold text-foreground">{workspaceUsage.actionsExecuted}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
