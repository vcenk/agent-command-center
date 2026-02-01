import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { channelConfigsApi, ChannelConfig, ApiError } from '@/lib/api';

export type ChannelConfigRow = ChannelConfig;

export function useChannelConfigs(agentId: string | undefined) {
  return useQuery({
    queryKey: ['channel_configs', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      // Uses secure Edge Function - no direct DB access
      const data = await channelConfigsApi.list(agentId);
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
      // Uses secure Edge Function - validates ownership server-side
      return await channelConfigsApi.upsert(config);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['channel_configs', data.agent_id] });
      toast({ title: 'Channel configured', description: 'Channel settings saved successfully.' });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to save channel config';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });
}
