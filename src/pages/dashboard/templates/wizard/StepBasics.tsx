import React from 'react';
import { useWizard } from './WizardContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const StepBasics: React.FC = () => {
  const { data, updateData, template } = useWizard();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
        <p className="text-sm text-muted-foreground">Tell us about your business</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            value={data.businessName}
            onChange={(e) => updateData({ businessName: e.target.value })}
            placeholder="Acme Corp"
          />
          <p className="text-xs text-muted-foreground">
            Used in greetings and knowledge base content
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website URL (optional)</Label>
          <Input
            id="websiteUrl"
            type="url"
            value={data.websiteUrl}
            onChange={(e) => updateData({ websiteUrl: e.target.value })}
            placeholder="https://example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agentName">Agent Name *</Label>
          <Input
            id="agentName"
            value={data.agentName}
            onChange={(e) => updateData({ agentName: e.target.value })}
            placeholder={template?.name || 'My Assistant'}
          />
          <p className="text-xs text-muted-foreground">
            How this agent will appear in your dashboard
          </p>
        </div>
      </div>
    </div>
  );
};
