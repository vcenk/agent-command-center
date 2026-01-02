import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { agents, personas, knowledgeSources, auditLogs } from '@/lib/mockDb';
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
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  Calendar,
  MessageCircle,
  Phone,
  Building2,
  Home,
  Globe,
  Smartphone,
} from 'lucide-react';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  icon: React.ElementType;
  channels: {
    webChat: boolean;
    phone: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  personaPreset: {
    tone: 'professional' | 'friendly' | 'casual' | 'formal';
    roleTitle: string;
    styleNotes: string;
    doNotDo: string[];
    greetingScript: string;
    fallbackPolicy: 'apologize' | 'escalate' | 'retry' | 'transfer';
    escalationRules: string;
  };
  knowledgePreset: {
    name: string;
    contentTemplate: string;
  };
  goals: string;
}

const templates: AgentTemplate[] = [
  {
    id: 'website-assistant',
    name: 'Website Business Assistant',
    description: 'General-purpose assistant for answering website visitor questions',
    industry: 'General',
    icon: Globe,
    channels: { webChat: true, phone: false, sms: false, whatsapp: false },
    personaPreset: {
      tone: 'friendly',
      roleTitle: 'Customer Support Specialist',
      styleNotes: 'Be helpful, concise, and guide visitors to the information they need.',
      doNotDo: ['Never provide pricing without confirmation', 'Avoid technical jargon'],
      greetingScript: 'Hi there! 👋 Welcome to {businessName}. How can I help you today?',
      fallbackPolicy: 'escalate',
      escalationRules: 'Transfer to human support if unable to answer after 2 attempts.',
    },
    knowledgePreset: {
      name: '{businessName} Website Info',
      contentTemplate: `Welcome to {businessName}!

About Us:
{businessName} is dedicated to providing excellent service to our customers. Visit our website at {websiteUrl} for more information.

Frequently Asked Questions:
- What services do you offer? We offer a range of services tailored to your needs.
- How can I contact you? You can reach us through this chat or via our website.
- What are your business hours? We're available Monday-Friday, 9 AM - 5 PM.

Contact Information:
Website: {websiteUrl}
Email: info@{businessName}.com`,
    },
    goals: 'Help website visitors find information, answer FAQs, and collect leads.',
  },
  {
    id: 'appointment-booking',
    name: 'Appointment Booking Assistant',
    description: 'Help customers schedule appointments and manage bookings',
    industry: 'Services',
    icon: Calendar,
    channels: { webChat: true, phone: false, sms: false, whatsapp: false },
    personaPreset: {
      tone: 'professional',
      roleTitle: 'Booking Coordinator',
      styleNotes: 'Be efficient, clear about availability, and confirm all booking details.',
      doNotDo: ['Never double-book slots', 'Do not share other customer information'],
      greetingScript: 'Hello! I\'m here to help you schedule an appointment with {businessName}. What type of service are you looking for?',
      fallbackPolicy: 'transfer',
      escalationRules: 'If calendar integration fails, collect contact info and have staff follow up.',
    },
    knowledgePreset: {
      name: '{businessName} Booking Guide',
      contentTemplate: `{businessName} Appointment Booking

Services Available:
- Consultation (30 minutes)
- Full Service (1 hour)
- Extended Session (2 hours)

Booking Process:
1. Select your preferred service
2. Choose an available date and time
3. Provide your contact information
4. Receive confirmation via email

Cancellation Policy:
Please cancel at least 24 hours in advance.

Website: {websiteUrl}`,
    },
    goals: 'Schedule appointments, confirm bookings, handle rescheduling requests.',
  },
  {
    id: 'whatsapp-lead-capture',
    name: 'WhatsApp Lead Capture Assistant',
    description: 'Capture and qualify leads through WhatsApp conversations',
    industry: 'Sales',
    icon: MessageCircle,
    channels: { webChat: false, phone: false, sms: false, whatsapp: true },
    personaPreset: {
      tone: 'casual',
      roleTitle: 'Sales Assistant',
      styleNotes: 'Be conversational but focused on understanding customer needs and collecting info.',
      doNotDo: ['Never be pushy', 'Avoid spamming with multiple messages'],
      greetingScript: 'Hey! 👋 Thanks for reaching out to {businessName}. I\'d love to learn more about what you\'re looking for. What brings you here today?',
      fallbackPolicy: 'apologize',
      escalationRules: 'Flag high-value leads for immediate sales team follow-up.',
    },
    knowledgePreset: {
      name: '{businessName} Lead Qualification',
      contentTemplate: `{businessName} Lead Qualification Script

Key Questions to Ask:
1. What specific problem are you trying to solve?
2. What\'s your timeline for making a decision?
3. Have you worked with similar solutions before?

Lead Scoring:
- Hot: Ready to buy, clear budget, decision-maker
- Warm: Interested, researching options
- Cold: Just browsing, no immediate need

Information to Collect:
- Name
- Email
- Phone (optional)
- Company size
- Budget range

Website: {websiteUrl}`,
    },
    goals: 'Qualify leads, collect contact information, route hot leads to sales team.',
  },
  {
    id: 'sms-followup',
    name: 'SMS Follow-up Assistant',
    description: 'Automated SMS follow-ups for appointments and inquiries',
    industry: 'Customer Service',
    icon: Smartphone,
    channels: { webChat: false, phone: false, sms: true, whatsapp: false },
    personaPreset: {
      tone: 'professional',
      roleTitle: 'Customer Care Representative',
      styleNotes: 'Keep messages brief (SMS character limits). Be direct and action-oriented.',
      doNotDo: ['Never send more than 2 messages without a response', 'Avoid long paragraphs'],
      greetingScript: 'Hi, this is {businessName}. Thanks for your recent inquiry! Do you have any questions I can help with?',
      fallbackPolicy: 'apologize',
      escalationRules: 'If customer expresses frustration, immediately route to phone support.',
    },
    knowledgePreset: {
      name: '{businessName} SMS Templates',
      contentTemplate: `{businessName} SMS Communication Guide

Message Templates:
- Appointment Reminder: "Hi [Name], this is a reminder about your appointment tomorrow at [Time]. Reply YES to confirm or RESCHEDULE to change."
- Follow-up: "Hi [Name], thanks for visiting {businessName}! How was your experience? Reply with any feedback."
- Lead Follow-up: "Hi [Name], following up on your inquiry about [Service]. Would you like to schedule a call?"

Best Practices:
- Keep messages under 160 characters when possible
- Include clear call-to-action
- Respect opt-out requests immediately

Website: {websiteUrl}`,
    },
    goals: 'Send appointment reminders, follow up on inquiries, collect feedback via SMS.',
  },
  {
    id: 'ai-receptionist',
    name: 'AI Receptionist',
    description: 'Voice-ready assistant for handling phone calls and routing',
    industry: 'Enterprise',
    icon: Phone,
    channels: { webChat: true, phone: true, sms: false, whatsapp: false },
    personaPreset: {
      tone: 'formal',
      roleTitle: 'Virtual Receptionist',
      styleNotes: 'Speak clearly and professionally. Use proper phone etiquette.',
      doNotDo: ['Never put callers on hold without explanation', 'Avoid using slang'],
      greetingScript: 'Thank you for calling {businessName}. My name is your AI assistant. How may I direct your call today?',
      fallbackPolicy: 'transfer',
      escalationRules: 'Transfer to main line if caller requests human operator or is frustrated.',
    },
    knowledgePreset: {
      name: '{businessName} Call Routing',
      contentTemplate: `{businessName} Phone Directory

Departments:
- Sales: Press 1 or say "Sales"
- Support: Press 2 or say "Support"
- Billing: Press 3 or say "Billing"
- General Inquiries: Press 0 or say "Operator"

Business Hours:
Monday-Friday: 8:00 AM - 6:00 PM
Saturday: 9:00 AM - 1:00 PM
Sunday: Closed

After Hours:
Leave a voicemail and we\'ll return your call within 1 business day.

Website: {websiteUrl}`,
    },
    goals: 'Answer calls, route to appropriate department, take messages after hours.',
  },
  {
    id: 'real-estate',
    name: 'Real Estate Inquiry Assistant',
    description: 'Help potential buyers and renters find properties',
    industry: 'Real Estate',
    icon: Home,
    channels: { webChat: true, phone: false, sms: true, whatsapp: true },
    personaPreset: {
      tone: 'friendly',
      roleTitle: 'Property Specialist',
      styleNotes: 'Be enthusiastic about properties. Ask qualifying questions to understand needs.',
      doNotDo: ['Never guarantee pricing or availability', 'Avoid making promises about negotiations'],
      greetingScript: 'Welcome to {businessName}! 🏠 I\'m here to help you find your perfect property. Are you looking to buy or rent?',
      fallbackPolicy: 'escalate',
      escalationRules: 'Connect qualified buyers with an agent for showings and negotiations.',
    },
    knowledgePreset: {
      name: '{businessName} Property Guide',
      contentTemplate: `{businessName} Real Estate Services

Services:
- Residential Sales
- Rental Properties
- Commercial Real Estate
- Property Management

Buyer Qualification Questions:
1. What area are you interested in?
2. What\'s your budget range?
3. How many bedrooms/bathrooms do you need?
4. What\'s your timeline for moving?

Available Listings:
Visit our website for current listings: {websiteUrl}

Schedule a Viewing:
Contact us to schedule property viewings with one of our agents.`,
    },
    goals: 'Qualify property seekers, share listings, schedule viewings with agents.',
  },
];

const channelLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  webChat: { label: 'Web', variant: 'default' },
  phone: { label: 'Voice-ready', variant: 'secondary' },
  sms: { label: 'SMS', variant: 'outline' },
  whatsapp: { label: 'WhatsApp', variant: 'outline' },
};

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { workspace, user } = useAuth();
  const { toast } = useToast();
  
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    agentName: '',
    businessName: '',
    websiteUrl: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleUseTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      agentName: template.name,
      businessName: '',
      websiteUrl: '',
    });
    setIsDialogOpen(true);
  };

  const replaceTemplateVariables = (text: string): string => {
    return text
      .replace(/{businessName}/g, formData.businessName || 'Your Business')
      .replace(/{websiteUrl}/g, formData.websiteUrl || 'https://yourwebsite.com');
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !workspace || !user) return;
    if (!formData.agentName.trim() || !formData.businessName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both agent name and business name.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      // 1. Create Persona
      const persona = personas.create({
        workspaceId: workspace.id,
        name: `${formData.businessName} ${selectedTemplate.personaPreset.roleTitle}`,
        roleTitle: selectedTemplate.personaPreset.roleTitle,
        tone: selectedTemplate.personaPreset.tone,
        styleNotes: replaceTemplateVariables(selectedTemplate.personaPreset.styleNotes),
        doNotDo: selectedTemplate.personaPreset.doNotDo,
        greetingScript: replaceTemplateVariables(selectedTemplate.personaPreset.greetingScript),
        fallbackPolicy: selectedTemplate.personaPreset.fallbackPolicy,
        escalationRules: replaceTemplateVariables(selectedTemplate.personaPreset.escalationRules),
      });

      // 2. Create Knowledge Source (chunks are generated automatically by mockDb)
      const rawText = replaceTemplateVariables(selectedTemplate.knowledgePreset.contentTemplate);
      const knowledgeSource = knowledgeSources.create({
        workspaceId: workspace.id,
        name: replaceTemplateVariables(selectedTemplate.knowledgePreset.name),
        type: 'TEXT',
        rawText,
        tags: [selectedTemplate.industry.toLowerCase(), 'template'],
      });

      // 3. Create Agent
      const agent = agents.create({
        workspaceId: workspace.id,
        name: formData.agentName,
        businessDomain: selectedTemplate.industry.toLowerCase() as any,
        personaId: persona.id,
        channels: selectedTemplate.channels,
        goals: replaceTemplateVariables(selectedTemplate.goals),
        allowedActions: [],
        knowledgeSourceIds: [knowledgeSource.id],
        status: 'draft',
      });

      // 4. Log audit event
      auditLogs.create({
        workspaceId: workspace.id,
        actorEmail: user.email,
        actionType: 'create',
        entityType: 'template_used',
        entityId: agent.id,
        before: null,
        after: {
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          agentId: agent.id,
          personaId: persona.id,
          knowledgeSourceId: knowledgeSource.id,
        },
      });

      toast({
        title: 'Agent Created from Template',
        description: `${formData.agentName} has been created with persona and knowledge base.`,
      });

      setIsDialogOpen(false);
      navigate(`/dashboard/agents/${agent.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create agent from template.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
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
        {templates.map((template) => {
          const Icon = template.icon;
          const enabledChannels = Object.entries(template.channels)
            .filter(([_, enabled]) => enabled)
            .map(([key]) => key);

          return (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <Badge variant="secondary">{template.industry}</Badge>
                </div>
                <CardTitle className="mt-4">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {enabledChannels.map((channel) => (
                    <Badge
                      key={channel}
                      variant={channelLabels[channel]?.variant || 'outline'}
                    >
                      {channelLabels[channel]?.label || channel}
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
            <DialogTitle>Create Agent from Template</DialogTitle>
            <DialogDescription>
              {selectedTemplate && (
                <>Using the <strong>{selectedTemplate.name}</strong> template</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                placeholder="Acme Corp"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL (optional)</Label>
              <Input
                id="websiteUrl"
                value={formData.websiteUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder="https://example.com"
                type="url"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
