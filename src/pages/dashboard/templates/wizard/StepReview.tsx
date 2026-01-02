import React from 'react';
import { useWizard } from './WizardContext';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Globe, AlertTriangle } from 'lucide-react';
import { replaceTemplateVariables } from '@/lib/templates';

export const StepReview: React.FC = () => {
  const { data, updateData, goToStep, template } = useWizard();
  const vars = { businessName: data.businessName || 'Your Business' };

  const getKbSummary = () => {
    if (data.kbMethod === 'paste') {
      const wordCount = data.pastedText.split(/\s+/).filter(Boolean).length;
      return `${wordCount} words of custom content`;
    }
    if (data.kbMethod === 'faq') {
      const filledFaqs = data.faqItems.filter(f => f.question && f.answer).length;
      return `${filledFaqs} FAQ item${filledFaqs !== 1 ? 's' : ''}`;
    }
    return `${template?.defaultKnowledgeBase.chunks.length || 0} template chunks`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Review & Create</h3>
        <p className="text-sm text-muted-foreground">
          Review your configuration before creating the agent
        </p>
      </div>

      <div className="space-y-4">
        {/* Basics */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Basics</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => goToStep(1)}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Business</dt>
              <dd className="font-medium">{data.businessName || '—'}</dd>
              <dt className="text-muted-foreground">Agent Name</dt>
              <dd className="font-medium">{data.agentName || '—'}</dd>
              {data.websiteUrl && (
                <>
                  <dt className="text-muted-foreground">Website</dt>
                  <dd className="font-medium truncate">{data.websiteUrl}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Persona */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Persona</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{data.personaName || '—'}</dd>
              <dt className="text-muted-foreground">Tone</dt>
              <dd className="font-medium capitalize">{data.tone}</dd>
              <dt className="text-muted-foreground">Guardrails</dt>
              <dd className="font-medium">{data.guardrails.length} rules</dd>
            </dl>
            <div className="mt-3 p-3 rounded-md bg-muted/50 text-sm">
              <p className="text-muted-foreground italic">
                "{replaceTemplateVariables(data.greetingScript, vars)}"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Knowledge Base</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => goToStep(3)}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm">
              <Badge variant="secondary" className="mr-2">
                {data.kbMethod === 'paste' ? 'Custom Text' : data.kbMethod === 'faq' ? 'FAQ' : 'Template'}
              </Badge>
              {getKbSummary()}
            </p>
          </CardContent>
        </Card>

        {/* Channels */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Channels</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => goToStep(4)}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              {data.webChatEnabled && (
                <Badge variant="outline" className="gap-1">
                  <Globe className="h-3 w-3" />
                  Web Chat
                </Badge>
              )}
              {!data.webChatEnabled && (
                <span className="text-sm text-muted-foreground">No channels enabled</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Publish Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-border">
        <div>
          <Label htmlFor="publishImmediately" className="font-medium">
            Publish immediately
          </Label>
          <p className="text-sm text-muted-foreground">
            Make agent live right away (not recommended)
          </p>
        </div>
        <Switch
          id="publishImmediately"
          checked={data.publishImmediately}
          onCheckedChange={(checked) => updateData({ publishImmediately: checked })}
        />
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <p className="text-sm text-warning">
          We recommend testing your agent in the Test Chat before publishing.
        </p>
      </div>
    </div>
  );
};
