import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgent, useCreateAgent, useUpdateAgent } from '@/hooks/useAgents';
import { usePersonas } from '@/hooks/usePersonas';
import { useKnowledgeSources } from '@/hooks/useKnowledgeSources';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';

const domains = ['healthcare', 'retail', 'finance', 'realestate', 'hospitality', 'other'] as const;
const actions = ['Book appointment (Calendly)', 'Send webhook (POST)', 'Send email', 'Transfer to human'];

const AgentForm: React.FC = () => {
  const { id } = useParams();
  const { workspace } = useAuth();
  const navigate = useNavigate();
  const isEditing = id && id !== 'new';

  const { data: existingAgent, isLoading: isLoadingAgent } = useAgent(isEditing ? id : undefined);
  const { data: personas = [] } = usePersonas();
  const { data: knowledgeSources = [] } = useKnowledgeSources();
  
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();

  const [formData, setFormData] = useState({
    name: '',
    business_domain: 'other' as typeof domains[number],
    persona_id: null as string | null,
    goals: '',
    allowed_actions: [] as string[],
    knowledge_source_ids: [] as string[],
    channels: {
      webChat: true,
      phone: false,
      sms: false,
      whatsapp: false,
    },
    status: 'draft' as 'draft' | 'live',
  });

  // Populate form when editing
  useEffect(() => {
    if (existingAgent) {
      const channels = existingAgent.channels as { webChat?: boolean; phone?: boolean; sms?: boolean; whatsapp?: boolean };
      setFormData({
        name: existingAgent.name,
        business_domain: existingAgent.business_domain,
        persona_id: existingAgent.persona_id,
        goals: existingAgent.goals || '',
        allowed_actions: existingAgent.allowed_actions || [],
        knowledge_source_ids: existingAgent.knowledge_source_ids || [],
        channels: {
          webChat: channels?.webChat ?? true,
          phone: channels?.phone ?? false,
          sms: channels?.sms ?? false,
          whatsapp: channels?.whatsapp ?? false,
        },
        status: existingAgent.status,
      });
    }
  }, [existingAgent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;

    if (isEditing && existingAgent) {
      await updateAgent.mutateAsync({ id: existingAgent.id, ...formData });
    } else {
      await createAgent.mutateAsync(formData);
    }

    navigate('/dashboard/agents');
  };

  const toggleAction = (action: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_actions: prev.allowed_actions.includes(action)
        ? prev.allowed_actions.filter(a => a !== action)
        : [...prev.allowed_actions, action],
    }));
  };

  const toggleKnowledge = (id: string) => {
    setFormData(prev => ({
      ...prev,
      knowledge_source_ids: prev.knowledge_source_ids.includes(id)
        ? prev.knowledge_source_ids.filter(k => k !== id)
        : [...prev.knowledge_source_ids, id],
    }));
  };

  if (isEditing && isLoadingAgent) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isSubmitting = createAgent.isPending || updateAgent.isPending;

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
                value={formData.business_domain}
                onValueChange={(v) => setFormData(prev => ({ ...prev, business_domain: v as typeof domains[number] }))}
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
                value={formData.persona_id || 'none'}
                onValueChange={(v) => setFormData(prev => ({ ...prev, persona_id: v === 'none' ? null : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a persona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No persona</SelectItem>
                  {personas.map(p => (
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
                    checked={formData.channels[channel]}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      channels: { ...prev.channels, [channel]: !!checked }
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
                    checked={formData.allowed_actions.includes(action)}
                    onCheckedChange={() => toggleAction(action)}
                  />
                  <Label htmlFor={action} className="cursor-pointer">{action}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {knowledgeSources.length > 0 && (
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>Select knowledge sources for this agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {knowledgeSources.map(k => (
                  <div key={k.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={k.id}
                      checked={formData.knowledge_source_ids.includes(k.id)}
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
          <Button type="submit" variant="glow" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Agent'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AgentForm;
