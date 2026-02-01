import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { callsApi, Call, CallFilters } from '@/lib/api';

export type { Call, CallFilters };

export interface CallWithAgent extends Call {
  agents?: { id: string; name: string } | null;
}

export const useCalls = (filters?: CallFilters) => {
  const { workspace, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['calls', workspace?.id, filters],
    queryFn: async () => {
      const data = await callsApi.list(filters);
      return data as CallWithAgent[];
    },
    enabled: !!workspace?.id && isAuthenticated,
  });
};

export const useCall = (id: string | undefined) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['call', id],
    queryFn: async () => {
      if (!id) return null;
      return await callsApi.get(id) as CallWithAgent | null;
    },
    enabled: !!id && isAuthenticated,
  });
};
