# API Reference

## Overview

AgentCenter uses Supabase Edge Functions as its API layer. All functions are written in TypeScript/Deno and enforce authentication and workspace isolation.

## Base URL

```
https://<project-id>.supabase.co/functions/v1
```

## Authentication

All endpoints (except webhooks) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <supabase-jwt-token>
```

## Common Headers

```http
Content-Type: application/json
Authorization: Bearer <token>
```

## Shared Authentication Module

Located at: `supabase/functions/_shared/auth.ts`

### Functions

```typescript
// Authenticate request and return user context
authenticateRequest(req: Request): Promise<{
  user: User;
  workspaceId: string;
  role: AppRole;
}>

// Check if user has minimum role
hasMinRole(userRole: AppRole, minRole: AppRole): boolean

// Get admin Supabase client (service role)
getAdminClient(): SupabaseClient
```

### Role Hierarchy

```
OWNER > MANAGER > VIEWER
```

---

## Endpoints

### Agents

**Base Path:** `/agents`

#### List Agents
```http
GET /agents
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Support Agent",
      "description": "Customer support bot",
      "domain": "retail",
      "status": "live",
      "persona_id": "uuid",
      "goals": ["Answer questions", "Collect leads"],
      "channels": ["web", "phone"],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Agent
```http
GET /agents/:id
```

#### Create Agent
```http
POST /agents
```

**Required Role:** MANAGER

**Body:**
```json
{
  "name": "Support Agent",
  "description": "Customer support bot",
  "domain": "retail",
  "persona_id": "uuid",
  "goals": ["Answer questions"],
  "channels": ["web"]
}
```

#### Update Agent
```http
PUT /agents/:id
```

**Required Role:** MANAGER

#### Delete Agent
```http
DELETE /agents/:id
```

**Required Role:** MANAGER

---

### Personas

**Base Path:** `/personas`

#### List Personas
```http
GET /personas
```

#### Create Persona
```http
POST /personas
```

**Required Role:** MANAGER

**Body:**
```json
{
  "name": "Friendly Helper",
  "tone": "friendly",
  "greeting": "Hi there! How can I help?",
  "fallback_message": "I'm not sure about that.",
  "escalation_policy": "escalate"
}
```

#### Update Persona
```http
PUT /personas/:id
```

#### Delete Persona
```http
DELETE /personas/:id
```

---

### Chat

**Base Path:** `/chat`

#### Send Message
```http
POST /chat
```

**Body:**
```json
{
  "agent_id": "uuid",
  "session_id": "uuid",
  "message": "Hello, I need help"
}
```

**Response:**
```json
{
  "response": "Hi! I'd be happy to help. What do you need assistance with?",
  "session_id": "uuid",
  "lead_extracted": {
    "email": "user@example.com",
    "phone": null
  }
}
```

**Features:**
- Automatic lead extraction (email/phone)
- Knowledge-based RAG retrieval
- Persona-driven responses
- Domain validation

---

### Knowledge

**Base Path:** `/knowledge`

#### List Knowledge Sources
```http
GET /knowledge
```

**Query Parameters:**
- `agent_id` - Filter by agent

#### Create Knowledge Source
```http
POST /knowledge
```

**Required Role:** MANAGER

**Body:**
```json
{
  "name": "FAQ Document",
  "type": "TEXT",
  "content": "Q: What are your hours?\nA: 9 AM - 5 PM",
  "agent_id": "uuid"
}
```

#### Delete Knowledge Source
```http
DELETE /knowledge/:id
```

---

### Sessions

**Base Path:** `/sessions`

#### List Sessions
```http
GET /sessions
```

**Query Parameters:**
- `agent_id` - Filter by agent
- `status` - Filter by status (active, completed, escalated)
- `channel` - Filter by channel

#### Get Session
```http
GET /sessions/:id
```

**Response:**
```json
{
  "id": "uuid",
  "agent_id": "uuid",
  "channel": "web",
  "status": "completed",
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi! How can I help?"}
  ],
  "started_at": "2024-01-01T10:00:00Z",
  "ended_at": "2024-01-01T10:15:00Z"
}
```

#### Update Session
```http
PUT /sessions/:id
```

**Body:**
```json
{
  "status": "completed",
  "internal_notes": "Customer was satisfied"
}
```

---

### Log Chat Session

**Base Path:** `/log-chat-session`

#### Log Session
```http
POST /log-chat-session
```

**Body:**
```json
{
  "session_id": "uuid",
  "messages": [...],
  "metadata": {}
}
```

---

### Analytics

**Base Path:** `/analytics`

#### Get Analytics
```http
GET /analytics
```

**Query Parameters:**
- `start_date` - Start of date range
- `end_date` - End of date range
- `agent_id` - Filter by agent (optional)

**Response:**
```json
{
  "total_conversations": 1250,
  "total_messages": 8500,
  "avg_messages_per_session": 6.8,
  "lead_conversion_rate": 0.23,
  "sessions_by_channel": {
    "web": 800,
    "phone": 300,
    "sms": 150
  },
  "sessions_by_status": {
    "completed": 1000,
    "escalated": 150,
    "active": 100
  }
}
```

---

### Billing

**Base Path:** `/billing`

#### Get Billing Info
```http
GET /billing
```

**Required Role:** OWNER

**Response:**
```json
{
  "subscription": {
    "plan": "Professional",
    "status": "active",
    "current_period_end": "2024-02-01T00:00:00Z"
  },
  "usage": {
    "conversations": 450,
    "limit": 1000,
    "percentage": 45
  },
  "invoices": [...]
}
```

#### Update Plan
```http
POST /billing/change-plan
```

**Body:**
```json
{
  "plan_id": "uuid"
}
```

---

### Stripe Checkout

**Base Path:** `/stripe-checkout`

#### Create Checkout Session
```http
POST /stripe-checkout
```

**Required Role:** OWNER

**Body:**
```json
{
  "plan_id": "uuid",
  "success_url": "https://app.example.com/billing?success=true",
  "cancel_url": "https://app.example.com/billing?canceled=true"
}
```

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/..."
}
```

---

### Stripe Webhook

**Base Path:** `/stripe-webhook`

#### Handle Webhook
```http
POST /stripe-webhook
```

**Note:** This endpoint uses service role authentication and validates Stripe signatures.

**Handled Events:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

---

### Widget Config

**Base Path:** `/widget-config`

#### Get Widget Config
```http
GET /widget-config/:agent_id
```

**Response:**
```json
{
  "primary_color": "#3B82F6",
  "position": "bottom-right",
  "welcome_message": "Hi! How can I help you today?",
  "allowed_domains": ["example.com", "app.example.com"]
}
```

#### Update Widget Config
```http
PUT /widget-config/:agent_id
```

**Required Role:** MANAGER

---

## Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing auth token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request body |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

- Default: 100 requests per minute per workspace
- Chat endpoint: 30 requests per minute per session
- Billing endpoints: 10 requests per minute

---

## CORS

All endpoints include CORS headers:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

---

## See Also

- [DATABASE.md](./DATABASE.md) - Database schema
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture decisions
- [HOOKS.md](./HOOKS.md) - Frontend hooks that consume these APIs
