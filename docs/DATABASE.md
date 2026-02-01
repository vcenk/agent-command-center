# Database Schema

## Overview

AgentCenter uses Supabase (PostgreSQL) as its database. The schema supports multi-tenant workspaces with Row Level Security (RLS) for data isolation.

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   workspaces    │────<│    profiles     │     │   user_roles    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        │ workspace_id                                  │
        ▼                                               ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     agents      │────<│    personas     │     │  llm_models     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        │ agent_id                                      │
        ▼                                               ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  chat_sessions  │────<│     leads       │     │workspace_llm_cfg│
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        │ agent_id
        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│knowledge_sources│────<│knowledge_chunks │     │ channel_configs │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Tables

### Multi-Tenancy

#### `workspaces`
Organization/tenant container.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Workspace name |
| slug | text | URL-friendly identifier |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

#### `profiles`
User profiles linked to workspaces.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auth.users FK) |
| workspace_id | uuid | FK to workspaces |
| full_name | text | User's full name |
| avatar_url | text | Profile picture URL |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

#### `user_roles`
Role-based access control.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| workspace_id | uuid | FK to workspaces |
| role | app_role | OWNER, MANAGER, or VIEWER |
| created_at | timestamptz | Creation timestamp |

### Agent Configuration

#### `agents`
AI agent definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| name | text | Agent name |
| description | text | Agent description |
| domain | business_domain | Business domain enum |
| status | agent_status | draft or live |
| persona_id | uuid | FK to personas (optional) |
| goals | text[] | Array of agent goals |
| channels | text[] | Enabled channels |
| llm_model_id | uuid | FK to llm_models |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

#### `personas`
Agent personalities and behavior.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| name | text | Persona name |
| tone | persona_tone | professional, friendly, casual, formal |
| greeting | text | Initial greeting message |
| fallback_message | text | Message when agent can't help |
| escalation_policy | fallback_policy | apologize, escalate, retry, transfer |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

#### `knowledge_sources`
Knowledge base entries.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| agent_id | uuid | FK to agents (optional) |
| name | text | Source name |
| type | knowledge_type | PDF, URL, or TEXT |
| content | text | Raw content |
| url | text | Source URL (if type=URL) |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

#### `knowledge_chunks`
Chunked content for RAG retrieval.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| source_id | uuid | FK to knowledge_sources |
| content | text | Chunk text content |
| embedding | vector | Vector embedding (for similarity search) |
| chunk_index | integer | Order within source |
| created_at | timestamptz | Creation timestamp |

### Conversation Data

#### `chat_sessions`
Chat conversation records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| agent_id | uuid | FK to agents |
| channel | text | Channel (web, phone, sms, whatsapp) |
| status | text | active, completed, escalated |
| messages | jsonb | Array of message objects |
| internal_notes | text | Staff notes |
| started_at | timestamptz | Session start time |
| ended_at | timestamptz | Session end time |
| created_at | timestamptz | Creation timestamp |

#### `leads`
Captured lead information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| agent_id | uuid | FK to agents |
| session_id | uuid | FK to chat_sessions |
| name | text | Lead name |
| email | text | Email address |
| phone | text | Phone number |
| channel | text | Source channel |
| metadata | jsonb | Additional data |
| created_at | timestamptz | Creation timestamp |

### Channel Configuration

#### `channel_configs`
Multi-channel setup.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| agent_id | uuid | FK to agents |
| channel | text | Channel type |
| config | jsonb | Channel-specific configuration |
| enabled | boolean | Active status |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

#### `agent_web_widget_config`
Web chat widget customization.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| agent_id | uuid | FK to agents |
| primary_color | text | Theme color |
| position | text | Widget position |
| welcome_message | text | Initial message |
| allowed_domains | text[] | Domain whitelist |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### LLM Configuration

