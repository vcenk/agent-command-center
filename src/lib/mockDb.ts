import { 
  Workspace, User, Persona, Agent, KnowledgeSource, 
  CallSession, Integration, AuditLog, Usage, ChannelConfig 
} from '@/types';

const STORAGE_KEY = 'agent_cockpit_db';

interface Database {
  workspaces: Workspace[];
  users: User[];
  personas: Persona[];
  agents: Agent[];
  knowledgeSources: KnowledgeSource[];
  callSessions: CallSession[];
  integrations: Integration[];
  auditLogs: AuditLog[];
  usage: Usage[];
  channelConfigs: ChannelConfig[];
}

const getDefaultDb = (): Database => ({
  workspaces: [],
  users: [],
  personas: [],
  agents: [],
  knowledgeSources: [],
  callSessions: [],
  integrations: [],
  auditLogs: [],
  usage: [],
  channelConfigs: [],
});

// Load from localStorage
const loadDb = (): Database => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load database:', e);
  }
  return getDefaultDb();
};

// Save to localStorage
const saveDb = (db: Database): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to save database:', e);
  }
};

// In-memory database
let db: Database = loadDb();

// Generate UUID
export const generateId = (): string => {
  return crypto.randomUUID();
};

// Workspaces
export const workspaces = {
  getAll: () => db.workspaces,
  getById: (id: string) => db.workspaces.find(w => w.id === id),
  create: (workspace: Omit<Workspace, 'id' | 'createdAt'>) => {
    const newWorkspace: Workspace = {
      ...workspace,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    db.workspaces.push(newWorkspace);
    saveDb(db);
    return newWorkspace;
  },
  update: (id: string, data: Partial<Workspace>) => {
    const index = db.workspaces.findIndex(w => w.id === id);
    if (index !== -1) {
      db.workspaces[index] = { ...db.workspaces[index], ...data };
      saveDb(db);
      return db.workspaces[index];
    }
    return null;
  },
  delete: (id: string) => {
    db.workspaces = db.workspaces.filter(w => w.id !== id);
    saveDb(db);
  },
};

// Users
export const users = {
  getAll: () => db.users,
  getById: (id: string) => db.users.find(u => u.id === id),
  getByEmail: (email: string) => db.users.find(u => u.email === email),
  getByWorkspace: (workspaceId: string) => db.users.filter(u => u.workspaceId === workspaceId),
  create: (user: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...user,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDb(db);
    return newUser;
  },
  update: (id: string, data: Partial<User>) => {
    const index = db.users.findIndex(u => u.id === id);
    if (index !== -1) {
      db.users[index] = { ...db.users[index], ...data };
      saveDb(db);
      return db.users[index];
    }
    return null;
  },
  delete: (id: string) => {
    db.users = db.users.filter(u => u.id !== id);
    saveDb(db);
  },
};

// Personas
export const personas = {
  getAll: () => db.personas,
  getById: (id: string) => db.personas.find(p => p.id === id),
  getByWorkspace: (workspaceId: string) => db.personas.filter(p => p.workspaceId === workspaceId),
  create: (persona: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newPersona: Persona = {
      ...persona,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    db.personas.push(newPersona);
    saveDb(db);
    return newPersona;
  },
  update: (id: string, data: Partial<Persona>) => {
    const index = db.personas.findIndex(p => p.id === id);
    if (index !== -1) {
      db.personas[index] = { 
        ...db.personas[index], 
        ...data, 
        updatedAt: new Date().toISOString() 
      };
      saveDb(db);
      return db.personas[index];
    }
    return null;
  },
  delete: (id: string) => {
    db.personas = db.personas.filter(p => p.id !== id);
    saveDb(db);
  },
};

// Agents
export const agents = {
  getAll: () => db.agents,
  getById: (id: string) => db.agents.find(a => a.id === id),
  getByWorkspace: (workspaceId: string) => db.agents.filter(a => a.workspaceId === workspaceId),
  create: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newAgent: Agent = {
      ...agent,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    db.agents.push(newAgent);
    saveDb(db);
    return newAgent;
  },
  update: (id: string, data: Partial<Agent>) => {
    const index = db.agents.findIndex(a => a.id === id);
    if (index !== -1) {
      db.agents[index] = { 
        ...db.agents[index], 
        ...data, 
        updatedAt: new Date().toISOString() 
      };
      saveDb(db);
      return db.agents[index];
    }
    return null;
  },
  delete: (id: string) => {
    db.agents = db.agents.filter(a => a.id !== id);
    saveDb(db);
  },
};

// Knowledge Sources
export const knowledgeSources = {
  getAll: () => db.knowledgeSources,
  getById: (id: string) => db.knowledgeSources.find(k => k.id === id),
  getByWorkspace: (workspaceId: string) => db.knowledgeSources.filter(k => k.workspaceId === workspaceId),
  create: (source: Omit<KnowledgeSource, 'id' | 'createdAt' | 'updatedAt' | 'chunks'>) => {
    const id = generateId();
    const chunks = chunkContent(source.rawText, id);
    const now = new Date().toISOString();
    const newSource: KnowledgeSource = {
      ...source,
      id,
      chunks,
      createdAt: now,
      updatedAt: now,
    };
    db.knowledgeSources.push(newSource);
    saveDb(db);
    return newSource;
  },
  update: (id: string, data: Partial<KnowledgeSource>) => {
    const index = db.knowledgeSources.findIndex(k => k.id === id);
    if (index !== -1) {
      if (data.rawText) {
        data.chunks = chunkContent(data.rawText, id);
      }
      db.knowledgeSources[index] = { 
        ...db.knowledgeSources[index], 
        ...data,
        updatedAt: new Date().toISOString()
      };
      saveDb(db);
      return db.knowledgeSources[index];
    }
    return null;
  },
  delete: (id: string) => {
    db.knowledgeSources = db.knowledgeSources.filter(k => k.id !== id);
    saveDb(db);
  },
};

// Chunk content for RAG
const chunkContent = (content: string, sourceId: string, chunkSize = 1000) => {
  const chunks = [];
  let index = 0;
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push({
      id: generateId(),
      sourceId,
      content: content.slice(i, i + chunkSize),
      index: index++,
    });
  }
  return chunks;
};

// Simple keyword-based retrieval
export const retrieveChunks = (query: string, knowledgeIds: string[], topK = 3) => {
  const queryWords = query.toLowerCase().split(/\s+/);
  const allChunks: { chunk: any; score: number }[] = [];

  for (const id of knowledgeIds) {
    const source = knowledgeSources.getById(id);
    if (!source) continue;
    
    for (const chunk of source.chunks) {
      const chunkWords = chunk.content.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (chunkWords.includes(word)) score++;
      }
      if (score > 0) {
        allChunks.push({ chunk: { ...chunk, sourceName: source.name }, score });
      }
    }
  }

  return allChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(c => c.chunk);
};

