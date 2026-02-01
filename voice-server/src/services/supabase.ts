import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import type { AgentRecord, PersonaRecord, TranscriptMessage } from '../types';

let supabase: SupabaseClient;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  }
  return supabase;
}

/**
 * Load full agent config with persona and LLM model info
 */
export async function loadAgentConfig(agentId: string): Promise<{
  agent: AgentRecord;
  persona: PersonaRecord | null;
  knowledgeChunks: string[];
  escalationNumber: string | null;
}> {
  const db = getSupabaseClient();

  // Load agent with LLM model
  const { data: agent, error: agentError } = await db
    .from('agents')
    .select(`
      *,
      llm_model:llm_models(id, model_id, provider)
    `)
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // Load persona if configured
  let persona: PersonaRecord | null = null;
  if (agent.persona_id) {
    const { data: personaData } = await db
      .from('personas')
      .select('*')
      .eq('id', agent.persona_id)
      .single();

    persona = personaData;
  }

  // Load knowledge chunks (get a representative set for context)
  let knowledgeChunks: string[] = [];
  if (agent.knowledge_source_ids && agent.knowledge_source_ids.length > 0) {
    const { data: chunks } = await db
      .from('knowledge_chunks')
      .select('content')
      .in('source_id', agent.knowledge_source_ids)
      .limit(10);

    if (chunks) {
      knowledgeChunks = chunks.map((c: { content: string }) => c.content);
    }
  }

  // Load escalation phone number from channel config
  let escalationNumber: string | null = null;
  const { data: channelConfig } = await db
    .from('channel_configs')
    .select('escalation_to_human, phone_number')
    .eq('agent_id', agentId)
    .eq('channel', 'phone')
    .maybeSingle();

  if (channelConfig?.escalation_to_human) {
    // For now, use the same phone number or a configured escalation number
    // In production, this would be a separate field in channel_configs
    escalationNumber = channelConfig.phone_number;
  }

  return { agent, persona, knowledgeChunks, escalationNumber };
}

/**
 * Update a call record in the database
 */
export async function updateCallRecord(
  callId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const db = getSupabaseClient();

  const { error } = await db
    .from('calls')
    .update(updates)
    .eq('id', callId);

  if (error) {
    console.error(`Failed to update call ${callId}:`, error);
  }
}

/**
 * Save final transcript and end the call
 */
export async function finalizeCall(
  callId: string,
  transcript: TranscriptMessage[],
  duration: number
): Promise<void> {
  await updateCallRecord(callId, {
    status: 'completed',
    transcript,
    duration,
    ended_at: new Date().toISOString(),
  });
}

/**
 * Mark stale in-progress calls as failed (cleanup on startup)
 */
export async function cleanupStaleCalls(): Promise<void> {
  const db = getSupabaseClient();

  const { data, error } = await db
    .from('calls')
    .update({
      status: 'failed',
      ended_at: new Date().toISOString(),
      metadata: { cleanup_reason: 'server_restart' },
    })
    .in('status', ['ringing', 'in-progress'])
    .is('ended_at', null)
    .select('id');

  if (error) {
    console.error('Failed to cleanup stale calls:', error);
  } else if (data && data.length > 0) {
    console.log(`Cleaned up ${data.length} stale call(s)`);
  }
}