#### `llm_models`
Available AI models.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| provider | text | OpenAI, Anthropic, Google, etc. |
| name | text | Model display name |
| model_id | text | API model identifier |
| context_window | integer | Max tokens |
| input_cost_per_1k | decimal | Input token cost |
| output_cost_per_1k | decimal | Output token cost |
| is_default | boolean | Default model flag |
| created_at | timestamptz | Creation timestamp |

#### `workspace_llm_config`
Per-workspace LLM credentials.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| provider | text | LLM provider |
| api_key | text | Encrypted API key |
| is_active | boolean | Active status |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### Billing

#### `pricing_plans`
Subscription tiers.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Plan name |
| stripe_price_id | text | Stripe price ID |
| price_monthly | decimal | Monthly price |
| price_yearly | decimal | Yearly price |
| conversation_limit | integer | Monthly conversation limit |
| features | jsonb | Plan features |
| created_at | timestamptz | Creation timestamp |

#### `workspace_subscriptions`
Workspace subscription status.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| plan_id | uuid | FK to pricing_plans |
| stripe_subscription_id | text | Stripe subscription ID |
| status | subscription_status | Subscription status |
| current_period_start | timestamptz | Billing period start |
| current_period_end | timestamptz | Billing period end |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

#### `workspace_usage`
Usage tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| month | date | Billing month |
| conversations | integer | Conversation count |
| messages | integer | Message count |
| tokens_used | bigint | Total tokens |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

#### `billing_invoices`
Invoice history.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| stripe_invoice_id | text | Stripe invoice ID |
| amount | decimal | Invoice amount |
| status | text | paid, pending, failed |
| invoice_url | text | Stripe invoice URL |
| created_at | timestamptz | Creation timestamp |

## Enums

### `agent_status`
- `draft` - Agent in development
- `live` - Agent deployed and active

### `app_role`
- `OWNER` - Full admin access
- `MANAGER` - Create/edit resources
- `VIEWER` - Read-only access

### `business_domain`
- `healthcare`
- `retail`
- `finance`
- `realestate`
- `hospitality`
- `other`

### `persona_tone`
- `professional`
- `friendly`
- `casual`
- `formal`

### `fallback_policy`
- `apologize` - Apologize and suggest alternatives
- `escalate` - Escalate to human
- `retry` - Ask user to rephrase
- `transfer` - Transfer to another agent

### `knowledge_type`
- `PDF` - PDF document
- `URL` - Web page
- `TEXT` - Plain text

### `subscription_status`
- `trialing`
- `active`
- `past_due`
- `canceled`
- `unpaid`
- `paused`

## Database Functions

### Authentication & Authorization

```sql
-- Get user's role in a workspace
get_user_role(workspace_id uuid) RETURNS app_role

-- Check if user has minimum role
has_role(workspace_id uuid, min_role app_role) RETURNS boolean

-- Check workspace access
user_has_workspace_access(workspace_id uuid) RETURNS boolean
```

### Usage Tracking

```sql
-- Get workspace usage for current month
get_workspace_usage(workspace_id uuid) RETURNS workspace_usage

-- Increment conversation count
increment_conversation_count(workspace_id uuid) RETURNS void

-- Check if under usage limit
check_usage_limit(workspace_id uuid) RETURNS boolean
```

## Row Level Security (RLS)

All tables have RLS enabled with policies based on workspace_id:

```sql
-- Example policy pattern
CREATE POLICY "Users can view own workspace data"
ON agents FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Managers can insert agents"
ON agents FOR INSERT
WITH CHECK (has_role(workspace_id, 'MANAGER'));
```

## Indexes

Key indexes for performance:

```sql
CREATE INDEX idx_agents_workspace ON agents(workspace_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_sessions_agent ON chat_sessions(agent_id);
CREATE INDEX idx_sessions_status ON chat_sessions(status);
CREATE INDEX idx_leads_workspace ON leads(workspace_id);
CREATE INDEX idx_knowledge_agent ON knowledge_sources(agent_id);
```

## See Also

- [API.md](./API.md) - Edge Functions API reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture decisions
