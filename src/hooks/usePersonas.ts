import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const { workspace } = useAuth();
  const workspaceId = workspace?.id;

  return useQuery({
    queryKey: ['personas', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PersonaRow[];
    },
    enabled: !!workspaceId,
  });
}

export function usePersona(id: string | undefined) {
  return useQuery({
    queryKey: ['persona', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as PersonaRow | null;
    },
    enabled: !!id,
  });
}

export function useCreatePersona() {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (persona: Omit<PersonaRow, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => {
      if (!workspace?.id) throw new Error('No workspace selected');

      const { data, error } = await supabase
        .from('personas')
        .insert({
          ...persona,
          workspace_id: workspace.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      toast({ title: 'Persona created', description: 'Your persona has been created successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdatePersona() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PersonaRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('personas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      queryClient.invalidateQueries({ queryKey: ['persona', data.id] });
      toast({ title: 'Persona updated', description: 'Your changes have been saved.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeletePersona() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      toast({ title: 'Persona deleted', description: 'The persona has been removed.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
