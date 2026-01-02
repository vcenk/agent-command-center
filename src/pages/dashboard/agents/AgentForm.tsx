import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { agents, personas, knowledgeSources, auditLogs } from '@/lib/mockDb';
import { Agent } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const domains = ['healthcare', 'retail', 'finance', 'realestate', 'hospitality', 'other'] as const;
const actions = ['Book appointment (Calendly)', 'Send webhook (POST)', 'Send email', 'Transfer to human'];

const AgentForm: React.FC = () => {
  const { id } = useParams();
  const { workspace, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = id && id !== 'new';

  const existingAgent = isEditing ? agents.getById(id) : null;
  const workspacePersonas = workspace ? personas.getByWorkspace(workspace.id) : [];
  const workspaceKnowledge = workspace ? knowledgeSources.getByWorkspace(workspace.id) : [];

  const [formData, setFormData] = useState({
    name: existingAgent?.name || '',
    businessDomain: existingAgent?.businessDomain || 'other' as typeof domains[number],
    personaId: existingAgent?.personaId || '',
    goals: existingAgent?.goals || '',
    allowedActions: existingAgent?.allowedActions || [] as string[],
    knowledgeBaseIds: existingAgent?.knowledgeBaseIds || [] as string[],
    channelsEnabled: existingAgent?.channelsEnabled || {
      webChat: true,
      phone: false,
      sms: false,
      whatsapp: false,
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !user) return;

    if (isEditing && existingAgent) {
      const updated = agents.update(existingAgent.id, formData);
      auditLogs.create({
        workspaceId: workspace.id,
        actorEmail: user.email,
        actionType: 'update',
        entityType: 'agent',
        entityId: existingAgent.id,
        before: { id: existingAgent.id, name: existingAgent.name },
        after: { id: existingAgent.id, name: formData.name },
      });
      toast({ title: 'Agent updated', description: `${formData.name} has been saved.` });
    } else {
      const newAgent = agents.create({
        ...formData,
        workspaceId: workspace.id,
        status: 'Draft',
      });
      auditLogs.create({
        workspaceId: workspace.id,
        actorEmail: user.email,
        actionType: 'create',
        entityType: 'agent',
        entityId: newAgent.id,
        before: null,
        after: { id: newAgent.id, name: newAgent.name },
      });
      toast({ title: 'Agent created', description: `${formData.name} is ready to configure.` });
    }

    navigate('/dashboard/agents');
  };

  const toggleAction = (action: string) => {
    setFormData(prev => ({
      ...prev,
      allowedActions: prev.allowedActions.includes(action)
        ? prev.allowedActions.filter(a => a !== action)
        : [...prev.allowedActions, action],
    }));
  };

  const toggleKnowledge = (id: string) => {
    setFormData(prev => ({
      ...prev,
      knowledgeBaseIds: prev.knowledgeBaseIds.includes(id)
        ? prev.knowledgeBaseIds.filter(k => k !== id)
        : [...prev.knowledgeBaseIds, id],
    }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate('/dashboard/agents')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Agents
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isEditing ? 'Edit Agent' : 'Create Agent'}
        </h1>
        <p className="text-muted-foreground">
          Configure your AI agent's behavior and capabilities
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Customer Support Agent"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Business Domain</Label>
              <Select
                value={formData.businessDomain}
                onValueChange={(v) => setFormData(prev => ({ ...prev, businessDomain: v as typeof domains[number] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {domains.map(d => (
                    <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="persona">Persona</Label>
              <Select
                value={formData.personaId || 'none'}
                onValueChange={(v) => setFormData(prev => ({ ...prev, personaId: v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a persona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No persona</SelectItem>
                  {workspacePersonas.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">Goals</Label>
              <Textarea
                id="goals"
                value={formData.goals}
                onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                placeholder="What should this agent accomplish? e.g., Schedule appointments, answer FAQs..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>Channels</CardTitle>
            <CardDescription>Select which channels this agent can use</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {(['webChat', 'phone', 'sms', 'whatsapp'] as const).map(channel => (
                <div key={channel} className="flex items-center space-x-3">
                  <Checkbox
                    id={channel}
                    checked={formData.channelsEnabled[channel]}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      channelsEnabled: { ...prev.channelsEnabled, [channel]: !!checked }
                    }))}
                  />
                  <Label htmlFor={channel} className="capitalize cursor-pointer">
                    {channel === 'webChat' ? 'Web Chat' : channel.toUpperCase()}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>Allowed Actions</CardTitle>
            <CardDescription>What can this agent do?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {actions.map(action => (
                <div key={action} className="flex items-center space-x-3">
                  <Checkbox
                    id={action}
                    checked={formData.allowedActions.includes(action)}
                    onCheckedChange={() => toggleAction(action)}
                  />
                  <Label htmlFor={action} className="cursor-pointer">{action}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {workspaceKnowledge.length > 0 && (
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>Select knowledge sources for this agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workspaceKnowledge.map(k => (
                  <div key={k.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={k.id}
                      checked={formData.knowledgeBaseIds.includes(k.id)}
                      onCheckedChange={() => toggleKnowledge(k.id)}
                    />
                    <Label htmlFor={k.id} className="cursor-pointer">
                      {k.name}
                      <span className="text-xs text-muted-foreground ml-2">({k.type})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/agents')}>
            Cancel
          </Button>
          <Button type="submit" variant="glow">
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Save Changes' : 'Create Agent'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AgentForm;
