# Coding Rules & Standards

## Overview

This document defines the coding standards, conventions, and best practices for the AgentCenter project.

---

## General Principles

### 1. Simplicity First
- Keep solutions simple and focused
- Avoid over-engineering
- Don't add features beyond requirements

### 2. Type Safety
- Use TypeScript strictly
- No `any` types (use `unknown` if needed)
- Define interfaces for all data structures

### 3. Consistency
- Follow existing patterns in the codebase
- Use consistent naming conventions
- Maintain uniform code structure

---

## File & Folder Naming

### Files

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `AgentForm.tsx` |
| Hooks | camelCase with `use` prefix | `useAgents.ts` |
| Utilities | camelCase | `utils.ts` |
| Types | camelCase or PascalCase | `index.ts`, `Agent.ts` |
| Constants | camelCase or UPPER_SNAKE | `constants.ts` |

### Folders

| Type | Convention | Example |
|------|------------|---------|
| Feature folders | lowercase | `agents/` |
| Component folders | lowercase | `ui/` |
| Multi-word | kebab-case | `chat-sessions/` |

---

## TypeScript Conventions

### Interfaces vs Types

```typescript
// Use interfaces for objects
interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
}

// Use types for unions, primitives, utilities
type AgentStatus = 'draft' | 'live';
type AgentId = string;
type Nullable<T> = T | null;
```

### Naming

```typescript
// Interfaces: PascalCase, no I prefix
interface Agent { }        // Good
interface IAgent { }       // Avoid

// Types: PascalCase
type AgentStatus = 'draft' | 'live';

// Enums: PascalCase with PascalCase values
enum UserRole {
  Owner = 'OWNER',
  Manager = 'MANAGER',
  Viewer = 'VIEWER',
}
```

### Strict Mode

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

---

## React Conventions

### Component Structure

```typescript
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAgents } from '@/hooks/useAgents';

// 2. Types/Interfaces
interface AgentCardProps {
  agent: Agent;
  onEdit: (id: string) => void;
}

// 3. Component
export function AgentCard({ agent, onEdit }: AgentCardProps) {
  // 3a. Hooks
  const [isOpen, setIsOpen] = useState(false);

  // 3b. Derived state
  const isLive = agent.status === 'live';

  // 3c. Handlers
  const handleClick = () => {
    onEdit(agent.id);
  };

  // 3d. Render
  return (
    <div>...</div>
  );
}
```

### Component Naming

```typescript
// Named exports (preferred)
export function AgentCard() { }

// Default exports only for pages
export default function AgentsPage() { }
```

### Props

```typescript
// Destructure props
function AgentCard({ agent, onEdit }: AgentCardProps) { }

// Use children prop correctly
interface LayoutProps {
  children: React.ReactNode;
}
```

### Hooks Rules

```typescript
// Custom hooks must start with "use"
function useAgentStatus(agentId: string) { }

// Only call hooks at top level
function Component() {
  const data = useData();  // Good

  if (condition) {
    const other = useOther();  // Bad - conditional hook
  }
}
```

---

## State Management

### Local State

```typescript
// Simple state
const [count, setCount] = useState(0);

// Complex state - use reducer
const [state, dispatch] = useReducer(reducer, initialState);
```

### Server State (React Query)

```typescript
// Queries
const { data, isLoading, error } = useQuery({
  queryKey: ['agents', workspaceId],
  queryFn: fetchAgents,
});

// Mutations
const mutation = useMutation({
  mutationFn: createAgent,
  onSuccess: () => queryClient.invalidateQueries(['agents']),
});
```

### Global State (Context)

```typescript
// Only for truly global data (auth, theme)
const { user, workspace } = useAuth();
```

---

## API & Data Fetching

### Hook Pattern

```typescript
// src/hooks/useAgents.ts
export function useAgents() {
  const { workspaceId } = useAuth();

  return useQuery({
    queryKey: ['agents', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}
```

### Error Handling

```typescript
// Always handle errors
try {
  const result = await operation();
  return result;
} catch (error) {
  if (error instanceof ApiError) {
    toast({ variant: 'destructive', title: error.message });
  }
  throw error;
}
```

---

## Styling (Tailwind CSS)

### Class Organization

```tsx
// Order: layout → spacing → sizing → typography → colors → effects
<div className="flex items-center gap-4 p-4 w-full text-sm text-gray-600 bg-white rounded-lg shadow-md">
```

### Responsive Design

```tsx
// Mobile-first approach
<div className="flex flex-col md:flex-row lg:gap-8">
```

### Component Variants

