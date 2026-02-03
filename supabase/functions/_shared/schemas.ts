// Shared Zod validation schemas for Edge Functions
// All input validation should use these schemas to prevent injection and ensure data integrity

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============================================
// Common field schemas
// ============================================

export const UUIDSchema = z.string().uuid();

export const EmailSchema = z.string().email().max(255);

export const PhoneSchema = z.string().max(50).regex(/^[\d\s\-+()]+$/).optional();

export const URLSchema = z.string().url().max(2048).optional();

export const NameSchema = z.string().min(1).max(255).trim();

export const DescriptionSchema = z.string().max(5000).optional();

export const SlugSchema = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);

// ============================================
// Agent schemas
// ============================================

export const AgentStatusSchema = z.enum(['draft', 'live']);

export const BusinessDomainSchema = z.enum([
  'healthcare',
  'retail',
  'finance',
  'realestate',
  'hospitality',
  'other',
]);

export const AgentChannelsSchema = z.object({
  webChat: z.boolean().optional(),
  phone: z.boolean().optional(),
  sms: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
});

export const AgentCreateSchema = z.object({
  name: NameSchema,
  business_domain: BusinessDomainSchema.optional(),
  persona_id: UUIDSchema.nullable().optional(),
  goals: z.string().max(5000).optional(),
  allowed_actions: z.array(z.string().max(500)).max(50).optional(),
  knowledge_source_ids: z.array(UUIDSchema).optional(),
  channels: AgentChannelsSchema.optional(),
  status: AgentStatusSchema.optional(),
  llm_model_id: UUIDSchema.nullable().optional(),
  llm_temperature: z.number().min(0).max(2).optional(),
  llm_max_tokens: z.number().int().min(1).max(32000).optional(),
});

export const AgentUpdateSchema = z.object({
  name: NameSchema.optional(),
  business_domain: BusinessDomainSchema.optional(),
  persona_id: UUIDSchema.nullable().optional(),
  goals: z.string().max(5000).optional(),
  allowed_actions: z.array(z.string().max(500)).max(50).optional(),
  knowledge_source_ids: z.array(UUIDSchema).optional(),
  channels: AgentChannelsSchema.optional(),
  status: AgentStatusSchema.optional(),
  llm_model_id: UUIDSchema.nullable().optional(),
  llm_temperature: z.number().min(0).max(2).optional(),
  llm_max_tokens: z.number().int().min(1).max(32000).optional(),
});

// Allowed fields for agent updates (prevents mass assignment)
export const AGENT_ALLOWED_UPDATE_FIELDS = [
  'name',
  'business_domain',
  'persona_id',
  'goals',
  'allowed_actions',
  'knowledge_source_ids',
  'channels',
  'status',
  'llm_model_id',
  'llm_temperature',
  'llm_max_tokens',
] as const;

// ============================================
// Persona schemas
// ============================================

export const ToneSchema = z.enum(['professional', 'friendly', 'casual', 'formal']);

export const EscalationPolicySchema = z.enum(['apologize', 'escalate', 'retry', 'transfer']);

export const PersonaCreateSchema = z.object({
  name: NameSchema,
  role_title: z.string().min(1).max(100),
  tone: ToneSchema.optional().default('professional'),
  greeting: z.string().max(1000).optional(),
  style_notes: z.string().max(2000).optional(),
  fallback_message: z.string().max(1000).optional(),
  escalation_policy: EscalationPolicySchema.optional().default('apologize'),
  guardrails: z.array(z.string().max(500)).max(20).optional(),
});

export const PersonaUpdateSchema = PersonaCreateSchema.partial();

export const PERSONA_ALLOWED_UPDATE_FIELDS = [
  'name',
  'role_title',
  'tone',
  'greeting',
  'style_notes',
  'fallback_message',
  'escalation_policy',
  'guardrails',
] as const;

// ============================================
// Knowledge source schemas
// ============================================

export const KnowledgeSourceTypeSchema = z.enum(['text', 'pdf', 'url', 'file']);

