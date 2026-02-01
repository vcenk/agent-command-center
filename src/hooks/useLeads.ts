import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { leadsApi, Lead, LeadFilters } from '@/lib/api';

export type { Lead, LeadFilters };

export interface LeadWithAgent extends Lead {
  agents?: { id: string; name: string } | null;
}

export const useLeads = (filters?: LeadFilters) => {
  const { workspace, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['leads', workspace?.id, filters],
    queryFn: async () => {
      // Uses secure Edge Function - no direct DB access
      const data = await leadsApi.list(filters);
      return data as LeadWithAgent[];
    },
    enabled: !!workspace?.id && isAuthenticated,
  });
};

export const useLeadBySession = (sessionId: string | undefined) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['lead-by-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      // Uses secure Edge Function - no direct DB access
      return await leadsApi.getBySession(sessionId);
    },
    enabled: !!sessionId && isAuthenticated,
  });
};
