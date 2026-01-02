import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChannelConfigRow {
  id: string;
  agent_id: string;
  channel: string;
  greeting: string;
  voicemail_fallback: boolean;
  business_hours: string;
  escalation_to_human: boolean;
  provider: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export function useChannelConfigs(agentId: string | undefined) {
  return useQuery({
    queryKey: ['channel_configs', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      
      const { data, error } = await supabase
        .from('channel_configs')
        .select('*')
        .eq('agent_id', agentId);

      if (error) throw error;
      return data as ChannelConfigRow[];
    },
    enabled: !!agentId,
  });
}

export function useUpsertChannelConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: Omit<ChannelConfigRow, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('channel_configs')
        .upsert(config, { onConflict: 'agent_id,channel' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['channel_configs', data.agent_id] });
      toast({ title: 'Channel configured', description: 'Channel settings saved successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
