import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { sessionsApi, ChatSession, ChatSessionFilters, ApiError } from '@/lib/api';

export type { ChatSession, ChatSessionFilters };

export interface ChatSessionWithAgent extends ChatSession {
  agents?: { id: string; name: string } | null;
}

export const useChatSessions = (filters?: ChatSessionFilters) => {
  const { workspace, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['chat-sessions', workspace?.id, filters],
    queryFn: async () => {
      // Uses secure Edge Function - no direct DB access
      const data = await sessionsApi.list(filters);
      return data as ChatSessionWithAgent[];
    },
    enabled: !!workspace?.id && isAuthenticated,
  });
};

export const useChatSession = (id: string | undefined) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['chat-session', id],
    queryFn: async () => {
      if (!id) return null;
      // Uses secure Edge Function - no direct DB access
      const data = await sessionsApi.get(id);
      return data as ChatSessionWithAgent | null;
    },
    enabled: !!id && isAuthenticated,
  });
};

export const useUpdateChatSession = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<ChatSession, 'status' | 'internal_note'>> }) => {
      // Uses secure Edge Function - validates ownership server-side
      return await sessionsApi.update(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', variables.id] });
      toast({ title: 'Session updated', description: 'Your changes have been saved.' });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to update session';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });
};
