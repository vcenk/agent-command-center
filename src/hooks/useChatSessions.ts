import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChatSession {
  id: string;
  workspace_id: string;
  agent_id: string;
  session_id: string;
  messages: { role: string; content: string }[];
  status: string;
  channel: string | null;
  last_message: string | null;
  last_message_at: string | null;
  internal_note: string | null;
  summary: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  lead_captured: boolean | null;
  lead_id: string | null;
}

export interface ChatSessionWithAgent extends ChatSession {
  agents: { id: string; name: string } | null;
}

export const useChatSessions = (filters?: { agentId?: string; status?: string; channel?: string }) => {
  const { workspace } = useAuth();

  return useQuery({
    queryKey: ['chat-sessions', workspace?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('chat_sessions')
        .select('*, agents(id, name)')
        .eq('workspace_id', workspace!.id)
        .order('updated_at', { ascending: false });

      if (filters?.agentId && filters.agentId !== 'all') {
        query = query.eq('agent_id', filters.agentId);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.channel && filters.channel !== 'all') {
        query = query.eq('channel', filters.channel);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Cast messages from Json to proper type
      return (data || []).map(session => ({
        ...session,
        messages: (session.messages as unknown as { role: string; content: string }[]) || [],
      })) as ChatSessionWithAgent[];
    },
    enabled: !!workspace?.id,
  });
};

export const useChatSession = (id: string | undefined) => {
  return useQuery({
    queryKey: ['chat-session', id],
    queryFn: async () => {
      // First try to find by id (primary key), then by session_id
      let { data, error } = await supabase
        .from('chat_sessions')
        .select('*, agents(id, name)')
        .eq('id', id)
        .maybeSingle();
      
      // If not found by id, try session_id
      if (!data && !error) {
        const result = await supabase
          .from('chat_sessions')
          .select('*, agents(id, name)')
          .eq('session_id', id)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }
      
      if (error) throw error;
      if (!data) return null;
      
      // Cast messages from Json to proper type
      return {
        ...data,
        messages: (data.messages as unknown as { role: string; content: string }[]) || [],
      } as ChatSessionWithAgent;
    },
    enabled: !!id,
  });
};

export const useUpdateChatSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<ChatSession, 'status' | 'internal_note'>> }) => {
      const { data, error } = await supabase
        .from('chat_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', variables.id] });
      toast.success('Session updated');
    },
    onError: (error) => {
      toast.error('Failed to update session: ' + error.message);
    },
  });
};
