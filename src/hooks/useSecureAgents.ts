/**
 * Secure Agents Hook
 *
 * This hook uses the Edge Functions API instead of direct database access.
 * Use this after deploying the secure RLS migration and Edge Functions.
 *
 * Migration guide:
 * 1. Deploy Edge Functions: supabase functions deploy
 * 2. Apply secure RLS migration: supabase db push
 * 3. Replace `useAgents` imports with `useSecureAgents`
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi, Agent, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export type { Agent };

export function useSecureAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
  });
}

export function useSecureAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['agent', id],
    queryFn: () => agentsApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateSecureAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (agent: Omit<Agent, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) =>
      agentsApi.create(agent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Agent created', description: 'Your agent has been created successfully.' });
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSecureAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Agent> & { id: string }) =>
      agentsApi.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', data.id] });
      toast({ title: 'Agent updated', description: 'Your changes have been saved.' });
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSecureAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => agentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Agent deleted', description: 'The agent has been removed.' });
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
