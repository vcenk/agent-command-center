import React from 'react';
import { useWizard } from './WizardContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus } from 'lucide-react';

export const StepPersona: React.FC = () => {
  const { data, updateData } = useWizard();

  const addGuardrail = () => {
    updateData({ guardrails: [...data.guardrails, ''] });
  };

  const updateGuardrail = (index: number, value: string) => {
    const updated = [...data.guardrails];
    updated[index] = value;
    updateData({ guardrails: updated });
  };

  const removeGuardrail = (index: number) => {
    updateData({ guardrails: data.guardrails.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Persona Settings</h3>
        <p className="text-sm text-muted-foreground">Define how your agent behaves and communicates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="personaName">Persona Name</Label>
          <Input
            id="personaName"
            value={data.personaName}
            onChange={(e) => updateData({ personaName: e.target.value })}
            placeholder="Customer Support Agent"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="roleTitle">Role Title</Label>
          <Input
            id="roleTitle"
            value={data.roleTitle}
            onChange={(e) => updateData({ roleTitle: e.target.value })}
            placeholder="Customer Support Specialist"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tone">Tone</Label>
        <Select value={data.tone} onValueChange={(value: typeof data.tone) => updateData({ tone: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select tone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="formal">Formal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="greetingScript">Greeting Script</Label>
        <Textarea
          id="greetingScript"
          value={data.greetingScript}
          onChange={(e) => updateData({ greetingScript: e.target.value })}
          placeholder="Hi there! How can I help you today?"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Use {'{businessName}'} as a placeholder
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Restrictions / Guardrails</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addGuardrail}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {data.guardrails.map((guardrail, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={guardrail}
                onChange={(e) => updateGuardrail(index, e.target.value)}
                placeholder="Never reveal internal pricing..."
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeGuardrail(index)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {data.guardrails.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No guardrails configured</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fallbackPolicy">Fallback Policy</Label>
        <Select
          value={data.fallbackPolicy}
          onValueChange={(value: typeof data.fallbackPolicy) => updateData({ fallbackPolicy: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select fallback policy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apologize">Apologize and offer alternatives</SelectItem>
            <SelectItem value="escalate">Escalate to human support</SelectItem>
            <SelectItem value="retry">Ask for clarification</SelectItem>
            <SelectItem value="transfer">Transfer to live agent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
