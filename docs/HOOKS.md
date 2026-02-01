# Custom Hooks

## Overview

AgentCenter uses custom React hooks built on TanStack React Query for data fetching and mutations. All hooks integrate with the `AuthContext` for workspace-scoped operations.

## Hook Categories

1. **Data Fetching Hooks** - Query data from the API
2. **Mutation Hooks** - Create, update, delete operations
3. **Utility Hooks** - UI and helper functionality

---

## Agents

**File:** `src/hooks/useAgents.ts`

### useAgents

Fetch all agents in the current workspace.

```typescript
const { data: agents, isLoading, error } = useAgents();
```

**Returns:** `AgentRow[]`

### useAgent

Fetch a single agent by ID.

```typescript
const { data: agent, isLoading } = useAgent(agentId);
```

### useCreateAgent

Create a new agent.

```typescript
const { mutate: createAgent, isPending } = useCreateAgent();

createAgent({
  name: "Support Bot",
  description: "Customer support agent",
  domain: "retail",
  persona_id: "uuid",
  goals: ["Answer questions"],
  channels: ["web"]
});
```

### useUpdateAgent

Update an existing agent.

```typescript
const { mutate: updateAgent } = useUpdateAgent();

updateAgent({
  id: agentId,
  name: "Updated Name",
  status: "live"
});
```

### useDeleteAgent

Delete an agent.

```typescript
const { mutate: deleteAgent } = useDeleteAgent();

deleteAgent(agentId);
```

---

## Personas

**File:** `src/hooks/usePersonas.ts`

### usePersonas

Fetch all personas in the workspace.

```typescript
const { data: personas } = usePersonas();
```

**Returns:** `PersonaRow[]`

### usePersona

Fetch a single persona.

```typescript
const { data: persona } = usePersona(personaId);
```

### useCreatePersona

```typescript
const { mutate: createPersona } = useCreatePersona();

createPersona({
  name: "Friendly Helper",
  tone: "friendly",
  greeting: "Hi there!",
  fallback_message: "Let me connect you with a human.",
  escalation_policy: "escalate"
});
```

### useUpdatePersona

```typescript
const { mutate: updatePersona } = useUpdatePersona();

updatePersona({
  id: personaId,
  tone: "professional"
});
```

### useDeletePersona

```typescript
const { mutate: deletePersona } = useDeletePersona();

deletePersona(personaId);
```

---

## Knowledge Sources

**File:** `src/hooks/useKnowledgeSources.ts`

### useKnowledgeSources

Fetch all knowledge sources, optionally filtered by agent.

```typescript
const { data: sources } = useKnowledgeSources(agentId);
```

### useKnowledgeSource

Fetch a single knowledge source.

```typescript
const { data: source } = useKnowledgeSource(sourceId);
```

### useKnowledgeChunks

Fetch chunks for a knowledge source.

```typescript
const { data: chunks } = useKnowledgeChunks(sourceId);
```

**Returns:** `KnowledgeChunk[]`

### useCreateKnowledgeSource

```typescript
const { mutate: createSource } = useCreateKnowledgeSource();

createSource({
  name: "FAQ Document",
  type: "TEXT",
  content: "Q: What are your hours?...",
  agent_id: agentId
});
```

### useDeleteKnowledgeSource

```typescript
const { mutate: deleteSource } = useDeleteKnowledgeSource();

deleteSource(sourceId);
```

### Utility: chunkText

Split text into chunks for processing.

```typescript
import { chunkText } from '@/hooks/useKnowledgeSources';

const chunks = chunkText(longText, 1000); // 1000 chars per chunk
```

---

## Chat Sessions

**File:** `src/hooks/useChatSessions.ts`

### useChatSessions

Fetch chat sessions with optional filters.

```typescript
const { data: sessions } = useChatSessions({
  agentId: "uuid",
  status: "completed",
  channel: "web"
});
```

**Returns:** `ChatSessionWithAgent[]` (includes joined agent data)

### useChatSession

Fetch a single session with full message history.

```typescript
const { data: session } = useChatSession(sessionId);
```

### useUpdateChatSession

Update session status or notes.

```typescript
const { mutate: updateSession } = useUpdateChatSession();

updateSession({
  id: sessionId,
  status: "completed",
  internal_notes: "Issue resolved"
});
```

