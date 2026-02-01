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
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Single-flight refresh lock to prevent refresh storms
let refreshPromise: Promise<string | null> | null = null;

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
 * Get a valid access token - relies on Supabase's autoRefreshToken
 * Uses single-flight pattern to prevent refresh storms
 */
async function getValidAccessToken(): Promise<string> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    const token = await refreshPromise;
    if (token) return token;
  }

  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('[API] Error getting session:', sessionError);
    throw new ApiError('Authentication error', 401);
  }

  if (!session?.access_token) {
    console.warn('[API] No session found - user not logged in');
    throw new ApiError('Not authenticated. Please log in.', 401);
  }

  // Check if token is about to expire (within 30 seconds)
  // If so, trigger a refresh but use single-flight pattern
  if (session.expires_at) {
    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    const bufferTime = 30 * 1000;

    if (expiresAt <= now + bufferTime) {
      // Token is expired or expiring - trigger single-flight refresh
      refreshPromise = (async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error || !data.session?.access_token) {
            console.error('[API] Refresh failed:', error?.message);
            return null;
          }
          return data.session.access_token;
        } finally {
          refreshPromise = null;
        }
      })();

      const newToken = await refreshPromise;
      if (newToken) return newToken;

      // Refresh failed - throw error
      throw new ApiError('Session expired. Please log in again.', 401);
    }
  }

  return session.access_token;
}

/**
 * Make an authenticated request to an Edge Function
 */
async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken();
  } catch (error) {
    throw error;
  }

  const url = `${FUNCTIONS_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY, // Required by Supabase Functions gateway
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 - don't retry, let the user re-login
  if (response.status === 401) {
    let errorInfo = '';
    try {
      const errorText = await response.clone().text();
      errorInfo = errorText;
    } catch {
      // Ignore
    }

    console.error(`[API] 401 on ${method} ${endpoint}:`, errorInfo);

    // If it's "Invalid JWT" from the gateway, the session is corrupted
    if (errorInfo.includes('Invalid JWT')) {
      // Sign out to clear the bad session
      await supabase.auth.signOut();
    }

    throw new ApiError('Session expired. Please log in again.', 401);
  }

  // Safely parse JSON response
  let data: unknown;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError('Invalid response format from server', response.status);
  }

  if (!response.ok) {
    const errorData = data as { error?: string };
    console.error(`[API] Error ${response.status} on ${method} ${endpoint}:`, errorData);
    throw new ApiError(errorData.error || 'Request failed', response.status);
  }

  return data as T;
}

// =====================================================
// WORKSPACES API
// =====================================================

export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export type Role = 'OWNER' | 'MANAGER' | 'VIEWER';

export const workspacesApi = {
  list: () => request<Array<{ workspace: Workspace; role: Role }>>('/workspaces'),

  create: (name: string) =>
    request<Workspace>('/workspaces', { method: 'POST', body: { name } }),

  switch: (workspaceId: string) =>
    request<{ workspace: Workspace; role: Role }>(`/workspaces/${workspaceId}`, { method: 'PATCH' }),
};

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

  getChunks: (sourceId: string) =>
    request<{ id: string; source_id: string; content: string; chunk_index: number; created_at: string }[]>(
      `/knowledge/${sourceId}/chunks`
    ),
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

// =====================================================
// SESSIONS API
// =====================================================

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

export interface ChatSessionFilters {
  agentId?: string;
  status?: string;
  channel?: string;
  limit?: number;
  offset?: number;
}

export const sessionsApi = {
  list: (filters?: ChatSessionFilters) => {
    const params = new URLSearchParams();
    if (filters?.agentId && filters.agentId !== 'all') params.set('agentId', filters.agentId);
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.channel && filters.channel !== 'all') params.set('channel', filters.channel);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const query = params.toString();
    return request<ChatSession[]>(`/sessions${query ? `?${query}` : ''}`);
  },

  get: (id: string) => request<ChatSession>(`/sessions/${id}`),

  update: (id: string, updates: Partial<Pick<ChatSession, 'status' | 'internal_note' | 'summary'>>) =>
    request<ChatSession>(`/sessions/${id}`, { method: 'PATCH', body: updates }),
};

// =====================================================
// LEADS API
// =====================================================

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

export interface LeadFilters {
  agentId?: string;
  channel?: string;
  dateRange?: '7' | '30' | '90' | 'all';
  search?: string;
}

export const leadsApi = {
  list: (filters?: LeadFilters) => {
    const params = new URLSearchParams();
    if (filters?.agentId && filters.agentId !== 'all') params.set('agentId', filters.agentId);
    if (filters?.channel && filters.channel !== 'all') params.set('channel', filters.channel);
    if (filters?.dateRange && filters.dateRange !== 'all') params.set('dateRange', filters.dateRange);
    if (filters?.search) params.set('search', filters.search);
    const query = params.toString();
    return request<Lead[]>(`/leads${query ? `?${query}` : ''}`);
  },

  get: (id: string) => request<Lead>(`/leads/${id}`),

  getBySession: (sessionId: string) => request<Lead | null>(`/leads/by-session/${sessionId}`),
};

// =====================================================
// CHANNEL CONFIGS API
// =====================================================

export interface ChannelConfig {
  id: string;
  agent_id: string;
  channel: string;
  greeting: string;
  voicemail_fallback: boolean;
  business_hours: string;
  escalation_to_human: boolean;
  provider: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export const channelConfigsApi = {
  list: (agentId: string) => request<ChannelConfig[]>(`/channel-configs?agentId=${agentId}`),

  upsert: (config: Omit<ChannelConfig, 'id' | 'created_at' | 'updated_at'>) =>
    request<ChannelConfig>('/channel-configs', { method: 'POST', body: config }),
};

// =====================================================
// CALLS API (Voice AI / Twilio)
// =====================================================

export interface Call {
  id: string;
  workspace_id: string;
  agent_id: string;
  twilio_call_sid: string | null;
  from_number: string;
  to_number: string;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'busy' | 'transferred' | 'voicemail';
  duration: number | null;
  recording_url: string | null;
  recording_sid: string | null;
  recording_duration: number | null;
  transcript: Array<{ role: string; content: string; timestamp?: string }>;
  summary: string | null;
  started_at: string | null;
  ended_at: string | null;
  transferred_to: string | null;
  transfer_reason: string | null;
  lead_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  agents?: { id: string; name: string } | null;
}

export interface CallFilters {
  agentId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export const callsApi = {
  list: (filters?: CallFilters) => {
    const params = new URLSearchParams();
    if (filters?.agentId && filters.agentId !== 'all') params.set('agentId', filters.agentId);
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const query = params.toString();
    return request<Call[]>(`/voice/calls${query ? `?${query}` : ''}`);
  },

  get: (id: string) => request<Call>(`/voice/calls/${id}`),
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
  sessions: sessionsApi,
  leads: leadsApi,
  channelConfigs: channelConfigsApi,
  calls: callsApi,
};

export { ApiError };
