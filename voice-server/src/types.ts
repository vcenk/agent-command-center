import type { LiveClient } from '@deepgram/sdk';

/** Message in the call transcript */
export interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/** OpenAI chat message format */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** Active call session state */
export interface CallSession {
  callId: string;
  agentId: string;
  workspaceId: string;
  callSid: string;
  streamSid: string;

  // Agent context
  systemPrompt: string;
  llmModel: string;
  temperature: number;

  // Conversation state
  conversationHistory: ChatMessage[];
  transcript: TranscriptMessage[];

  // Deepgram connection
  deepgramConnection: LiveClient | null;

  // Processing flag — prevents overlapping LLM calls
  isProcessing: boolean;

  // Timing
  startedAt: Date;

  // Escalation config
  escalationToHuman: boolean;
  escalationNumber?: string;
}

/** Agent record from Supabase */
export interface AgentRecord {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
  goals: string | null;
  business_domain: string | null;
  persona_id: string | null;
  knowledge_source_ids: string[] | null;
  llm_model_id: string | null;
  llm_temperature: number | null;
  llm_max_tokens: number | null;
  llm_model?: {
    id: string;
    model_id: string;
    provider: string;
  } | null;
}

/** Persona record from Supabase */
export interface PersonaRecord {
  id: string;
  name: string;
  role_title: string;
  tone: string;
  greeting_script: string | null;
  style_notes: string | null;
  do_not_do: string[] | null;
  fallback_policy: string;
  escalation_rules: string | null;
}

/** Twilio Media Stream WebSocket message types */
export interface TwilioMediaMessage {
  event: 'connected' | 'start' | 'media' | 'stop' | 'mark';
  sequenceNumber?: string;
  streamSid?: string;
  start?: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // base64-encoded audio
  };
  mark?: {
    name: string;
  };
  stop?: {
    accountSid: string;
    callSid: string;
  };
}
