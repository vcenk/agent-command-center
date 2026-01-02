import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateAgent } from '@/hooks/useAgents';
import { useCreatePersona } from '@/hooks/usePersonas';
import { useCreateKnowledgeSource } from '@/hooks/useKnowledgeSources';
import { agentTemplates, replaceTemplateVariables, AgentTemplate } from '@/lib/templates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  Calendar,
  MessageCircle,
  Globe,
  Phone,
  Smartphone,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const templateIcons: Record<string, React.ElementType> = {
  'website-assistant': Globe,
  'whatsapp-lead-capture': MessageCircle,
  'appointment-booking': Calendar,
};

const channelOptions = [
  { value: 'webChat', label: 'Web Chat' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'phone', label: 'Phone' },
];

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { workspace, user } = useAuth();
  const { toast } = useToast();
  
  const createPersona = useCreatePersona();
  const createKnowledgeSource = useCreateKnowledgeSource();
  const createAgent = useCreateAgent();
  
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    agentName: '',
    personaName: '',
    businessName: '',
    primaryChannel: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<'idle' | 'persona' | 'knowledge' | 'agent' | 'done'>('idle');

  const handleUseTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    const defaultChannel = Object.entries(template.defaultAgent.channels)
      .find(([_, enabled]) => enabled)?.[0] || 'webChat';
    
    setFormData({
      agentName: template.name,
      personaName: template.defaultPersona.name,
      businessName: '',
      primaryChannel: defaultChannel,
    });
    setCreationStep('idle');
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !workspace || !user) return;
    if (!formData.agentName.trim() || !formData.businessName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide agent name and business name.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    const vars = { businessName: formData.businessName };

    try {
      // 1. Create Persona
      setCreationStep('persona');
      const persona = await createPersona.mutateAsync({
        name: formData.personaName || selectedTemplate.defaultPersona.name,
        role_title: selectedTemplate.defaultPersona.roleTitle,
        tone: selectedTemplate.defaultPersona.tone,
        style_notes: replaceTemplateVariables(selectedTemplate.defaultPersona.styleNotes, vars),
        do_not_do: selectedTemplate.defaultPersona.guardrails,
        greeting_script: replaceTemplateVariables(selectedTemplate.defaultPersona.greetingScript, vars),
        fallback_policy: selectedTemplate.defaultPersona.fallbackPolicy,
        escalation_rules: replaceTemplateVariables(selectedTemplate.defaultPersona.escalationRules, vars),
      });

      // 2. Create Knowledge Source with chunks
      setCreationStep('knowledge');
      const rawText = selectedTemplate.defaultKnowledgeBase.chunks
        .map(chunk => replaceTemplateVariables(chunk, vars))
        .join('\n\n---\n\n');
      
      const knowledgeSource = await createKnowledgeSource.mutateAsync({
        name: replaceTemplateVariables(selectedTemplate.defaultKnowledgeBase.name, vars),
        type: 'TEXT',
        raw_text: rawText,
        tags: [selectedTemplate.category.toLowerCase(), 'template'],
        url: null,
        file_name: null,
      });

      // 3. Create Agent in draft status
      setCreationStep('agent');
      const channels = {
        webChat: formData.primaryChannel === 'webChat',
        phone: formData.primaryChannel === 'phone',
        sms: formData.primaryChannel === 'sms',
        whatsapp: formData.primaryChannel === 'whatsapp',
      };

      const agent = await createAgent.mutateAsync({
        name: formData.agentName,
        business_domain: selectedTemplate.defaultAgent.industry,
        persona_id: persona.id,
        channels,
        goals: replaceTemplateVariables(selectedTemplate.defaultAgent.goals, vars),
        allowed_actions: [],
        knowledge_source_ids: [knowledgeSource.id],
        status: 'draft',
      });

      setCreationStep('done');
      
      // Short delay to show success state
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: 'Draft Agent Created',
        description: 'Review your agent configuration before publishing.',
      });

      setIsDialogOpen(false);
      navigate(`/dashboard/agents/${agent.id}/review`);
    } catch (error) {
      console.error('Template creation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create agent from template.',
        variant: 'destructive',
      });
      setCreationStep('idle');
    } finally {
      setIsCreating(false);
    }
  };

  const getStepStatus = (step: string) => {
    const steps = ['persona', 'knowledge', 'agent', 'done'];
    const currentIndex = steps.indexOf(creationStep);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex || creationStep === 'done') return 'done';
    if (stepIndex === currentIndex) return 'loading';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Agent Templates</h1>
        <p className="text-muted-foreground mt-1">
          Get started quickly with pre-configured agent templates
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agentTemplates.map((template) => {
          const Icon = templateIcons[template.id] || Globe;

          return (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <Badge variant="secondary">{template.category}</Badge>
                </div>
                <CardTitle className="mt-4">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleUseTemplate(template)}
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create from Template</DialogTitle>
            <DialogDescription>
              {selectedTemplate && (
                <>Using <strong>{selectedTemplate.name}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {isCreating ? (
            <div className="py-6 space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-4">Creating your agent...</p>
              {['persona', 'knowledge', 'agent'].map((step) => {
                const status = getStepStatus(step);
                return (
                  <div key={step} className="flex items-center gap-3">
                    {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted" />}
                    <span className={status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}>
                      {step === 'persona' && 'Creating persona...'}
                      {step === 'knowledge' && 'Setting up knowledge base...'}
                      {step === 'agent' && 'Creating draft agent...'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Acme Corp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentName">Agent Name *</Label>
                <Input
                  id="agentName"
                  value={formData.agentName}
                  onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                  placeholder="My Business Assistant"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="personaName">Persona Name</Label>
                <Input
                  id="personaName"
                  value={formData.personaName}
                  onChange={(e) => setFormData(prev => ({ ...prev, personaName: e.target.value }))}
                  placeholder={selectedTemplate?.defaultPersona.name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryChannel">Primary Channel</Label>
                <Select
                  value={formData.primaryChannel}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, primaryChannel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            {!isCreating && (
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isCreating}>
                  Create Draft Agent
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
