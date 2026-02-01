# Architecture

## Overview

AgentCenter is a multi-tenant SaaS application for managing AI agents. It follows a modern serverless architecture with React on the frontend and Supabase on the backend.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  React App (Vite)                                                   │
│  ├── Pages (React Router)                                           │
│  ├── Components (shadcn/ui)                                         │
│  ├── Hooks (TanStack Query)                                         │
│  └── Contexts (Auth, Theme)                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Supabase Edge Functions (Deno)                                     │
│  ├── Authentication & Authorization                                 │
│  ├── Business Logic                                                 │
│  ├── AI Gateway Integration                                         │
│  └── Stripe Integration                                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ RLS Policies
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL)                                              │
│  ├── Tables with RLS                                                │
│  ├── Database Functions                                             │
│  ├── Realtime Subscriptions                                         │
│  └── Storage (Files)                                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                             │
├─────────────────────────────────────────────────────────────────────┤
│  ├── LLM Providers - OpenAI, Anthropic, Google, etc.                │
│  └── Stripe - Payments & Subscriptions                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| React Router 6 | Routing |
| TanStack Query | Server state |
| shadcn/ui | Component library |
| Tailwind CSS | Styling |
| Radix UI | Accessible primitives |
| Framer Motion | Animations |
| React Hook Form | Forms |
| Zod | Validation |
| Recharts | Charts |

### Backend

| Technology | Purpose |
|------------|---------|
| Supabase | Backend platform |
| PostgreSQL | Database |
| Deno | Edge Functions runtime |
| Row Level Security | Data isolation |
| Stripe | Payments |

---

## Design Patterns

### 1. Multi-Tenancy (Workspace Isolation)

Every data table includes a `workspace_id` column. Row Level Security policies ensure users can only access their workspace data.

```sql
-- RLS Policy Pattern
CREATE POLICY "workspace_isolation" ON agents
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
  )
);
```

### 2. Role-Based Access Control (RBAC)

Three-tier permission system:

```
OWNER (Full access)
  └── MANAGER (Create/Edit)
        └── VIEWER (Read-only)
```

```typescript
// Edge Function auth check
const { user, role } = await authenticateRequest(req);
if (!hasMinRole(role, 'MANAGER')) {
  throw new Error('Insufficient permissions');
}
```

### 3. Edge Functions as API Layer

All frontend-to-database communication goes through Edge Functions:

```
Frontend → Edge Function → Database
         (auth + business logic)
```

Benefits:
- Centralized authentication
- Business logic encapsulation
- Rate limiting
- Audit logging

### 4. React Query for Server State

```typescript
// Queries auto-cache and dedupe
const { data } = useQuery({
  queryKey: ['agents', workspaceId],
  queryFn: () => fetchAgents(workspaceId),
});

// Mutations auto-invalidate
const mutation = useMutation({
  mutationFn: createAgent,
  onSuccess: () => {
    queryClient.invalidateQueries(['agents']);
  },
});
```

### 5. Optimistic Updates

Mutations can update UI before server response:

```typescript
useMutation({
  mutationFn: updateAgent,
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['agent', id]);
    const previous = queryClient.getQueryData(['agent', id]);
    queryClient.setQueryData(['agent', id], newData);
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['agent', id], context.previous);
  },
});
```

---

## Data Flow

### Authentication Flow

```
1. User submits credentials
2. Supabase Auth validates
3. JWT token returned
4. Token stored in session
5. AuthContext provides user state
6. RouteGuard protects routes
7. API calls include JWT header
8. Edge Functions validate token
```

### CRUD Operation Flow

```
1. Component calls mutation hook
2. Hook triggers React Query mutation
3. Edge Function receives request
4. Auth validation
5. Role permission check
6. Database operation (with RLS)
7. Response returned
8. React Query cache updated
9. UI re-renders
```

### Chat Flow

```
1. User sends message
2. Chat function receives request
3. Load agent configuration
4. Retrieve relevant knowledge chunks
5. Build prompt with persona
6. Call AI Gateway
7. Extract leads from response
8. Log session
9. Return response
```

---

## Folder Structure Philosophy

### Feature-Based Organization

```
src/pages/dashboard/
├── agents/           # Agent management
│   ├── AgentsList.tsx
│   ├── AgentForm.tsx
│   └── AgentDetail.tsx
├── personas/         # Persona management
├── knowledge/        # Knowledge base
└── sessions/         # Chat sessions
```

### Shared Logic in Hooks

```
src/hooks/
├── useAgents.ts      # All agent operations
├── usePersonas.ts    # All persona operations
└── useChatSessions.ts
```

### UI Components Separate

```
src/components/
├── ui/              # Generic UI (shadcn)
├── shared/          # Business components
└── layout/          # Page layouts
```

---

## Security Architecture

### Defense in Depth

```
Layer 1: Frontend validation (Zod)
Layer 2: Edge Function auth
Layer 3: Role-based checks
Layer 4: RLS policies
Layer 5: Database constraints
```

### Sensitive Data Handling

```typescript
// API keys stored encrypted
const config = await supabase
  .from('workspace_llm_config')
  .select('api_key')  // Encrypted in DB
  .single();

// Never exposed to frontend
// Used only in Edge Functions
```

### JWT Validation

```typescript
// Every Edge Function
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');
const { data: { user } } = await supabase.auth.getUser(token);
```

---

## Scalability Considerations

### Database

- Indexes on frequently queried columns
- Partitioning for large tables (sessions, leads)
- Connection pooling via Supabase

### Edge Functions

- Stateless design
- Auto-scaling via Supabase
- Cold start optimization

### Frontend

- Code splitting (React.lazy)
- Image optimization
- CDN for static assets

---

## Error Handling

### Frontend

```typescript
// Global error boundary
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>

// Query error handling
const { error } = useQuery({...});
if (error) {
  toast({ variant: 'destructive', title: error.message });
}
```

### Backend

```typescript
// Edge Function pattern
try {
  const result = await operation();
  return new Response(JSON.stringify(result));
} catch (error) {
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: error.status || 500 }
  );
}
```

---

## Monitoring & Observability

### Audit Logs

```typescript
// Log significant actions
await supabase.from('audit_logs').insert({
  workspace_id,
  user_id,
  action: 'agent.created',
  resource_id: agent.id,
  metadata: { name: agent.name }
});
```

### Usage Tracking

```typescript
// Track for billing
await supabase.rpc('increment_conversation_count', {
  p_workspace_id: workspaceId
});
```

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Supabase over custom backend | Faster development, built-in auth, RLS |
| Edge Functions over serverless | Lower latency, Deno TypeScript support |
| React Query over Redux | Better server state management |
| shadcn/ui over other libs | Customizable, accessible, well-documented |
| Workspace-based multi-tenancy | Simpler than schema-based, good for SaaS |
| RAG with keyword matching | Simple MVP, upgradable to vector search |

---

## Future Improvements

1. **Vector Search** - Replace keyword RAG with pgvector
2. **Realtime Updates** - Supabase subscriptions for live data
3. **Feature Flags** - Gradual rollouts
4. **A/B Testing** - Experiment framework
5. **Webhooks** - Event notifications to external systems

---

## See Also

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - File organization
- [DATABASE.md](./DATABASE.md) - Data model
- [API.md](./API.md) - API reference
