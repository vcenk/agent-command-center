import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { secureApi } from '@/lib/api';

export interface AgentTool {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  tool_type: 'webhook' | 'calendar_booking' | 'email_send' | 'human_transfer' | 'knowledge_search' | 'lead_capture' | 'custom';
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  config: Record<string, unknown>;
  is_enabled: boolean;
  rate_limit: number;
  timeout_seconds: number;
  created_at: string;
  updated_at: string;
  agent?: {
    id: string;
    name: string;
    workspace_id: string;
  };
}

export type CreateAgentToolInput = Omit<AgentTool, 'id' | 'created_at' | 'updated_at' | 'agent'>;
export type UpdateAgentToolInput = Partial<CreateAgentToolInput>;

// Fetch tools for a specific agent
export const useAgentTools = (agentId?: string) => {
  const { workspace } = useAuth();

  return useQuery({
    queryKey: ['agent-tools', agentId],
    queryFn: async () => {
      const url = agentId ? `/tools?agent_id=${agentId}` : '/tools';
      const data = await secureApi.get<AgentTool[]>(url);
      return data;
    },
    enabled: !!workspace,
  });
};

// Fetch a single tool by ID
export const useAgentTool = (toolId: string) => {
  const { workspace } = useAuth();

  return useQuery({
    queryKey: ['agent-tool', toolId],
    queryFn: async () => {
      const data = await secureApi.get<AgentTool>(`/tools/${toolId}`);
      return data;
    },
    enabled: !!workspace && !!toolId,
  });
};

// Create a new tool
export const useCreateAgentTool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tool: CreateAgentToolInput) => {
      const data = await secureApi.post<AgentTool>('/tools', tool);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-tools', variables.agent_id] });
      queryClient.invalidateQueries({ queryKey: ['agent-tools'] });
    },
  });
};

// Update a tool
export const useUpdateAgentTool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateAgentToolInput & { id: string }) => {
      const data = await secureApi.put<AgentTool>(`/tools/${id}`, updates);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-tools', data.agent_id] });
      queryClient.invalidateQueries({ queryKey: ['agent-tools'] });
      queryClient.invalidateQueries({ queryKey: ['agent-tool', data.id] });
    },
  });
};

// Delete a tool
export const useDeleteAgentTool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId: string }) => {
      await secureApi.delete(`/tools/${id}`);
      return { id, agentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-tools', data.agentId] });
      queryClient.invalidateQueries({ queryKey: ['agent-tools'] });
    },
  });
};

// Toggle tool enabled status
export const useToggleAgentTool = () => {
  const updateTool = useUpdateAgentTool();

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      return updateTool.mutateAsync({ id, is_enabled });
    },
  });
};

// Tool type display info
export const TOOL_TYPE_INFO: Record<AgentTool['tool_type'], { label: string; description: string; icon: string }> = {
  webhook: {
    label: 'Webhook',
    description: 'Call an external API endpoint',
    icon: '🔗',
  },
  calendar_booking: {
    label: 'Calendar Booking',
    description: 'Book appointments via calendar integration',
    icon: '📅',
  },
  email_send: {
    label: 'Send Email',
    description: 'Send emails to users or team members',
    icon: '📧',
  },
  human_transfer: {
    label: 'Human Transfer',
    description: 'Escalate conversation to a human agent',
    icon: '👤',
  },
  knowledge_search: {
    label: 'Knowledge Search',
    description: 'Search the knowledge base for information',
    icon: '📚',
  },
  lead_capture: {
    label: 'Lead Capture',
    description: 'Explicitly capture lead information',
    icon: '🎯',
  },
  custom: {
    label: 'Custom Function',
    description: 'Custom user-defined function',
    icon: '⚙️',
  },
};
