import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePersona, useCreatePersona, useUpdatePersona, PersonaRow } from '@/hooks/usePersonas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, X, Plus, MessageSquare, Bot } from 'lucide-react';

const tones = ['professional', 'friendly', 'casual', 'formal'] as const;
const fallbackPolicies = ['apologize', 'escalate', 'retry', 'transfer'] as const;

const PersonaForm: React.FC = () => {
  const { id } = useParams();
  const { workspace } = useAuth();
  const navigate = useNavigate();
  const isEditing = id && id !== 'new';

  const { data: existingPersona, isLoading: isLoadingPersona } = usePersona(isEditing ? id : undefined);
  const createPersona = useCreatePersona();
  const updatePersona = useUpdatePersona();

  const [formData, setFormData] = useState({
    name: '',
    role_title: '',
    tone: 'professional' as PersonaRow['tone'],
    style_notes: '',
    do_not_do: [] as string[],
    greeting_script: '',
    fallback_policy: 'apologize' as PersonaRow['fallback_policy'],
    escalation_rules: '',
  });

  const [newDoNotDo, setNewDoNotDo] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (existingPersona) {
      setFormData({
        name: existingPersona.name,
        role_title: existingPersona.role_title,
        tone: existingPersona.tone,
        style_notes: existingPersona.style_notes || '',
        do_not_do: existingPersona.do_not_do || [],
        greeting_script: existingPersona.greeting_script || '',
        fallback_policy: existingPersona.fallback_policy,
        escalation_rules: existingPersona.escalation_rules || '',
      });
    }
  }, [existingPersona]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;

    if (isEditing && existingPersona) {
      await updatePersona.mutateAsync({ id: existingPersona.id, ...formData });
    } else {
      await createPersona.mutateAsync(formData);
    }

    navigate('/dashboard/personas');
  };

  const addDoNotDo = () => {
    if (newDoNotDo.trim()) {
      setFormData(prev => ({
        ...prev,
        do_not_do: [...prev.do_not_do, newDoNotDo.trim()],
      }));
      setNewDoNotDo('');
    }
  };

  const removeDoNotDo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      do_not_do: prev.do_not_do.filter((_, i) => i !== index),
    }));
  };

  const generateMockGreeting = () => {
    const name = formData.name || 'Assistant';
    const role = formData.role_title || 'your assistant';
    const toneGreetings: Record<PersonaRow['tone'], string> = {
      professional: `Good day! This is ${name}, ${role}. How may I assist you today?`,
      friendly: `Hey there! I'm ${name}, ${role}. What can I help you with?`,
      casual: `Hi! ${name} here. What's up?`,
      formal: `Good day. I am ${name}, ${role}. How may I be of service?`,
    };
    return toneGreetings[formData.tone];
  };

  const generateMockResponse = () => {
    const responses: Record<PersonaRow['tone'], string> = {
      professional: "I understand your concern. Let me look into that for you right away. Based on our records, I can help you with that request.",
      friendly: "Oh, I totally get that! Let me check on that for you. Give me just a sec... Great news! I found what you need!",
      casual: "Got it! Let me see... Yep, I can help with that. Here's what you need to know.",
      formal: "Certainly. I shall investigate this matter forthwith. Upon review, I have located the relevant information for your inquiry.",
    };
    return responses[formData.tone];
  };

  if (isEditing && isLoadingPersona) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  const isSubmitting = createPersona.isPending || updatePersona.isPending;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/dashboard/personas')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Personas
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isEditing ? 'Edit Persona' : 'Create Persona'}
        </h1>
        <p className="text-muted-foreground">
          Define your AI agent's personality and behavior
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Persona Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Sarah - Dental Receptionist"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleTitle">Role Title</Label>
                  <Input
                    id="roleTitle"
                    value={formData.role_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, role_title: e.target.value }))}
                    placeholder="Dental Receptionist"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Behavior */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select
                  value={formData.tone}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tone: v as PersonaRow['tone'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="styleNotes">Style Notes</Label>
                <Textarea
                  id="styleNotes"
                  value={formData.style_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, style_notes: e.target.value }))}
                  placeholder="e.g., Always confirm appointment details, use patient's first name..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Scripts */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Scripts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="greetingScript">Greeting Script</Label>
                <Textarea
                  id="greetingScript"
                  value={formData.greeting_script}
                  onChange={(e) => setFormData(prev => ({ ...prev, greeting_script: e.target.value }))}
                  placeholder="Hello! Thank you for calling [Company]. This is [Name]. How may I help you today?"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Guardrails */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Guardrails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Do Not Do (Restrictions)</Label>
                <div className="flex gap-2">
                  <Input
                    value={newDoNotDo}
                    onChange={(e) => setNewDoNotDo(e.target.value)}
                    placeholder="Add a restriction..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDoNotDo())}
                  />
                  <Button type="button" variant="outline" onClick={addDoNotDo}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.do_not_do.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.do_not_do.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                        {item}
                        <button
                          type="button"
                          onClick={() => removeDoNotDo(idx)}
                          className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fallbackPolicy">Fallback Policy</Label>
                <Select
                  value={formData.fallback_policy}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, fallback_policy: v as PersonaRow['fallback_policy'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fallbackPolicies.map(p => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="escalationRules">Escalation Rules</Label>
                <Textarea
                  id="escalationRules"
                  value={formData.escalation_rules}
                  onChange={(e) => setFormData(prev => ({ ...prev, escalation_rules: e.target.value }))}
                  placeholder="e.g., Escalate to manager if customer mentions legal action or requests refund over $500..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/personas')}>
              Cancel
            </Button>
            <Button type="submit" variant="glow" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Persona'}
            </Button>
          </div>
        </form>

        {/* Preview Panel */}
        <div className="space-y-4">
          <Card className="glass border-border/50 sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/30">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 rounded-full bg-primary/20">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">Greeting</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.greeting_script || generateMockGreeting()}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/30 pt-4 mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Sample Q&A</p>
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="bg-primary/20 rounded-lg px-3 py-2 max-w-[80%]">
                        <p className="text-sm text-foreground">I need help with my appointment.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-full bg-primary/20">
                        <Bot className="w-3 h-3 text-primary" />
                      </div>
                      <div className="bg-secondary/70 rounded-lg px-3 py-2 max-w-[80%]">
                        <p className="text-sm text-foreground">{generateMockResponse()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Tone:</strong> {formData.tone}</p>
                <p><strong>Fallback:</strong> {formData.fallback_policy}</p>
                {formData.do_not_do.length > 0 && (
                  <p><strong>Restrictions:</strong> {formData.do_not_do.length} defined</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PersonaForm;
