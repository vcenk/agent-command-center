import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateAgent } from '@/hooks/useAgents';
import { useCreatePersona } from '@/hooks/usePersonas';
import { useCreateKnowledgeSource } from '@/hooks/useKnowledgeSources';
import { useUpsertChannelConfig } from '@/hooks/useChannelConfigs';
import { agentTemplates, replaceTemplateVariables, AgentTemplate } from '@/lib/templates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  MessageCircle,
  Calendar,
  Globe,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { WizardProvider, useWizard, WizardData } from './wizard/WizardContext';
import { WizardStepper } from './wizard/WizardStepper';
import { StepBasics } from './wizard/StepBasics';
import { StepPersona } from './wizard/StepPersona';
import { StepKnowledge } from './wizard/StepKnowledge';
import { StepChannels } from './wizard/StepChannels';
import { StepReview } from './wizard/StepReview';
import { WizardSuccess } from './wizard/WizardSuccess';

const templateIcons: Record<string, React.ElementType> = {
  'website-assistant': Globe,
  'whatsapp-lead-capture': MessageCircle,
  'appointment-booking': Calendar,
};

interface WizardDialogContentProps {
  onClose: () => void;
}

const WizardDialogContent: React.FC<WizardDialogContentProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { workspace, user } = useAuth();
  const { toast } = useToast();
  const { step, totalSteps, data, template, nextStep, prevStep, reset } = useWizard();

  const createPersona = useCreatePersona();
  const createKnowledgeSource = useCreateKnowledgeSource();
  const createAgent = useCreateAgent();
  const upsertChannelConfig = useUpsertChannelConfig();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<{ id: string; name: string } | null>(null);

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!data.businessName.trim() || !data.agentName.trim()) {
        toast({
          title: 'Missing Information',
          description: 'Business name and agent name are required.',
          variant: 'destructive',
        });
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      nextStep();
    }
  };

  const handleSubmit = async () => {
    if (!template || !workspace || !user) return;
    
    setIsSubmitting(true);
    const vars = { businessName: data.businessName };

    try {
      // 1. Create Persona
      const persona = await createPersona.mutateAsync({
        name: data.personaName || template.defaultPersona.name,
        role_title: data.roleTitle || template.defaultPersona.roleTitle,
        tone: data.tone,
        style_notes: replaceTemplateVariables(template.defaultPersona.styleNotes, vars),
        do_not_do: data.guardrails.filter(g => g.trim()),
        greeting_script: replaceTemplateVariables(data.greetingScript, vars),
        fallback_policy: data.fallbackPolicy,
        escalation_rules: replaceTemplateVariables(template.defaultPersona.escalationRules, vars),
      });

      // 2. Create Knowledge Source
      let rawText = '';
      if (data.kbMethod === 'paste') {
        rawText = data.pastedText;
      } else if (data.kbMethod === 'faq') {
        rawText = data.faqItems
          .filter(f => f.question && f.answer)
          .map(f => `Q: ${f.question}\nA: ${f.answer}`)
          .join('\n\n---\n\n');
      } else {
        // Use template defaults
        rawText = template.defaultKnowledgeBase.chunks
          .map(chunk => replaceTemplateVariables(chunk, vars))
          .join('\n\n---\n\n');
      }

      const knowledgeSource = await createKnowledgeSource.mutateAsync({
        name: replaceTemplateVariables(template.defaultKnowledgeBase.name, vars),
        type: 'TEXT',
        raw_text: rawText,
        tags: [template.category.toLowerCase(), 'template'],
        url: data.websiteUrl || null,
        file_name: null,
      });

      // 3. Create Agent
      const channels = {
        webChat: data.webChatEnabled,
        phone: false,
        sms: false,
        whatsapp: false,
      };

      const agent = await createAgent.mutateAsync({
        name: data.agentName,
        business_domain: template.defaultAgent.industry,
        persona_id: persona.id,
        channels,
        goals: replaceTemplateVariables(template.defaultAgent.goals, vars),
        allowed_actions: [],
        knowledge_source_ids: [knowledgeSource.id],
        status: data.publishImmediately ? 'live' : 'draft',
      });

      // 4. Create channel config for web chat if enabled
      if (data.webChatEnabled) {
        await upsertChannelConfig.mutateAsync({
          agent_id: agent.id,
          channel: 'webChat',
          greeting: replaceTemplateVariables(data.greetingScript, vars),
          voicemail_fallback: false,
          business_hours: '9:00 AM - 5:00 PM',
          escalation_to_human: data.fallbackPolicy === 'escalate' || data.fallbackPolicy === 'transfer',
          provider: null,
          phone_number: null,
        });
      }

      setCreatedAgent({ id: agent.id, name: agent.name });

      toast({
        title: data.publishImmediately ? 'Agent Published' : 'Draft Agent Created',
        description: data.publishImmediately 
          ? 'Your agent is now live.'
          : 'Review your agent before publishing.',
      });
    } catch (error) {
      console.error('Template creation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create agent from template.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Show success screen after creation
  if (createdAgent) {
    return (
      <WizardSuccess
        agentId={createdAgent.id}
        agentName={createdAgent.name}
        isPublished={data.publishImmediately}
        onClose={handleClose}
      />
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1: return <StepBasics />;
      case 2: return <StepPersona />;
      case 3: return <StepKnowledge />;
      case 4: return <StepChannels />;
      case 5: return <StepReview />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col max-h-[80vh]">
      <WizardStepper />
      
      <div className="flex-1 overflow-y-auto p-6">
        {renderStep()}
      </div>

      <div className="flex items-center justify-between p-4 border-t border-border">
        <Button
          variant="outline"
          onClick={step === 1 ? handleClose : prevStep}
          disabled={isSubmitting}
        >
          {step === 1 ? (
            'Cancel'
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </>
          )}
        </Button>

        {step < totalSteps ? (
          <Button onClick={handleNext} disabled={isSubmitting}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Agent'
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export const TemplatesPage: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleUseTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTemplate(null);
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
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
          {selectedTemplate && (
            <WizardProvider>
              <WizardDialogWrapper
                template={selectedTemplate}
                onClose={handleCloseDialog}
              />
            </WizardProvider>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Wrapper to initialize wizard with template
const WizardDialogWrapper: React.FC<{
  template: AgentTemplate;
  onClose: () => void;
}> = ({ template, onClose }) => {
  const { setTemplate } = useWizard();
  
  React.useEffect(() => {
    setTemplate(template);
  }, [template, setTemplate]);

  return <WizardDialogContent onClose={onClose} />;
};
