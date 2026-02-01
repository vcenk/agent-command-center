import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

export type LLMModel = Tables<'llm_models'>;
export type WorkspaceLLMConfig = Tables<'workspace_llm_config'>;

// Fetch all active LLM models
export const useLLMModels = () => {
  return useQuery({
    queryKey: ['llm-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('llm_models')
        .select('*')
        .eq('is_active', true)
        .order('provider')
        .order('display_name');

      if (error) throw error;
      return data as LLMModel[];
    },
  });
};

// Fetch LLM models grouped by provider
export const useLLMModelsByProvider = () => {
  const { data: models, ...rest } = useLLMModels();

  const groupedModels = models?.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, LLMModel[]>);

  return { data: groupedModels, ...rest };
};

// Get default LLM model
export const useDefaultLLMModel = () => {
  return useQuery({
    queryKey: ['llm-models', 'default'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('llm_models')
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as LLMModel;
    },
  });
};

// Fetch workspace LLM configuration
export const useWorkspaceLLMConfig = () => {
  const { workspace } = useAuth();

  return useQuery({
    queryKey: ['workspace-llm-config', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];

      const { data, error } = await supabase
        .from('workspace_llm_config')
        .select('*')
        .eq('workspace_id', workspace.id);

      if (error) throw error;
      return data as WorkspaceLLMConfig[];
    },
    enabled: !!workspace?.id,
  });
};

// Update workspace LLM configuration
export const useUpdateWorkspaceLLMConfig = () => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useMutation({
    mutationFn: async (config: Partial<WorkspaceLLMConfig> & { provider: string }) => {
      if (!workspace?.id) throw new Error('No workspace');

      const { data, error } = await supabase
        .from('workspace_llm_config')
        .upsert({
          workspace_id: workspace.id,
          provider: config.provider,
          api_key_encrypted: config.api_key_encrypted,
          base_url: config.base_url,
          is_enabled: config.is_enabled ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-llm-config', workspace?.id] });
    },
  });
};

// Provider display info (OpenAI-only for simplicity)
export const LLM_PROVIDER_INFO: Record<string, { name: string; description: string; icon: string }> = {
  openai: {
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4o Mini, GPT-4 Turbo, and GPT-3.5 Turbo',
    icon: '🤖',
  },
};

// OpenAI model recommendations
export const OPENAI_MODEL_RECOMMENDATIONS: Record<string, string> = {
  'gpt-4o': 'Best for complex reasoning and vision tasks',
  'gpt-4o-mini': 'Recommended - Fast, affordable, great for most use cases',
  'gpt-4-turbo': 'Powerful with large context window',
  'gpt-3.5-turbo': 'Most affordable, good for simple conversations',
};