---

## Leads

**File:** `src/hooks/useLeads.ts`

### useLeads

Fetch leads with advanced filtering.

```typescript
const { data: leads } = useLeads({
  agentId: "uuid",
  channel: "web",
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  search: "john@example.com"
});
```

**Returns:** `LeadWithAgent[]`

### useLeadBySession

Get lead associated with a specific session.

```typescript
const { data: lead } = useLeadBySession(sessionId);
```

---

## LLM Models

**File:** `src/hooks/useLLMModels.ts`

### useLLMModels

Fetch all available LLM models.

```typescript
const { data: models } = useLLMModels();
```

**Returns:** `LLMModel[]`

### useLLMModelsByProvider

Get models grouped by provider.

```typescript
const { data: modelsByProvider } = useLLMModelsByProvider();

// Returns: { OpenAI: [...], Anthropic: [...], ... }
```

### useDefaultLLMModel

Get the default LLM model.

```typescript
const { data: defaultModel } = useDefaultLLMModel();
```

### useWorkspaceLLMConfig

Get workspace LLM configuration (API keys).

```typescript
const { data: config } = useWorkspaceLLMConfig();
```

### useUpdateWorkspaceLLMConfig

Update workspace LLM credentials.

```typescript
const { mutate: updateConfig } = useUpdateWorkspaceLLMConfig();

updateConfig({
  provider: "OpenAI",
  api_key: "sk-...",
  is_active: true
});
```

### LLM_PROVIDER_INFO

Provider metadata constant.

```typescript
import { LLM_PROVIDER_INFO } from '@/hooks/useLLMModels';

// {
//   OpenAI: { name: "OpenAI", icon: "...", description: "..." },
//   Anthropic: { ... },
//   ...
// }
```

---

## Channel Configs

**File:** `src/hooks/useChannelConfigs.ts`

### useChannelConfigs

Fetch channel configurations for an agent.

```typescript
const { data: configs } = useChannelConfigs(agentId);
```

---

## Widget Config

**File:** `src/hooks/useWidgetConfig.ts`

### useWidgetConfig

Fetch web widget configuration.

```typescript
const { data: config } = useWidgetConfig(agentId);
```

### useUpdateWidgetConfig

Update widget configuration.

```typescript
const { mutate: updateConfig } = useUpdateWidgetConfig();

updateConfig({
  agent_id: agentId,
  primary_color: "#3B82F6",
  position: "bottom-right",
  welcome_message: "Hi!"
});
```

---

## Secure Agents

**File:** `src/hooks/useSecureAgents.ts`

Secure versions of agent hooks with additional auth checks.

### useSecureAgents

```typescript
const { data: agents } = useSecureAgents();
```

---

## Utility Hooks

### use-toast

**File:** `src/hooks/use-toast.ts`

Toast notification hook.

```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

toast({
  title: "Success",
  description: "Agent created successfully"
});

// Variants
toast({ variant: "destructive", title: "Error" });
```

### use-mobile

**File:** `src/hooks/use-mobile.tsx`

Detect mobile viewport.

```typescript
import { useIsMobile } from '@/hooks/use-mobile';

const isMobile = useIsMobile();
```

---

## Query Keys

All hooks use consistent query keys for cache management:

```typescript
// Pattern: ['resource', workspaceId, ...filters]
['agents', workspaceId]
['agent', workspaceId, agentId]
['personas', workspaceId]
['knowledge-sources', workspaceId, agentId]
['chat-sessions', workspaceId, filters]
['leads', workspaceId, filters]
['llm-models']
```

## Cache Invalidation

Mutations automatically invalidate related queries:

```typescript
// useCreateAgent invalidates:
queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] });

// useUpdateAgent invalidates:
queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] });
queryClient.invalidateQueries({ queryKey: ['agent', workspaceId, id] });
```

---

## Error Handling

All hooks include error handling with toast notifications:

```typescript
const { mutate, error } = useCreateAgent();

// Errors are automatically shown via toast
// Access error for custom handling:
if (error) {
  console.error(error.message);
}
```

---

## See Also

- [API.md](./API.md) - API endpoints consumed by these hooks
- [COMPONENTS.md](./COMPONENTS.md) - Components that use these hooks
