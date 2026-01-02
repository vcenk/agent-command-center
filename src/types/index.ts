// Role enum
export type Role = 'OWNER' | 'MANAGER' | 'VIEWER';

// Workspace/Tenant
export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
}

// User
export interface User {
  id: string;
  email: string;
  workspaceId: string | null;
  role: Role;
  createdAt: string;
}

// Persona
export interface Persona {
  id: string;
  workspaceId: string;
  name: string;
  roleTitle: string;
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  styleNotes: string;
  doNotDo: string[];
  greetingScript: string;
  fallbackPolicy: 'apologize' | 'escalate' | 'retry' | 'transfer';
  escalationRules: string;
  createdAt: string;
  updatedAt: string;
}

// Agent
export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  businessDomain: 'healthcare' | 'retail' | 'finance' | 'realestate' | 'hospitality' | 'other';
  personaId: string | null;
  channels: {
    webChat: boolean;
    phone: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  goals: string;
  allowedActions: string[];
  knowledgeSourceIds: string[];
  status: 'draft' | 'live';
  createdAt: string;
  updatedAt: string;
}

// Knowledge Source
export interface KnowledgeSource {
  id: string;
  workspaceId: string;
  name: string;
  type: 'PDF' | 'URL' | 'TEXT';
  url?: string;
  fileName?: string;
  rawText: string;
  tags: string[];
  chunks: KnowledgeChunk[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  content: string;
  index: number;
}

// Transcript entry for call sessions
export interface TranscriptEntry {
  speaker: 'user' | 'agent';
  text: string;
  timestamp: string;
}

// Call Session
export interface CallSession {
  id: string;
  workspaceId: string;
  agentId: string;
  agentName: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  startTime: string;
  durationSec: number;
  status: 'completed' | 'missed' | 'transferred';
  transcript: TranscriptEntry[];
  summary: string;
  escalation: 'none' | 'transferred' | 'notified';
  createdAt: string;
}

// Integration
export interface Integration {
  id: string;
  workspaceId: string;
  type: 'Calendly' | 'Webhook';
  name: string;
  apiKeyOrEndpoint: string;
  enabled: boolean;
  createdAt: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  workspaceId: string;
  actorEmail: string;
  actionType: 'create' | 'update' | 'delete' | 'publish' | 'execute';
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  timestamp: string;
}

// Usage
export interface Usage {
  workspaceId: string;
  messages: number;
  callMinutes: number;
  knowledgeUploads: number;
  actionsExecuted: number;
}

// Channel Config
export interface ChannelConfig {
  id: string;
  agentId: string;
  channel: 'webChat' | 'phone' | 'sms' | 'whatsapp';
  greeting: string;
  voicemailFallback: boolean;
  businessHours: string;
  escalationToHuman: boolean;
  provider?: string;
  phoneNumber?: string;
}

// Action Template
export interface ActionTemplate {
  id: string;
  name: string;
  type: 'calendly' | 'webhook';
  description: string;
}
