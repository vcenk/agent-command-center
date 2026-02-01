import type { AgentRecord, PersonaRecord } from '../types';

/**
 * Build the system prompt for voice conversations
 * Mirrors the logic in supabase/functions/chat/index.ts with voice-specific additions
 */
export function buildSystemPrompt(
  agent: AgentRecord,
  persona: PersonaRecord | null,
  knowledgeChunks: string[]
): string {
  let systemPrompt = 'You are a helpful AI assistant.';

  // Agent-level prompt
  if (agent) {
    systemPrompt = `You are an AI assistant for ${agent.name}.`;

    if (agent.goals) {
      systemPrompt += `\n\nYour goals: ${agent.goals}`;
    }

    if (agent.business_domain && agent.business_domain !== 'other') {
      systemPrompt += `\n\nYou specialize in ${agent.business_domain}.`;
    }
  }

  // Persona-level prompt (overrides base agent prompt)
  if (persona) {
    systemPrompt = `You are ${persona.name}, ${persona.role_title}.`;

    const toneInstructions: Record<string, string> = {
      professional: 'Maintain a professional and courteous tone in all interactions.',
      friendly: 'Be warm, friendly, and approachable in your responses.',
      casual: 'Keep your responses casual and conversational.',
      formal: 'Use formal language and maintain proper etiquette.',
    };
    systemPrompt += `\n\n${toneInstructions[persona.tone] || toneInstructions.professional}`;

    if (persona.style_notes) {
      systemPrompt += `\n\nStyle guidelines: ${persona.style_notes}`;
    }

    if (persona.greeting_script) {
      systemPrompt += `\n\nWhen greeting callers, say: "${persona.greeting_script}"`;
    }

    if (persona.do_not_do && persona.do_not_do.length > 0) {
      systemPrompt += `\n\nRestrictions - Do NOT:\n- ${persona.do_not_do.join('\n- ')}`;
    }

    const fallbackPolicies: Record<string, string> = {
      apologize: "If you don't know something, apologize politely and offer to help in another way.",
      escalate: "If you cannot help with a request, let the caller know you'll escalate to a human agent.",
      retry: "If you don't understand, ask clarifying questions to better assist the caller.",
      transfer: "If the request is beyond your capabilities, offer to transfer to a human representative.",
    };
    systemPrompt += `\n\n${fallbackPolicies[persona.fallback_policy] || fallbackPolicies.apologize}`;

    if (persona.escalation_rules) {
      systemPrompt += `\n\nEscalation rules: ${persona.escalation_rules}`;
    }
  }

  // Voice-specific instructions
  systemPrompt += `\n\n## Voice Conversation Guidelines:
- You are having a PHONE CONVERSATION. Keep responses concise — 1-3 sentences maximum.
- Speak naturally as if on a phone call. Avoid bullet points, numbered lists, URLs, or formatted text.
- Do not use markdown, code blocks, or special formatting — the caller hears your words spoken aloud.
- Use conversational fillers naturally: "Sure", "Of course", "Let me check on that".
- If the caller says something unclear, ask them to repeat: "I'm sorry, could you say that again?"
- When you need to transfer the caller to a human, include [TRANSFER] in your response followed by the reason.
  Example: "Let me connect you with a team member who can help. [TRANSFER:Customer requests billing support]"
- Pause naturally between thoughts. Do not rush through information.`;

  // Lead capture guidelines
  systemPrompt += `\n\n## Lead Capture Guidelines:
- If the caller asks for a quote, appointment, pricing, availability, or follow-up, politely ask for their contact info.
- Never demand contact information; only ask once if the caller declines.
- If the caller provides their contact info naturally, acknowledge it briefly and continue.`;

  // Knowledge context
  if (knowledgeChunks.length > 0) {
    systemPrompt += '\n\n## Relevant Knowledge:\n' +
      knowledgeChunks.join('\n---\n');
    systemPrompt += '\n\nUse the above knowledge to answer caller questions when relevant.';
  }

  return systemPrompt;
}
