import React from 'react';
import { useWizard } from './WizardContext';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const steps = [
  { number: 1, label: 'Basics' },
  { number: 2, label: 'Persona' },
  { number: 3, label: 'Knowledge' },
  { number: 4, label: 'Channels' },
  { number: 5, label: 'Review' },
];

export const WizardStepper: React.FC = () => {
  const { step } = useWizard();

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-border">
      {steps.map((s, index) => {
        const isCompleted = step > s.number;
        const isCurrent = step === s.number;

        return (
          <React.Fragment key={s.number}>
            {index > 0 && (
              <div
                className={cn(
                  'h-[2px] w-8 transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : s.number}
              </div>
              <span
                className={cn(
                  'text-xs hidden sm:inline',
                  isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {s.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
