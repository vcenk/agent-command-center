import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { agents, personas, auditLogs } from '@/lib/mockDb';
import { Agent } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Plus,
  Search,
  MessageSquare,
  Phone,
  Mail,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

const AgentsList: React.FC = () => {
  const { workspace, user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  if (!workspace) return null;

  const workspaceAgents = agents.getByWorkspace(workspace.id);
  const filteredAgents = workspaceAgents.filter(
    a => a.name.toLowerCase().includes(search.toLowerCase()) ||
         a.businessDomain.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (agent: Agent) => {
    if (!hasPermission('write')) return;
    
    auditLogs.create({
      workspaceId: workspace.id,
      actorEmail: user?.email || '',
      actionType: 'delete',
      entityType: 'agent',
      entityId: agent.id,
      before: { id: agent.id, name: agent.name },
      after: null,
    });
    
    agents.delete(agent.id);
    toast({
      title: 'Agent deleted',
      description: `${agent.name} has been removed.`,
    });
    // Force re-render
    setSearch(s => s + ' ');
    setSearch(s => s.trim());
  };

  const getChannelIcons = (agent: Agent) => {
    const icons = [];
    if (agent.channels.webChat) icons.push(<MessageSquare key="web" className="w-3 h-3" />);
    if (agent.channels.phone) icons.push(<Phone key="phone" className="w-3 h-3" />);
    if (agent.channels.sms) icons.push(<Mail key="sms" className="w-3 h-3" />);
    return icons;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agents</h1>
          <p className="text-muted-foreground">
            Manage your AI agents and their configurations
          </p>
        </div>
        {hasPermission('write') && (
          <Button variant="glow" onClick={() => navigate('/dashboard/agents/new')}>
            <Plus className="w-4 h-4" />
            Create Agent
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search agents..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Agents Grid */}
      {filteredAgents.length === 0 ? (
        <Card className="glass border-border/50">
          <CardContent className="py-16 text-center">
            <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No agents found</h3>
            <p className="text-muted-foreground mb-6">
              {search ? 'Try adjusting your search' : 'Create your first agent to get started'}
            </p>
            {hasPermission('write') && !search && (
              <Button variant="outline" onClick={() => navigate('/dashboard/agents/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => {
            const persona = agent.personaId ? personas.getById(agent.personaId) : null;
            return (
              <Card
                key={agent.id}
                className="glass border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/dashboard/agents/${agent.id}`)}
              >
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${
                      agent.status === 'live' ? 'bg-success/10' : 'bg-secondary'
                    }`}>
                      <Bot className={`w-6 h-6 ${
                        agent.status === 'live' ? 'text-success' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={agent.status === 'live' ? 'default' : 'secondary'}
                        className={agent.status === 'live' ? 'bg-success text-success-foreground' : ''}
                      >
                        {agent.status === 'live' ? 'Live' : 'Draft'}
                      </Badge>
                      {hasPermission('write') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/agents/${agent.id}/edit`);
                            }}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(agent);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 capitalize">
                    {agent.businessDomain}
                  </p>
                  
                  {persona && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Persona: {persona.name}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {getChannelIcons(agent)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {agent.knowledgeSourceIds.length} knowledge sources
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgentsList;