```tsx
// Use cva for variant-based styling
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white',
        outline: 'border border-input bg-transparent',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3',
        lg: 'h-12 px-6',
      },
    },
  }
);
```

---

## Edge Functions (Deno)

### Structure

```typescript
// supabase/functions/agents/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { authenticateRequest } from '../_shared/auth.ts';

serve(async (req) => {
  // 1. CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 2. Authentication
    const { user, workspaceId, role } = await authenticateRequest(req);

    // 3. Route handling
    const url = new URL(req.url);
    const method = req.method;

    if (method === 'GET') {
      return handleGet(workspaceId);
    }

    if (method === 'POST') {
      const body = await req.json();
      return handlePost(workspaceId, body);
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: corsHeaders }
    );
  }
});
```

### Authentication Check

```typescript
// Always verify role for mutations
if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
  if (!hasMinRole(role, 'MANAGER')) {
    throw new AuthError('Insufficient permissions', 403);
  }
}
```

---

## Database Conventions

### Table Naming

```sql
-- Plural, lowercase, snake_case
CREATE TABLE chat_sessions (...);
CREATE TABLE knowledge_sources (...);
```

### Column Naming

```sql
-- snake_case
workspace_id UUID REFERENCES workspaces(id)
created_at TIMESTAMPTZ DEFAULT NOW()
is_active BOOLEAN DEFAULT true
```

### Foreign Keys

```sql
-- Always named with _id suffix
agent_id UUID REFERENCES agents(id)
persona_id UUID REFERENCES personas(id)
```

### RLS Policies

```sql
-- Descriptive policy names
CREATE POLICY "Users can view own workspace agents"
ON agents FOR SELECT
USING (workspace_id = get_user_workspace_id());
```

---

## Git Conventions

### Branch Naming

```
feature/add-agent-analytics
fix/session-timeout-bug
refactor/auth-context
docs/api-documentation
```

### Commit Messages

```
feat: add agent analytics dashboard
fix: resolve session timeout issue
refactor: simplify auth context logic
docs: update API documentation
chore: update dependencies
```

### Pull Requests

- Clear title describing the change
- Description with context
- Link to related issues
- Screenshots for UI changes

---

## Testing Guidelines

### Unit Tests

```typescript
// Component tests
describe('AgentCard', () => {
  it('renders agent name', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText(mockAgent.name)).toBeInTheDocument();
  });
});
```

### Hook Tests

```typescript
// Use renderHook
const { result } = renderHook(() => useAgents(), {
  wrapper: QueryClientProvider,
});
```

---

## Security Rules

### Never Do

```typescript
// Never expose API keys to frontend
const apiKey = process.env.OPENAI_KEY; // Only in Edge Functions

// Never trust user input
const id = req.params.id;
const agent = await getAgent(sanitize(id)); // Validate

// Never disable RLS
ALTER TABLE agents DISABLE ROW LEVEL SECURITY; // Never
```

### Always Do

```typescript
// Always validate input
const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});
const data = schema.parse(input);

// Always use parameterized queries
const { data } = await supabase
  .from('agents')
  .select()
  .eq('id', agentId);  // Parameterized, not string concat

// Always check permissions
if (!hasMinRole(userRole, 'MANAGER')) {
  throw new ForbiddenError();
}
```

---

## Performance Rules

### React

```typescript
// Memoize expensive computations
const sortedAgents = useMemo(
  () => agents.sort((a, b) => a.name.localeCompare(b.name)),
  [agents]
);

// Memoize callbacks passed to children
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Use React.lazy for code splitting
const Analytics = lazy(() => import('./pages/Analytics'));
```

### Queries

```typescript
// Select only needed columns
const { data } = await supabase
  .from('agents')
  .select('id, name, status')  // Not select('*')
  .eq('workspace_id', workspaceId);

// Use pagination
const { data } = await supabase
  .from('sessions')
  .select()
  .range(0, 49);  // First 50 items
```

---

## Documentation Standards

### Code Comments

```typescript
// Explain WHY, not WHAT
// Bad: Increment counter
// Good: Increment to track API calls for rate limiting
counter++;

// Document complex logic
/**
 * Chunks text into segments for RAG processing.
 * Uses 1000 char chunks with 100 char overlap
 * to maintain context across boundaries.
 */
function chunkText(text: string): string[] { }
```

### JSDoc

```typescript
/**
 * Creates a new agent in the workspace.
 * @param data - Agent creation data
 * @returns Created agent with generated ID
 * @throws {ValidationError} If data is invalid
 * @throws {AuthError} If user lacks permissions
 */
export async function createAgent(data: CreateAgentInput): Promise<Agent> { }
```

---

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architectural patterns
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - File organization
