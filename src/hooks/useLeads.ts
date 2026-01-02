import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Lead {
  id: string;
  workspace_id: string;
  agent_id: string;
  session_id: string | null;
  channel: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadWithAgent extends Lead {
  agents: { id: string; name: string } | null;
}

export interface LeadFilters {
  agentId?: string;
  channel?: string;
  dateRange?: '7' | '30' | '90' | 'all';
  search?: string;
}

export const useLeads = (filters?: LeadFilters) => {
  const { workspace } = useAuth();

  return useQuery({
    queryKey: ['leads', workspace?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*, agents(id, name)')
        .eq('workspace_id', workspace!.id)
        .order('created_at', { ascending: false });

      if (filters?.agentId && filters.agentId !== 'all') {
        query = query.eq('agent_id', filters.agentId);
      }
      
      if (filters?.channel && filters.channel !== 'all') {
        query = query.eq('channel', filters.channel);
      }
      
      if (filters?.dateRange && filters.dateRange !== 'all') {
        const days = parseInt(filters.dateRange);
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        query = query.gte('created_at', fromDate.toISOString());
      }
      
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`email.ilike.${searchTerm},phone.ilike.${searchTerm},name.ilike.${searchTerm}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform the array response - agents comes as array with single item from join
      return (data || []).map(lead => ({
        ...lead,
        agents: Array.isArray(lead.agents) ? lead.agents[0] || null : lead.agents,
      })) as LeadWithAgent[];
    },
    enabled: !!workspace?.id,
  });
};

export const useLeadBySession = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: ['lead-by-session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();
      if (error) throw error;
      return data as Lead | null;
    },
    enabled: !!sessionId,
  });
};