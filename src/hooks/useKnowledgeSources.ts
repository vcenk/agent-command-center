import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface KnowledgeSourceRow {
  id: string;
  workspace_id: string;
  name: string;
  type: 'PDF' | 'URL' | 'TEXT';
  url: string | null;
  file_name: string | null;
  raw_text: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface KnowledgeChunkRow {
  id: string;
  source_id: string;
  content: string;
  chunk_index: number;
  created_at: string;
}

// Simple text chunking function
function chunkText(text: string, chunkSize = 1000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

export function useKnowledgeSources() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id;

  return useQuery({
    queryKey: ['knowledge_sources', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KnowledgeSourceRow[];
    },
    enabled: !!workspaceId,
  });
}

export function useKnowledgeSource(id: string | undefined) {
  return useQuery({
    queryKey: ['knowledge_source', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as KnowledgeSourceRow | null;
    },
    enabled: !!id,
  });
}

export function useKnowledgeChunks(sourceId: string | undefined) {
  return useQuery({
    queryKey: ['knowledge_chunks', sourceId],
    queryFn: async () => {
      if (!sourceId) return [];
      
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .select('*')
        .eq('source_id', sourceId)
        .order('chunk_index', { ascending: true });

      if (error) throw error;
      return data as KnowledgeChunkRow[];
    },
    enabled: !!sourceId,
  });
}

export function useCreateKnowledgeSource() {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (source: Omit<KnowledgeSourceRow, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => {
      if (!workspace?.id) throw new Error('No workspace selected');

      // Create the knowledge source
      const { data: sourceData, error: sourceError } = await supabase
        .from('knowledge_sources')
        .insert({
          ...source,
          workspace_id: workspace.id,
        })
        .select()
        .single();

      if (sourceError) throw sourceError;

      // Create chunks from raw_text
      if (source.raw_text) {
        const textChunks = chunkText(source.raw_text);
        const chunkInserts = textChunks.map((content, index) => ({
          source_id: sourceData.id,
          content,
          chunk_index: index,
        }));

        if (chunkInserts.length > 0) {
          const { error: chunkError } = await supabase
            .from('knowledge_chunks')
            .insert(chunkInserts);

          if (chunkError) {
            console.error('Failed to create chunks:', chunkError);
          }
        }
      }

      return sourceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_sources'] });
      toast({ title: 'Knowledge source created', description: 'Your knowledge source has been added.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateKnowledgeSource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KnowledgeSourceRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('knowledge_sources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If raw_text was updated, recreate chunks
      if (updates.raw_text !== undefined) {
        // Delete old chunks
        await supabase.from('knowledge_chunks').delete().eq('source_id', id);

        // Create new chunks
        if (updates.raw_text) {
          const textChunks = chunkText(updates.raw_text);
          const chunkInserts = textChunks.map((content, index) => ({
            source_id: id,
            content,
            chunk_index: index,
          }));

          if (chunkInserts.length > 0) {
            await supabase.from('knowledge_chunks').insert(chunkInserts);
          }
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_sources'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge_source', data.id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge_chunks', data.id] });
      toast({ title: 'Knowledge source updated', description: 'Your changes have been saved.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteKnowledgeSource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('knowledge_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_sources'] });
      toast({ title: 'Knowledge source deleted', description: 'The knowledge source has been removed.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
