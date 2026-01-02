import React, { createContext, useContext, useState, useCallback } from 'react';
import { AgentTemplate } from '@/lib/templates';

export interface WizardData {
  // Step 1: Basics
  businessName: string;
  websiteUrl: string;
  agentName: string;
  
  // Step 2: Persona
  personaName: string;
  roleTitle: string;
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  greetingScript: string;
  guardrails: string[];
  fallbackPolicy: 'apologize' | 'escalate' | 'retry' | 'transfer';
  
  // Step 3: Knowledge Base
  kbMethod: 'paste' | 'faq' | 'skip';
  pastedText: string;
  faqItems: { question: string; answer: string }[];
  
  // Step 4: Channels
  webChatEnabled: boolean;
  
  // Step 5: Review
  publishImmediately: boolean;
}

interface WizardContextType {
  template: AgentTemplate | null;
  data: WizardData;
  step: number;
  totalSteps: number;
  setTemplate: (template: AgentTemplate) => void;
  updateData: (updates: Partial<WizardData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  reset: () => void;
}

const defaultData: WizardData = {
  businessName: '',
  websiteUrl: '',
  agentName: '',
  personaName: '',
  roleTitle: '',
  tone: 'friendly',
  greetingScript: '',
  guardrails: [],
  fallbackPolicy: 'escalate',
  kbMethod: 'skip',
  pastedText: '',
  faqItems: [{ question: '', answer: '' }],
  webChatEnabled: true,
  publishImmediately: false,
};

const WizardContext = createContext<WizardContextType | null>(null);

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
};

export const WizardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [template, setTemplateState] = useState<AgentTemplate | null>(null);
  const [data, setData] = useState<WizardData>(defaultData);
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const setTemplate = useCallback((t: AgentTemplate) => {
    setTemplateState(t);
    // Pre-fill from template
    setData({
      ...defaultData,
      agentName: t.name,
      personaName: t.defaultPersona.name,
      roleTitle: t.defaultPersona.roleTitle,
      tone: t.defaultPersona.tone,
      greetingScript: t.defaultPersona.greetingScript,
      guardrails: [...t.defaultPersona.guardrails],
      fallbackPolicy: t.defaultPersona.fallbackPolicy,
      webChatEnabled: t.defaultAgent.channels.webChat,
    });
    setStep(1);
  }, []);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    setStep(prev => Math.min(prev + 1, totalSteps));
  }, []);

  const prevStep = useCallback(() => {
    setStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((s: number) => {
    setStep(Math.max(1, Math.min(s, totalSteps)));
  }, []);

  const reset = useCallback(() => {
    setTemplateState(null);
    setData(defaultData);
    setStep(1);
  }, []);

  return (
    <WizardContext.Provider
      value={{
        template,
        data,
        step,
        totalSteps,
        setTemplate,
        updateData,
        nextStep,
        prevStep,
        goToStep,
        reset,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
};
