# Features

## Overview

Complete feature documentation for Agent Command Center.

---

## Dashboard

### Overview Page

The main dashboard provides a quick summary of your workspace.

**Widgets:**
- Setup checklist (for new users)
- Quick stats (agents, conversations, leads)
- Recent activity
- Performance alerts

**Quick Actions:**
- Create new agent
- View recent conversations
- Access settings

---

## Agent Management

### Agent List

View and manage all agents in your workspace.

**Features:**
- Table view with sorting
- Status filters (draft/live)
- Quick actions (edit, delete, duplicate)
- Search by name

**Columns:**
| Column | Description |
|--------|-------------|
| Name | Agent display name |
| Status | Draft or Live |
| Domain | Business category |
| Channels | Enabled channels |
| Created | Creation date |
| Actions | Edit, Delete, etc. |

### Agent Creation

Multi-step wizard for creating new agents.

**Step 1: Basics**
- Agent name
- Description
- Business domain
- Goals

**Step 2: Persona**
- Select existing or create new
- Tone selection
- Greeting script
- Behavior guidelines

**Step 3: Knowledge**
- Add knowledge sources
- Text, URL, or PDF
- Preview chunks

**Step 4: Channels**
- Enable Web Chat
- Configure widget
- (Future: Phone, SMS, WhatsApp)

**Step 5: Review**
- Summary of configuration
- Publish or save as draft

### Agent Templates

Pre-built configurations for common use cases.

**Available Templates:**

| Template | Domain | Channels | Use Case |
|----------|--------|----------|----------|
| Website Assistant | General | Web | Answer visitor questions |
| Lead Capture | Sales | WhatsApp | Qualify and capture leads |
| Appointment Booking | Services | Web, SMS | Schedule appointments |

### Agent Installation

Instructions for deploying agents.

**Web Widget:**
```html
<script src="https://your-domain.com/widget.js"></script>
<script>
  AgentWidget.init({
    agentId: 'your-agent-id',
    position: 'bottom-right'
  });
</script>
```

---

## Persona Management

### Persona List

Manage reusable agent personalities.

**Features:**
- Create, edit, delete personas
- Assign to multiple agents
- Preview persona behavior

### Persona Configuration

**Basic Settings:**
- Name
- Role title
- Tone (professional, friendly, casual, formal)

**Behavioral Settings:**
- Greeting script
- Style notes
- Guardrails (do not do list)
- Fallback policy
- Escalation rules

---

## Knowledge Base

### Knowledge Sources

Manage content that powers agent responses.

**Source Types:**

| Type | Description | Processing |
|------|-------------|------------|
| TEXT | Direct text input | Auto-chunked |
| URL | Web page scraping | Extracted & chunked |
| PDF | Document upload | OCR & chunked |

### Knowledge Chunks

View processed content segments.

**Features:**
- Preview chunk content
- Edit individual chunks
- Delete unwanted chunks
- Re-process source

**Chunk Settings:**
- Default size: 1000 characters
- Overlap: 100 characters

---

## Conversations

### Session List

View all chat conversations.

**Filters:**
- Agent
- Status (active, completed, escalated)
- Channel
- Date range
- Search

**Columns:**
| Column | Description |
|--------|-------------|
| Session ID | Unique identifier |
| Agent | Associated agent |
| Status | Current status |
| Channel | Source channel |
| Messages | Message count |
| Started | Start time |
| Duration | Session length |

### Session Detail

Full conversation transcript.

**Features:**
- Message-by-message view
- User and agent messages
- Timestamps
- Internal notes (staff only)
- Lead information
- Export transcript

---

## Lead Management

### Lead List

View captured leads.

**Filters:**
- Agent
- Channel
- Date range
- Has email/phone

**Lead Card:**
- Name (if captured)
- Email
- Phone
- Source agent
- Source channel
- Capture date
- Conversation link

### Lead Export

Export leads to external systems.

**Export Formats:**
- CSV
- JSON
- (Planned: Direct CRM sync)

---

## Analytics

### Dashboard Metrics

**Key Metrics:**
- Total conversations
- Conversations this month
- Average messages per session
- Lead conversion rate

**Charts:**
- Conversations over time
- Channel breakdown
- Status distribution
- Agent comparison

### Custom Reports

Build custom analytics views.

**Dimensions:**
- Time period
- Agent
- Channel
- Status

**Metrics:**
- Conversation count
- Message count
- Lead count
- Average duration

---

## Settings

### Workspace Settings

Configure workspace-level options.

**General:**
- Workspace name
- Default timezone
- Language preferences

**Team:**
- Invite members
- Manage roles
- Remove members

**Danger Zone:**
- Delete workspace

### LLM Configuration

Configure AI model providers.

**Per Provider:**
- API key (encrypted)
- Base URL (for custom)
- Enable/disable

**Per Agent:**
- Model selection
- Temperature
- Max tokens

### Billing

Manage subscription and usage.

**Sections:**
- Current plan
- Usage this period
- Payment method
- Invoice history
- Upgrade/downgrade

---

## Test Chat

### Chat Playground

Test agents before deployment.

**Features:**
- Select any agent
- Real-time chat
- View system prompt
- Debug mode
- Clear conversation

---

## Audit Logs

### Activity History

Track all workspace actions.

**Logged Events:**
- Agent created/updated/deleted
- Persona changes
- Knowledge updates
- Team changes
- Settings modifications

**Log Entry:**
- Timestamp
- Actor (user)
- Action type
- Resource affected
- Before/after data

---

## Web Widget

### Widget Configuration

Customize the chat widget appearance.

**Options:**
- Primary color
- Position (bottom-right, bottom-left)
- Welcome message
- Allowed domains

### Widget Installation

```html
<!-- Add to your website -->
<script
  src="https://ehvcrdooykxmcpcopuxz.supabase.co/functions/v1/widget.js"
  data-agent-id="YOUR_AGENT_ID">
</script>
```

---

## Security Features

### Authentication

- Email/password login
- (Planned: OAuth providers)
- Session management
- Password reset

### Authorization

- Role-based access control
- Workspace isolation
- Row Level Security

### Data Protection

- Encrypted API keys
- HTTPS only
- CORS protection
- Domain whitelisting

---

## See Also

- [SKILLS.md](./SKILLS.md) - Capabilities overview
- [API.md](./API.md) - API documentation
- [SETUP.md](./SETUP.md) - Installation guide
