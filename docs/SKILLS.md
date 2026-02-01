# Skills & Capabilities

## Overview

Agent Command Center provides a comprehensive set of skills and capabilities for building, managing, and deploying AI-powered conversational agents.

---

## Core Skills

### 1. Agent Creation & Management

**Capability:** Create, configure, and deploy AI agents with custom behaviors.

| Skill | Description |
|-------|-------------|
| Template-based setup | Start from pre-built templates for common use cases |
| Custom configuration | Define goals, channels, and business domain |
| Multi-step wizard | Guided setup process for new agents |
| Draft/Live modes | Test agents before going live |
| Versioning | Track changes to agent configurations |

**Usage:**
```
Dashboard → Agents → Create New Agent
- Select template or start from scratch
- Configure persona, knowledge, channels
- Review and publish
```

---

### 2. Persona System

**Capability:** Define agent personalities, tones, and behavioral guidelines.

| Skill | Description |
|-------|-------------|
| Tone selection | Professional, friendly, casual, formal |
| Greeting scripts | Custom welcome messages |
| Style notes | Detailed behavioral instructions |
| Guardrails | "Do not do" restrictions |
| Fallback policies | How to handle unknown requests |
| Escalation rules | When to involve humans |

**Persona Tones:**
- **Professional** - Business-appropriate communication
- **Friendly** - Warm and approachable
- **Casual** - Relaxed and conversational
- **Formal** - Official and structured

**Fallback Policies:**
- **Apologize** - Politely acknowledge limitations
- **Escalate** - Transfer to human support
- **Retry** - Ask for clarification
- **Transfer** - Route to another department

---

### 3. Knowledge Base Management

**Capability:** Build and manage knowledge bases for RAG-powered responses.

| Skill | Description |
|-------|-------------|
| Text upload | Paste or type content directly |
| URL scraping | Import content from web pages |
| PDF processing | Extract text from documents |
| Auto-chunking | Split content into retrievable segments |
| Keyword matching | Find relevant knowledge for queries |

**Knowledge Types:**
- `TEXT` - Plain text content
- `URL` - Web page content
- `PDF` - Document content

**How RAG Works:**
1. User sends message
2. System extracts keywords
3. Matches against knowledge chunks
4. Includes relevant context in prompt
5. AI generates informed response

---

### 4. Multi-Channel Support

**Capability:** Deploy agents across multiple communication channels.

| Channel | Status | Features |
|---------|--------|----------|
| Web Chat | Active | Embeddable widget, customizable UI |
| Phone | Planned | Voice calls with AI |
| SMS | Planned | Text message conversations |
| WhatsApp | Planned | WhatsApp Business integration |
| Email | Planned | Email response automation |

**Web Widget Features:**
- Custom colors and positioning
- Domain whitelisting
- Welcome messages
- Mobile responsive

---

### 5. Lead Capture

**Capability:** Automatically capture and track leads from conversations.

| Skill | Description |
|-------|-------------|
| Auto-detection | Extract emails and phone numbers from chat |
| Lead scoring | Qualify leads based on conversation |
| CRM integration | Export leads to external systems |
| Follow-up tracking | Monitor lead status |

**Auto-Captured Fields:**
- Email addresses (regex detection)
- Phone numbers (multiple formats)
- Name (when provided)
- Source channel
- Conversation context

---

### 6. Conversation Management

**Capability:** Track, review, and manage all agent conversations.

| Skill | Description |
|-------|-------------|
| Session history | Full transcript of conversations |
| Status tracking | Active, completed, escalated |
| Internal notes | Staff annotations |
| Search & filter | Find specific conversations |
| Export | Download conversation data |

**Session Statuses:**
- `active` - Ongoing conversation
- `completed` - Successfully concluded
- `escalated` - Transferred to human

---

### 7. Analytics & Reporting

**Capability:** Track agent performance and business metrics.

| Metric | Description |
|--------|-------------|
| Total conversations | Volume tracking |
| Messages per session | Engagement depth |
| Lead conversion rate | Capture effectiveness |
| Channel breakdown | Usage by channel |
| Response times | Performance monitoring |

**Dashboard Widgets:**
- Conversation trends
- Lead funnel
- Channel distribution
- Agent performance comparison

---

### 8. Team Collaboration

**Capability:** Multi-user workspace with role-based access.

| Role | Permissions |
|------|-------------|
| **Owner** | Full access, billing, team management |
| **Manager** | Create/edit agents, personas, knowledge |
| **Viewer** | Read-only access to all data |

**Team Features:**
- Workspace switching
- Role assignment
- Activity audit logs
- Shared resources

---

### 9. LLM Configuration

**Capability:** Configure AI models and providers.

| Provider | Models Available |
|----------|------------------|
| OpenAI | GPT-4, GPT-4o, GPT-3.5 |
| Anthropic | Claude 3.5 Sonnet, Haiku, Opus |
| Google | Gemini 1.5 Pro, Flash |
| Mistral | Large, Medium, Small |
| Groq | Llama, Mixtral (fast) |
| Together | Open source models |
| Custom | OpenAI-compatible endpoints |

**Configuration Options:**
- Model selection per agent
- Temperature control
- Max token limits
- API key management per workspace

---

### 10. Billing & Usage

**Capability:** Subscription management and usage tracking.

| Plan | Conversations/month | Features |
|------|---------------------|----------|
| Starter | 500 | Basic features |
| Professional | 2,000 | Advanced analytics |
| Enterprise | Unlimited | Custom integrations |

**Billing Features:**
- Stripe integration
- Usage dashboards
- Invoice history
- Plan upgrades/downgrades

---

## API Skills

### Edge Functions

| Function | Purpose |
|----------|---------|
| `/agents` | CRUD operations for agents |
| `/personas` | Manage agent personas |
| `/chat` | AI chat completions |
| `/knowledge` | Knowledge base operations |
| `/sessions` | Conversation management |
| `/analytics` | Usage metrics |
| `/billing` | Subscription management |

See [API.md](./API.md) for full reference.

---

## Integration Skills

### Current Integrations

| Integration | Type | Status |
|-------------|------|--------|
| Supabase | Backend | Active |
| OpenAI | LLM | Active |
| Stripe | Billing | Active |

### Planned Integrations

| Integration | Type | Status |
|-------------|------|--------|
| Calendly | Scheduling | Planned |
| Zapier | Automation | Planned |
| Slack | Notifications | Planned |
| HubSpot | CRM | Planned |
| Twilio | SMS/Voice | Planned |

---

## Technical Skills

### Frontend

- React 18 with TypeScript
- TanStack React Query for data fetching
- shadcn/ui component library
- Tailwind CSS styling
- React Router navigation
- Form validation with Zod

### Backend

- Supabase PostgreSQL database
- Edge Functions (Deno runtime)
- Row Level Security
- Real-time subscriptions
- File storage

---

## See Also

- [FEATURES.md](./FEATURES.md) - Detailed feature documentation
- [API.md](./API.md) - API reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
