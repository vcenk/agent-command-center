import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { personas, auditLogs } from '@/lib/mockDb';
import { Persona } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, X, Plus, MessageSquare, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const tones = ['professional', 'friendly', 'casual', 'formal'] as const;
const fallbackPolicies = ['apologize', 'escalate', 'retry', 'transfer'] as const;

const PersonaForm: React.FC = () => {
  const { id } = useParams();
  const { workspace, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = id && id !== 'new';

  const existingPersona = isEditing ? personas.getById(id) : null;

  const [formData, setFormData] = useState({
    name: existingPersona?.name || '',
    roleTitle: existingPersona?.roleTitle || '',
    tone: existingPersona?.tone || 'professional' as Persona['tone'],
    styleNotes: existingPersona?.styleNotes || '',
    doNotDo: existingPersona?.doNotDo || [] as string[],
    greetingScript: existingPersona?.greetingScript || '',
    fallbackPolicy: existingPersona?.fallbackPolicy || 'apologize' as Persona['fallbackPolicy'],
    escalationRules: existingPersona?.escalationRules || '',
  });

  const [newDoNotDo, setNewDoNotDo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !user) return;

    if (isEditing && existingPersona) {
      const updated = personas.update(existingPersona.id, formData);
      auditLogs.create({
        workspaceId: workspace.id,
        actorEmail: user.email,
        actionType: 'update',
        entityType: 'persona',
        entityId: existingPersona.id,
        before: { id: existingPersona.id, name: existingPersona.name },
        after: { id: existingPersona.id, name: formData.name },
      });
      toast({ title: 'Persona updated', description: `${formData.name} has been saved.` });
    } else {
      const newPersona = personas.create({
        ...formData,
        workspaceId: workspace.id,
      });
      auditLogs.create({
        workspaceId: workspace.id,
        actorEmail: user.email,
        actionType: 'create',
        entityType: 'persona',
        entityId: newPersona.id,
        before: null,
        after: { id: newPersona.id, name: newPersona.name },
      });
      toast({ title: 'Persona created', description: `${formData.name} is ready to use.` });
    }

    navigate('/dashboard/personas');
  };

  const addDoNotDo = () => {
    if (newDoNotDo.trim()) {
      setFormData(prev => ({
        ...prev,
        doNotDo: [...prev.doNotDo, newDoNotDo.trim()],
      }));
      setNewDoNotDo('');
    }
  };

  const removeDoNotDo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      doNotDo: prev.doNotDo.filter((_, i) => i !== index),
    }));
  };

  const generateMockGreeting = () => {
    const name = formData.name || 'Assistant';
    const role = formData.roleTitle || 'your assistant';
    const toneGreetings: Record<Persona['tone'], string> = {
      professional: `Good day! This is ${name}, ${role}. How may I assist you today?`,
      friendly: `Hey there! I'm ${name}, ${role}. What can I help you with?`,
      casual: `Hi! ${name} here. What's up?`,
      formal: `Good day. I am ${name}, ${role}. How may I be of service?`,
    };
    return toneGreetings[formData.tone];
  };

  const generateMockResponse = () => {
    const responses: Record<Persona['tone'], string> = {
      professional: "I understand your concern. Let me look into that for you right away. Based on our records, I can help you with that request.",
      friendly: "Oh, I totally get that! Let me check on that for you. Give me just a sec... Great news! I found what you need!",
      casual: "Got it! Let me see... Yep, I can help with that. Here's what you need to know.",
      formal: "Certainly. I shall investigate this matter forthwith. Upon review, I have located the relevant information for your inquiry.",
    };
    return responses[formData.tone];
  };

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
                    value={formData.roleTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, roleTitle: e.target.value }))}
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
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tone: v as Persona['tone'] }))}
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
                  value={formData.styleNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, styleNotes: e.target.value }))}
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
                  value={formData.greetingScript}
                  onChange={(e) => setFormData(prev => ({ ...prev, greetingScript: e.target.value }))}
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
                {formData.doNotDo.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.doNotDo.map((item, idx) => (
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
                  value={formData.fallbackPolicy}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, fallbackPolicy: v as Persona['fallbackPolicy'] }))}
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
                  value={formData.escalationRules}
                  onChange={(e) => setFormData(prev => ({ ...prev, escalationRules: e.target.value }))}
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
            <Button type="submit" variant="glow">
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Save Changes' : 'Create Persona'}
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
                      {formData.greetingScript || generateMockGreeting()}
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
                <p><strong>Fallback:</strong> {formData.fallbackPolicy}</p>
                {formData.doNotDo.length > 0 && (
                  <p><strong>Restrictions:</strong> {formData.doNotDo.length} defined</p>
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