export const KnowledgeSourceCreateSchema = z.object({
  name: NameSchema,
  type: KnowledgeSourceTypeSchema,
  content: z.string().max(1000000).optional(), // 1MB text limit
  url: URLSchema,
  agent_id: UUIDSchema.optional(),
});

export const KnowledgeSourceUpdateSchema = z.object({
  name: NameSchema.optional(),
  content: z.string().max(1000000).optional(),
});

export const KNOWLEDGE_SOURCE_ALLOWED_UPDATE_FIELDS = [
  'name',
  'content',
] as const;

// ============================================
// Session schemas
// ============================================

export const SessionStatusSchema = z.enum(['active', 'completed', 'escalated', 'abandoned']);

export const ChannelSchema = z.enum(['web', 'whatsapp', 'sms', 'phone', 'api']);

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);

export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string().max(50000),
  timestamp: z.string().datetime().optional(),
});

export const SessionCreateSchema = z.object({
  agent_id: UUIDSchema,
  session_id: UUIDSchema,
  channel: ChannelSchema.optional().default('web'),
  metadata: z.record(z.unknown()).optional(),
});

export const SessionUpdateSchema = z.object({
  status: SessionStatusSchema.optional(),
  summary: z.string().max(2000).optional(),
  internal_note: z.string().max(5000).optional(),
  lead_captured: z.boolean().optional(),
  messages: z.array(MessageSchema).max(1000).optional(),
});

export const SESSION_ALLOWED_UPDATE_FIELDS = [
  'status',
  'summary',
  'internal_note',
  'lead_captured',
  'messages',
] as const;

// ============================================
// Chat schemas
// ============================================

export const ChatRequestSchema = z.object({
  agentId: UUIDSchema,
  sessionId: UUIDSchema,
  messages: z.array(MessageSchema).min(1).max(100),
  stream: z.boolean().optional().default(true),
});

// ============================================
// Lead schemas
// ============================================

export const LeadSourceSchema = z.enum(['chat', 'form', 'calendar_booking', 'manual', 'import']);

export const LeadCreateSchema = z.object({
  email: EmailSchema.optional(),
  phone: PhoneSchema,
  name: z.string().max(255).optional(),
  company: z.string().max(255).optional(),
  source: LeadSourceSchema.optional().default('chat'),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// Integration schemas
// ============================================

export const IntegrationProviderSchema = z.enum(['slack', 'google_calendar', 'hubspot', 'zapier']);

export const SlackSettingsSchema = z.object({
  channel_id: z.string().max(100).optional(),
  channel_name: z.string().max(100).optional(),
  notify_new_lead: z.boolean().optional(),
  notify_session_start: z.boolean().optional(),
  notify_human_handoff: z.boolean().optional(),
  notify_booking: z.boolean().optional(),
});

export const CalendarSettingsSchema = z.object({
  calendar_id: z.string().max(255).optional(),
  calendar_name: z.string().max(255).optional(),
  business_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  business_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  slot_duration_minutes: z.number().int().min(5).max(480).optional(),
  buffer_minutes: z.number().int().min(0).max(120).optional(),
  timezone: z.string().max(100).optional(),
});

export const IntegrationSettingsUpdateSchema = z.object({
  settings: z.union([SlackSettingsSchema, CalendarSettingsSchema]),
});

// ============================================
// Calendar booking schemas
// ============================================

export const BookingCreateSchema = z.object({
  workspaceId: UUIDSchema,
  agentId: UUIDSchema,
  sessionId: UUIDSchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  title: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  attendeeName: z.string().max(255).optional(),
  attendeeEmail: EmailSchema,
  attendeePhone: PhoneSchema,
});

// ============================================
// Agent tools schemas
// ============================================

export const ToolTypeSchema = z.enum([
  'webhook',
  'calendar_booking',
  'email_send',
  'human_transfer',
  'knowledge_search',
  'lead_capture',
  'custom',
]);

export const ToolParameterSchema = z.object({
  name: z.string().max(100),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string().max(500).optional(),
  required: z.boolean().optional().default(false),
});

export const ToolCreateSchema = z.object({
  name: NameSchema,
  description: DescriptionSchema,
  type: ToolTypeSchema,
  config: z.record(z.unknown()).optional(),
  parameters: z.array(ToolParameterSchema).max(20).optional(),
  is_active: z.boolean().optional().default(true),
  rate_limit_per_minute: z.number().int().min(0).max(1000).optional(),
  timeout_ms: z.number().int().min(100).max(300000).optional(),
});

export const ToolUpdateSchema = ToolCreateSchema.partial();

export const TOOL_ALLOWED_UPDATE_FIELDS = [
  'name',
  'description',
  'type',
  'config',
  'parameters',
  'is_active',
  'rate_limit_per_minute',
  'timeout_ms',
] as const;

// ============================================
// Billing schemas
// ============================================

export const StripeCheckoutSchema = z.object({
  plan_slug: SlugSchema,
  success_url: URLSchema.optional(),
  cancel_url: URLSchema.optional(),
});

// ============================================
// Widget config schemas
// ============================================

export const WidgetPositionSchema = z.enum(['bottom-right', 'bottom-left']);

export const WidgetConfigUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  position: WidgetPositionSchema.optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  launcher_label: z.string().max(50).optional(),
  allowed_domains: z.array(z.string().max(255)).max(50).optional(),
});

