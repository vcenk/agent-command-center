# Documentation Index

## Agent Command Center Documentation

Complete documentation for building, deploying, and managing AI conversational agents.

---

## Quick Start

| Document | Description |
|----------|-------------|
| [Getting Started](./GETTING_STARTED.md) | Installation and first steps |
| [Setup Guide](./SETUP.md) | Detailed setup with Supabase CLI |

---

## Project Documentation

| Document | Description |
|----------|-------------|
| [Project Structure](./PROJECT_STRUCTURE.md) | Complete file and folder organization |
| [Architecture](./ARCHITECTURE.md) | System design, patterns, and decisions |
| [Rules](./RULES.md) | Coding standards and conventions |

---

## Feature Documentation

| Document | Description |
|----------|-------------|
| [Features](./FEATURES.md) | Complete feature documentation |
| [Skills](./SKILLS.md) | Capabilities and skills overview |

---

## Technical Reference

| Document | Description |
|----------|-------------|
| [Database](./DATABASE.md) | Schema, tables, RLS, and migrations |
| [API](./API.md) | Edge Functions API reference |
| [Hooks](./HOOKS.md) | Custom React hooks |
| [Components](./COMPONENTS.md) | UI component library |

---

## Operations

| Document | Description |
|----------|-------------|
| [Deployment](./DEPLOYMENT.md) | Production deployment guide |
| [Troubleshooting](./TROUBLESHOOTING.md) | Common issues and solutions |

---

## Document Overview

```
docs/
├── INDEX.md              # This file - documentation index
├── GETTING_STARTED.md    # Quick start guide
├── SETUP.md              # Detailed setup with CLI
├── PROJECT_STRUCTURE.md  # File/folder organization
├── ARCHITECTURE.md       # System design
├── DATABASE.md           # Database schema
├── API.md                # API reference
├── HOOKS.md              # React hooks
├── COMPONENTS.md         # UI components
├── FEATURES.md           # Feature documentation
├── SKILLS.md             # Capabilities overview
├── RULES.md              # Coding standards
├── DEPLOYMENT.md         # Production deployment
└── TROUBLESHOOTING.md    # Issue resolution
```

---

## Key Concepts

### Multi-Tenancy
Every user belongs to a workspace. All data is isolated by `workspace_id`.

### Agents
AI-powered conversational bots with customizable behavior.

### Personas
Reusable personality configurations for agents.

### Knowledge Base
Content that powers agent responses via RAG (Retrieval Augmented Generation).

### Channels
Communication channels: web chat, phone, SMS, WhatsApp.

### Leads
Contact information captured from conversations.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui, Tailwind CSS |
| State | TanStack React Query |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| AI | OpenAI GPT-4o-mini |
| Payments | Stripe |

---

## Quick Links

### Dashboard URLs
- Local: http://localhost:8080
- Supabase: https://supabase.com/dashboard/project/PROJECT_ID

### Key Files
| File | Purpose |
|------|---------|
| `src/App.tsx` | Main routing |
| `src/contexts/AuthContext.tsx` | Authentication |
| `src/integrations/supabase/client.ts` | Database client |
| `supabase/functions/chat/index.ts` | AI chat logic |

---

## External Resources

- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [OpenAI API](https://platform.openai.com/docs)

---

## Contributing to Docs

1. Create/edit files in `docs/` folder
2. Use Markdown formatting
3. Add to this index
4. Cross-link related documents
