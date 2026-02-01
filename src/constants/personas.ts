/**
 * Persona Configuration Constants
 *
 * Contains enums and metadata for persona settings.
 */

export type PersonaTone = 'professional' | 'friendly' | 'casual' | 'formal';
export type FallbackPolicy = 'apologize' | 'escalate' | 'retry' | 'transfer';

export interface ToneInfo {
  label: string;
  description: string;
}

export const PERSONA_TONES: Record<PersonaTone, ToneInfo> = {
  professional: {
    label: 'Professional',
    description: 'Formal business communication',
  },
  friendly: {
    label: 'Friendly',
    description: 'Warm and approachable',
  },
  casual: {
    label: 'Casual',
    description: 'Relaxed and conversational',
  },
  formal: {
    label: 'Formal',
    description: 'Very structured and official',
  },
};

export const FALLBACK_POLICIES: Record<FallbackPolicy, { label: string; description: string }> = {
  apologize: {
    label: 'Apologize',
    description: 'Apologize and suggest alternatives',
  },
  escalate: {
    label: 'Escalate',
    description: 'Escalate to human support',
  },
  retry: {
    label: 'Retry',
    description: 'Ask user to rephrase the question',
  },
  transfer: {
    label: 'Transfer',
    description: 'Transfer to another agent or department',
  },
};

export const TONE_OPTIONS = Object.entries(PERSONA_TONES).map(([value, info]) => ({
  value: value as PersonaTone,
  label: info.label,
  description: info.description,
}));

export const FALLBACK_OPTIONS = Object.entries(FALLBACK_POLICIES).map(([value, info]) => ({
  value: value as FallbackPolicy,
  label: info.label,
  description: info.description,
}));
