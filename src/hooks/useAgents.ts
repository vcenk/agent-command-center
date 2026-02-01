import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { agentsApi, ApiError } from '@/lib/api';

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
  llm_model_id: string | null;
  llm_temperature: number | null;
  llm_max_tokens: number | null;
  created_at: string;
  updated_at: string;
}

export function useAgents() {
  const { workspace, isAuthenticated } = useAuth();
  const workspaceId = workspace?.id;

  return useQuery({
    queryKey: ['agents', workspaceId],
    queryFn: async () => {
      // Uses secure Edge Function - no direct DB access
      const data = await agentsApi.list();
      return data as AgentRow[];
    },
    enabled: !!workspaceId && isAuthenticated,
  });
}

export function useAgent(id: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['agent', id],
    queryFn: async () => {
      if (!id) return null;
      // Uses secure Edge Function - no direct DB access
      const data = await agentsApi.get(id);
      return data as AgentRow | null;
    },
    enabled: !!id && isAuthenticated,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (agent: Omit<AgentRow, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => {
      if (!workspace?.id) throw new Error('No workspace selected');
      // Uses secure Edge Function - workspace_id is set server-side from auth token
      return await agentsApi.create(agent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Agent created', description: 'Your agent has been created successfully.' });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to create agent';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgentRow> & { id: string }) => {
      // Uses secure Edge Function - validates ownership server-side
      return await agentsApi.update(id, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', data.id] });
      toast({ title: 'Agent updated', description: 'Your changes have been saved.' });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to update agent';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Uses secure Edge Function - validates ownership server-side
      await agentsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Agent deleted', description: 'The agent has been removed.' });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to delete agent';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });
}