// ============================================
// Call schemas (Voice AI / Twilio)
// ============================================

export const CallStatusSchema = z.enum([
  'ringing', 'in-progress', 'completed', 'failed',
  'no-answer', 'busy', 'transferred', 'voicemail',
]);

export const CallDirectionSchema = z.enum(['inbound', 'outbound']);

export const CallFilterSchema = z.object({
  agentId: UUIDSchema.optional(),
  status: CallStatusSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const CallTranscriptMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(50000),
  timestamp: z.string().optional(),
});

export const CallCreateSchema = z.object({
  agent_id: UUIDSchema,
  twilio_call_sid: z.string().max(64),
  from_number: z.string().max(50),
  to_number: z.string().max(50),
  direction: CallDirectionSchema.optional().default('inbound'),
});

export const CallUpdateSchema = z.object({
  status: CallStatusSchema.optional(),
  duration: z.number().int().min(0).optional(),
  recording_url: URLSchema,
  recording_sid: z.string().max(64).optional(),
  recording_duration: z.number().int().min(0).optional(),
  transcript: z.array(CallTranscriptMessageSchema).optional(),
  summary: z.string().max(5000).optional(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  transferred_to: z.string().max(100).optional(),
  transfer_reason: z.string().max(1000).optional(),
  lead_id: UUIDSchema.nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CALL_ALLOWED_UPDATE_FIELDS = [
  'status',
  'duration',
  'recording_url',
  'recording_sid',
  'recording_duration',
  'transcript',
  'summary',
  'started_at',
  'ended_at',
  'transferred_to',
  'transfer_reason',
  'lead_id',
  'metadata',
] as const;

// ============================================
// Utility functions
// ============================================

/**
 * Validates input against a schema and returns typed result
 * Throws ZodError if validation fails
 */
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
  return schema.parse(input);
}

/**
 * Safely validates input and returns result or null
 */
export function safeValidateInput<T>(schema: z.ZodSchema<T>, input: unknown): T | null {
  const result = schema.safeParse(input);
  return result.success ? result.data : null;
}

/**
 * Filters an object to only include allowed fields
 * Prevents mass assignment vulnerabilities
 */
export function filterAllowedFields<T extends Record<string, unknown>>(
  input: T,
  allowedFields: readonly string[]
): Partial<T> {
  const filtered: Partial<T> = {};
  for (const key of allowedFields) {
    if (key in input && input[key] !== undefined) {
      (filtered as Record<string, unknown>)[key] = input[key];
    }
  }
  return filtered;
}

/**
 * Creates a validation error response
 */
export function validationErrorResponse(error: z.ZodError): Response {
  const issues = error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      details: issues,
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