// Call Sessions
export const callSessions = {
  getAll: () => db.callSessions,
  getById: (id: string) => db.callSessions.find(c => c.id === id),
  getByWorkspace: (workspaceId: string) => db.callSessions.filter(c => c.workspaceId === workspaceId),
  getByAgent: (agentId: string) => db.callSessions.filter(c => c.agentId === agentId),
  create: (session: Omit<CallSession, 'id'>) => {
    const newSession: CallSession = {
      ...session,
      id: generateId(),
    };
    db.callSessions.push(newSession);
    saveDb(db);
    return newSession;
  },
  search: (workspaceId: string, query: string) => {
    const q = query.toLowerCase();
    return db.callSessions.filter(c => 
      c.workspaceId === workspaceId &&
      (c.transcript.some(t => t.text.toLowerCase().includes(q)) || 
       c.summary.toLowerCase().includes(q) ||
       c.from.toLowerCase().includes(q) ||
       c.to.toLowerCase().includes(q) ||
       c.agentName.toLowerCase().includes(q))
    );
  },
};

// Integrations
export const integrations = {
  getAll: () => db.integrations,
  getById: (id: string) => db.integrations.find(i => i.id === id),
  getByWorkspace: (workspaceId: string) => db.integrations.filter(i => i.workspaceId === workspaceId),
  create: (integration: Omit<Integration, 'id' | 'createdAt'>) => {
    const newIntegration: Integration = {
      ...integration,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    db.integrations.push(newIntegration);
    saveDb(db);
    return newIntegration;
  },
  update: (id: string, data: Partial<Integration>) => {
    const index = db.integrations.findIndex(i => i.id === id);
    if (index !== -1) {
      db.integrations[index] = { ...db.integrations[index], ...data };
      saveDb(db);
      return db.integrations[index];
    }
    return null;
  },
  delete: (id: string) => {
    db.integrations = db.integrations.filter(i => i.id !== id);
    saveDb(db);
  },
};

// Audit Logs
export const auditLogs = {
  getAll: () => db.auditLogs,
  getByWorkspace: (workspaceId: string) => db.auditLogs.filter(l => l.workspaceId === workspaceId),
  create: (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newLog: AuditLog = {
      ...log,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    db.auditLogs.push(newLog);
    saveDb(db);
    return newLog;
  },
};

// Usage
export const usage = {
  get: (workspaceId: string) => {
    let u = db.usage.find(u => u.workspaceId === workspaceId);
    if (!u) {
      u = { workspaceId, messages: 0, callMinutes: 0, knowledgeUploads: 0, actionsExecuted: 0 };
      db.usage.push(u);
      saveDb(db);
    }
    return u;
  },
  increment: (workspaceId: string, field: keyof Omit<Usage, 'workspaceId'>, amount = 1) => {
    const index = db.usage.findIndex(u => u.workspaceId === workspaceId);
    if (index !== -1) {
      (db.usage[index] as any)[field] += amount;
      saveDb(db);
    }
  },
};

// Channel Configs
export const channelConfigs = {
  getByAgent: (agentId: string) => db.channelConfigs.filter(c => c.agentId === agentId),
  upsert: (config: Omit<ChannelConfig, 'id'>) => {
    const existing = db.channelConfigs.find(
      c => c.agentId === config.agentId && c.channel === config.channel
    );
    if (existing) {
      Object.assign(existing, config);
    } else {
      db.channelConfigs.push({ ...config, id: generateId() });
    }
    saveDb(db);
  },
};

// Reset database
export const resetDb = () => {
  db = getDefaultDb();
  saveDb(db);
};

// Global search
export const globalSearch = (workspaceId: string, query: string) => {
  const q = query.toLowerCase();
  const results: { type: string; id: string; name: string; description: string }[] = [];

  // Search agents
  agents.getByWorkspace(workspaceId).forEach(a => {
    if (a.name.toLowerCase().includes(q) || a.goals.toLowerCase().includes(q)) {
      results.push({ type: 'agent', id: a.id, name: a.name, description: a.businessDomain });
    }
  });

  // Search personas
  personas.getByWorkspace(workspaceId).forEach(p => {
    if (p.name.toLowerCase().includes(q) || p.roleTitle.toLowerCase().includes(q)) {
      results.push({ type: 'persona', id: p.id, name: p.name, description: p.roleTitle });
    }
  });

  // Search calls
  callSessions.getByWorkspace(workspaceId).forEach(c => {
    const transcriptText = c.transcript.map(t => t.text).join(' ').toLowerCase();
    if (transcriptText.includes(q) || c.summary.toLowerCase().includes(q)) {
      results.push({ type: 'call', id: c.id, name: `Call from ${c.from}`, description: c.summary.slice(0, 50) });
    }
  });

  return results;
};
