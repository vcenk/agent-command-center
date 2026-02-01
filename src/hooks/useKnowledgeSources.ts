import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { knowledgeApi, KnowledgeSource, ApiError } from '@/lib/api';

export type KnowledgeSourceRow = KnowledgeSource;

export interface KnowledgeChunkRow {
  id: string;
  source_id: string;
  content: string;
  chunk_index: number;
  created_at: string;
}

export function useKnowledgeSources() {
  const { workspace, isAuthenticated } = useAuth();
  const workspaceId = workspace?.id;

  return useQuery({
    queryKey: ['knowledge_sources', workspaceId],
    queryFn: async () => {
      // Uses secure Edge Function - no direct DB access
      const data = await knowledgeApi.list();
      return data as KnowledgeSourceRow[];
    },
    enabled: !!workspaceId && isAuthenticated,
  });
}

export function useKnowledgeSource(id: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['knowledge_source', id],
    queryFn: async () => {
      if (!id) return null;
      // Uses secure Edge Function - no direct DB access
      const data = await knowledgeApi.get(id);
      return data as KnowledgeSourceRow | null;
    },
    enabled: !!id && isAuthenticated,
  });
}

export function useCreateKnowledgeSource() {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (source: Omit<KnowledgeSourceRow, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => {
      if (!workspace?.id) throw new Error('No workspace selected');
      // Uses secure Edge Function - workspace_id is set server-side from auth token
      return await knowledgeApi.create(source);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_sources'] });
      toast({ title: 'Knowledge source created', description: 'Your knowledge source has been added.' });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to create knowledge source';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });
}

export function useUpdateKnowledgeSource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KnowledgeSourceRow> & { id: string }) => {
      // Uses secure Edge Function - validates ownership server-side
      return await knowledgeApi.update(id, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_sources'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge_source', data.id] });
      toast({ title: 'Knowledge source updated', description: 'Your changes have been saved.' });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to update knowledge source';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });
}

export function useDeleteKnowledgeSource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Uses secure Edge Function - validates ownership server-side
      await knowledgeApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_sources'] });
      toast({ title: 'Knowledge source deleted', description: 'The knowledge source has been removed.' });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to delete knowledge source';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });
}

export function useKnowledgeChunks(sourceId: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['knowledge_chunks', sourceId],
    queryFn: async () => {
      if (!sourceId) return [];
      const data = await knowledgeApi.getChunks(sourceId);
      return data as KnowledgeChunkRow[];
    },
    enabled: !!sourceId && isAuthenticated,
  });
}
