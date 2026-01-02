import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WidgetConfig {
  id: string;
  agent_id: string;
  enabled: boolean;
  allowed_domains: string[];
  position: 'bottom-right' | 'bottom-left';
  launcher_label: string;
  primary_color: string;
  created_at: string;
  updated_at: string;
}

export const useWidgetConfig = (agentId: string | undefined) => {
  return useQuery({
    queryKey: ['widget-config', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_web_widget_config')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle();
      
      if (error) throw error;
      return data as WidgetConfig | null;
    },
    enabled: !!agentId,
  });
};

export const useCreateWidgetConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const { data, error } = await supabase
        .from('agent_web_widget_config')
        .insert({ agent_id: agentId })
        .select()
        .single();
      
      if (error) throw error;
      return data as WidgetConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['widget-config', data.agent_id] });
      toast.success('Widget configuration created');
    },
    onError: (error) => {
      toast.error('Failed to create widget config: ' + error.message);
    },
  });
};

export const useUpdateWidgetConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<WidgetConfig, 'enabled' | 'allowed_domains' | 'position' | 'launcher_label' | 'primary_color'>>;
    }) => {
      const { data, error } = await supabase
        .from('agent_web_widget_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as WidgetConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['widget-config', data.agent_id] });
      toast.success('Widget configuration updated');
    },
    onError: (error) => {
      toast.error('Failed to update widget config: ' + error.message);
    },
  });
};
