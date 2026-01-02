import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AgentRow {
  id: string;
  workspace_id: string;
  name: string;
  business_domain: 'healthcare' | 'retail' | 'finance' | 'realestate' | 'hospitality' | 'other';
  persona_id: string | null;
  channels: {
    webChat: boolean;
    phone: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  goals: string | null;
  allowed_actions: string[] | null;
  knowledge_source_ids: string[] | null;
  status: 'draft' | 'live';
  created_at: string;
  updated_at: string;
}

export function useAgents() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id;

  return useQuery({
    queryKey: ['agents', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AgentRow[];
    },
    enabled: !!workspaceId,
  });
}

export function useAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['agent', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as AgentRow | null;
    },
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (agent: Omit<AgentRow, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => {
      if (!workspace?.id) throw new Error('No workspace selected');

      const { data, error } = await supabase
        .from('agents')
        .insert({
          ...agent,
          workspace_id: workspace.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Agent created', description: 'Your agent has been created successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgentRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', data.id] });
      toast({ title: 'Agent updated', description: 'Your changes have been saved.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Agent deleted', description: 'The agent has been removed.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
