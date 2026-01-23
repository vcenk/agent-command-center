/**
 * Secure API Client
 *
 * This client routes all database operations through Edge Functions.
 * The frontend NEVER talks directly to the database.
 *
 * Security benefits:
 * 1. Backend validates all requests with service_role key
 * 2. User tokens are verified before any data access
 * 3. Workspace isolation is enforced server-side
 * 4. Role-based permissions are checked server-side
 * 5. No RLS policy bugs can expose data
 */

import { supabase } from '@/integrations/supabase/client';

// Base URL for Edge Functions
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Make an authenticated request to an Edge Function
 */
async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  // Get the current session token
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ApiError('Not authenticated', 401);
  }

  const response = await fetch(`${FUNCTIONS_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.error || 'Request failed', response.status);
  }

  return data as T;
}

// =====================================================
// AGENTS API
// =====================================================

export interface Agent {
  id: string;
  workspace_id: string;
  name: string;
  business_domain: 'healthcare' | 'retail' | 'finance' | 'realestate' | 'hospitality' | 'other';
  persona_id: string | null;
  channels: {
    webChat: boolean;
    phone: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  goals: string | null;
  allowed_actions: string[] | null;
  knowledge_source_ids: string[] | null;
  status: 'draft' | 'live';
  llm_model_id: string | null;
  llm_temperature: number | null;
  llm_max_tokens: number | null;
  created_at: string;
  updated_at: string;
}

export const agentsApi = {
  list: () => request<Agent[]>('/agents'),

  get: (id: string) => request<Agent>(`/agents/${id}`),

  create: (agent: Omit<Agent, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) =>
    request<Agent>('/agents', { method: 'POST', body: agent }),

  update: (id: string, updates: Partial<Agent>) =>
    request<Agent>(`/agents/${id}`, { method: 'PATCH', body: updates }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/agents/${id}`, { method: 'DELETE' }),
};

// =====================================================
// PERSONAS API
// =====================================================

export interface Persona {
  id: string;
  workspace_id: string;
  name: string;
  role_title: string;
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  greeting_script: string | null;
  style_notes: string | null;
  do_not_do: string[] | null;
  fallback_policy: 'apologize' | 'escalate' | 'retry' | 'transfer';
  escalation_rules: string | null;
  created_at: string;
  updated_at: string;
}

export const personasApi = {
  list: () => request<Persona[]>('/personas'),

  get: (id: string) => request<Persona>(`/personas/${id}`),

  create: (persona: Omit<Persona, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) =>
    request<Persona>('/personas', { method: 'POST', body: persona }),

  update: (id: string, updates: Partial<Persona>) =>
    request<Persona>(`/personas/${id}`, { method: 'PATCH', body: updates }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/personas/${id}`, { method: 'DELETE' }),
};

// =====================================================
// KNOWLEDGE SOURCES API
// =====================================================

export interface KnowledgeSource {
  id: string;
  workspace_id: string;
  name: string;
  type: 'PDF' | 'URL' | 'TEXT';
  url: string | null;
  file_name: string | null;
  raw_text: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export const knowledgeApi = {
  list: () => request<KnowledgeSource[]>('/knowledge'),

  get: (id: string) => request<KnowledgeSource>(`/knowledge/${id}`),

  create: (source: Omit<KnowledgeSource, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) =>
    request<KnowledgeSource>('/knowledge', { method: 'POST', body: source }),

  update: (id: string, updates: Partial<KnowledgeSource>) =>
    request<KnowledgeSource>(`/knowledge/${id}`, { method: 'PATCH', body: updates }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/knowledge/${id}`, { method: 'DELETE' }),
};

// =====================================================
// INTEGRATIONS API
// =====================================================

export interface Integration {
  id?: string;
  provider: string;
  status: 'pending' | 'connected' | 'error' | 'disconnected';
  config?: Record<string, unknown>;
  settings: Record<string, unknown>;
  connected_at: string | null;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export const integrationsApi = {
  list: () => request<Integration[]>('/integrations'),

  get: (provider: string) => request<Integration>(`/integrations/${provider}`),

  connect: (provider: string) =>
    request<{ authorizeUrl: string }>(`/integrations/${provider}/connect`, { method: 'POST', body: {} }),

  updateSettings: (provider: string, settings: Record<string, unknown>) =>
    request<Integration>(`/integrations/${provider}/settings`, { method: 'PATCH', body: { settings } }),

  disconnect: (provider: string) =>
    request<{ success: boolean }>(`/integrations/${provider}`, { method: 'DELETE' }),
};

// =====================================================
// CALENDAR API
// =====================================================

export interface CalendarSlot {
  start: string;
  end: string;
}

export interface CalendarBooking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendeeEmail: string;
  calendarEventCreated: boolean;
}

export const calendarApi = {
  getAvailability: (workspaceId: string, date: string, agentId?: string) =>
    request<{ slots: CalendarSlot[]; source: string }>(
      `/calendar/availability?workspaceId=${workspaceId}&date=${date}${agentId ? `&agentId=${agentId}` : ''}`
    ),

  book: (data: {
    workspaceId: string;
    agentId: string;
    sessionId: string;
    startTime: string;
    endTime?: string;
    title?: string;
    description?: string;
    attendeeName?: string;
    attendeeEmail: string;
    attendeePhone?: string;
  }) => request<{ success: boolean; booking: CalendarBooking }>('/calendar/book', { method: 'POST', body: data }),

  cancel: (bookingId: string) =>
    request<{ success: boolean }>(`/calendar/bookings/${bookingId}`, { method: 'DELETE' }),
};

// =====================================================
// Generic Secure API Client
// =====================================================

export const secureApi = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PUT', body }),
  patch: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

// =====================================================
// Export all APIs
// =====================================================

export const api = {
  agents: agentsApi,
  personas: personasApi,
  knowledge: knowledgeApi,
  integrations: integrationsApi,
  calendar: calendarApi,
};

export { ApiError };
