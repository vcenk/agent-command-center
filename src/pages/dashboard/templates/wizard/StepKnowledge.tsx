import React from 'react';
import { useWizard } from './WizardContext';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, HelpCircle, SkipForward, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const StepKnowledge: React.FC = () => {
  const { data, updateData, template } = useWizard();

  const addFaqItem = () => {
    updateData({ faqItems: [...data.faqItems, { question: '', answer: '' }] });
  };

  const updateFaqItem = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...data.faqItems];
    updated[index] = { ...updated[index], [field]: value };
    updateData({ faqItems: updated });
  };

  const removeFaqItem = (index: number) => {
    if (data.faqItems.length > 1) {
      updateData({ faqItems: data.faqItems.filter((_, i) => i !== index) });
    }
  };

  const methods = [
    {
      id: 'paste' as const,
      icon: FileText,
      title: 'Paste Text',
      description: 'Paste your knowledge content directly',
    },
    {
      id: 'faq' as const,
      icon: HelpCircle,
      title: 'FAQ Builder',
      description: 'Create question and answer pairs',
    },
    {
      id: 'skip' as const,
      icon: SkipForward,
      title: 'Skip for now',
      description: 'Use template defaults and add later',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Knowledge Base</h3>
        <p className="text-sm text-muted-foreground">
          Add information your agent can use to answer questions
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {methods.map(({ id, icon: Icon, title, description }) => (
          <Card
            key={id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50',
              data.kbMethod === id && 'border-primary bg-primary/5'
            )}
            onClick={() => updateData({ kbMethod: id })}
          >
            <CardContent className="p-4 text-center">
              <Icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.kbMethod === 'paste' && (
        <div className="space-y-2">
          <Label htmlFor="pastedText">Paste your content</Label>
          <Textarea
            id="pastedText"
            value={data.pastedText}
            onChange={(e) => updateData({ pastedText: e.target.value })}
            placeholder="Paste FAQs, product information, policies, or any other content your agent should know..."
            rows={10}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Content will be automatically chunked for retrieval
          </p>
        </div>
      )}

      {data.kbMethod === 'faq' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>FAQ Items</Label>
            <Button type="button" variant="outline" size="sm" onClick={addFaqItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add FAQ
            </Button>
          </div>
          <div className="space-y-4">
            {data.faqItems.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Question</Label>
                        <Input
                          value={item.question}
                          onChange={(e) => updateFaqItem(index, 'question', e.target.value)}
                          placeholder="What are your business hours?"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Answer</Label>
                        <Textarea
                          value={item.answer}
                          onChange={(e) => updateFaqItem(index, 'answer', e.target.value)}
                          placeholder="We're open Monday to Friday, 9 AM to 5 PM..."
                          rows={2}
                        />
                      </div>
                    </div>
                    {data.faqItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFaqItem(index)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data.kbMethod === 'skip' && template && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground mb-2">
            Using template defaults ({template.defaultKnowledgeBase.chunks.length} starter chunks)
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {template.defaultKnowledgeBase.chunks.slice(0, 3).map((chunk, i) => (
              <li key={i} className="truncate">• {chunk.substring(0, 60)}...</li>
            ))}
            {template.defaultKnowledgeBase.chunks.length > 3 && (
              <li className="text-muted-foreground/70">
                + {template.defaultKnowledgeBase.chunks.length - 3} more...
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
