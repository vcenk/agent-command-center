import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { personasApi, ApiError } from '@/lib/api';

export interface PersonaRow {
  id: string;
  workspace_id: string;
  name: string;
  role_title: string;
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  style_notes: string | null;
  do_not_do: string[] | null;
  greeting_script: string | null;
  fallback_policy: 'apologize' | 'escalate' | 'retry' | 'transfer';
  escalation_rules: string | null;
  created_at: string;
  updated_at: string;
}

export function usePersonas() {
  const { workspace, isAuthenticated } = useAuth();
  const workspaceId = workspace?.id;

  return useQuery({
    queryKey: ['personas', workspaceId],
    queryFn: async () => {
      // Uses secure Edge Function - no direct DB access
      const data = await personasApi.list();
      return data as PersonaRow[];
    },
    enabled: !!workspaceId && isAuthenticated,
  });
}

export function usePersona(id: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['persona', id],
    queryFn: async () => {
      if (!id) return null;
      // Uses secure Edge Function - no direct DB access
      const data = await personasApi.get(id);
      return data as PersonaRow | null;
    },
    enabled: !!id && isAuthenticated,
  });
}

export function useCreatePersona() {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (persona: Omit<PersonaRow, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => {
      if (!workspace?.id) throw new Error('No workspace selected');
      // Uses secure Edge Function - workspace_id is set server-side from auth token
      return await personasApi.create(persona);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      toast({ title: 'Persona created', description: 'Your persona has been created successfully.' });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to create persona';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });
}

export function useUpdatePersona() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PersonaRow> & { id: string }) => {
      // Uses secure Edge Function - validates ownership server-side
      return await personasApi.update(id, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      queryClient.invalidateQueries({ queryKey: ['persona', data.id] });
      toast({ title: 'Persona updated', description: 'Your changes have been saved.' });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to update persona';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });
}

export function useDeletePersona() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Uses secure Edge Function - validates ownership server-side
      await personasApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      toast({ title: 'Persona deleted', description: 'The persona has been removed.' });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to delete persona';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });
}
