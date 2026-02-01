/**
 * LLM Provider Configuration
 *
 * Contains metadata about supported LLM providers for display in the UI.
 */

export interface LLMProviderInfo {
  name: string;
  description: string;
  icon: string;
}

export const LLM_PROVIDER_INFO: Record<string, LLMProviderInfo> = {
  openai: {
    name: 'OpenAI',
    description: 'GPT-4, GPT-4o, and GPT-3.5 models',
    icon: '🤖',
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Haiku, and Opus models',
    icon: '🧠',
  },
  google: {
    name: 'Google',
    description: 'Gemini 1.5 Pro and Flash models',
    icon: '✨',
  },
  mistral: {
    name: 'Mistral AI',
    description: 'Mistral Large, Medium, and Small models',
    icon: '💨',
  },
  groq: {
    name: 'Groq',
    description: 'Ultra-fast inference with Llama and Mixtral',
    icon: '⚡',
  },
  together: {
    name: 'Together AI',
    description: 'Open source models with flexible pricing',
    icon: '🤝',
  },
  custom: {
    name: 'Custom',
    description: 'Connect your own OpenAI-compatible endpoint',
    icon: '🔧',
  },
};

export const LLM_PROVIDERS = Object.keys(LLM_PROVIDER_INFO);
