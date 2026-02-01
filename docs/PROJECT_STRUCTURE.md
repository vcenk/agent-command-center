# Project Structure

## Overview

AgentCenter is an AI Agent Command Center built with React, TypeScript, and Supabase. This document outlines the complete file and folder structure.

## Root Directory

```
AgentCenter/
├── docs/                    # Documentation files
├── public/                  # Static assets
├── src/                     # Source code
├── supabase/                # Backend (Edge Functions + Migrations)
├── .env                     # Environment variables
├── .gitignore               # Git ignore rules
├── components.json          # shadcn/ui configuration
├── eslint.config.js         # ESLint configuration
├── index.html               # HTML entry point
├── package.json             # Dependencies & scripts
├── postcss.config.js        # PostCSS configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── tsconfig.app.json        # App-specific TS config
├── tsconfig.node.json       # Node-specific TS config
└── vite.config.ts           # Vite build configuration
```

## Source Code (`src/`)

```
src/
├── components/              # React components
│   ├── layout/              # Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── NavLink.tsx
│   ├── shared/              # Reusable shared components
│   │   ├── Breadcrumbs.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── PageHeader.tsx
│   ├── ui/                  # shadcn/ui components (55+)
│   │   ├── accordion.tsx
│   │   ├── alert.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   └── ... (50+ more)
│   └── RouteGuard.tsx       # Auth protection wrapper
│
├── constants/               # Application constants
│   ├── index.ts             # Constants barrel export
│   ├── channels.ts          # Channel type definitions
│   ├── domains.ts           # Business domain definitions
│   ├── llmProviders.ts      # LLM provider metadata
│   ├── personas.ts          # Persona tone/policy constants
│   └── roles.ts             # User role definitions
│
├── contexts/                # React contexts
│   └── AuthContext.tsx      # Authentication state
│
├── data/                    # Static data and templates
│   ├── index.ts             # Data barrel export
│   ├── templates.ts         # Agent templates
│   └── demoData.ts          # Demo data seeding
│
├── hooks/                   # Custom React hooks
│   ├── useAgents.ts         # Agent CRUD operations
│   ├── usePersonas.ts       # Persona management
│   ├── useKnowledgeSources.ts
│   ├── useChatSessions.ts
│   ├── useLeads.ts
│   ├── useLLMModels.ts
│   ├── useChannelConfigs.ts
│   ├── useWidgetConfig.ts
│   ├── useSecureAgents.ts
│   ├── use-mobile.tsx
│   └── use-toast.ts
│
├── integrations/            # Third-party integrations
│   └── supabase/
│       ├── client.ts        # Supabase client init
│       └── types.ts         # Auto-generated types
│
├── lib/                     # Utility libraries
│   ├── utils.ts             # General utilities (cn, etc.)
│   ├── mockDb.ts            # Mock database for dev
│   ├── api.ts               # API client (legacy)
│   ├── demoData.ts          # Demo data (legacy)
│   └── templates.ts         # Templates (legacy)
│
├── services/                # API services
│   ├── index.ts             # Services barrel export
│   └── api.ts               # Secure API client
│
├── pages/                   # Page components
│   ├── Auth.tsx             # Login/Register
│   ├── Index.tsx            # Landing redirect
│   ├── NoAccess.tsx         # Permission denied
│   ├── NotFound.tsx         # 404 page
│   ├── Onboarding.tsx       # Initial setup
│   ├── dashboard/           # Dashboard pages
│   │   ├── Overview.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── BillingPage.tsx
│   │   ├── AuditLogsPage.tsx
│   │   ├── TestChatPage.tsx
│   │   ├── agents/
│   │   │   ├── AgentsList.tsx
│   │   │   ├── AgentForm.tsx
│   │   │   ├── AgentDetail.tsx
│   │   │   ├── AgentInstall.tsx
│   │   │   └── AgentReview.tsx
│   │   ├── personas/
│   │   │   ├── PersonasList.tsx
│   │   │   ├── PersonaForm.tsx
│   │   │   └── PersonaDetail.tsx
│   │   ├── knowledge/
│   │   │   ├── KnowledgeList.tsx
│   │   │   ├── KnowledgeForm.tsx
│   │   │   └── KnowledgeDetail.tsx
│   │   ├── sessions/
│   │   │   ├── SessionsList.tsx
│   │   │   └── SessionDetail.tsx
│   │   ├── leads/
│   │   │   └── LeadsPage.tsx
│   │   ├── calls/
│   │   │   ├── CallsList.tsx
│   │   │   └── CallDetail.tsx
│   │   ├── channels/
│   │   │   └── ChannelsPage.tsx
│   │   └── templates/
│   │       ├── TemplatesPage.tsx
│   │       └── wizard/
│   │           ├── StepBasics.tsx
│   │           ├── StepPersona.tsx
│   │           ├── StepKnowledge.tsx
│   │           ├── StepChannels.tsx
│   │           ├── StepReview.tsx
│   │           └── WizardLayout.tsx
│   └── landing/
│       ├── LandingPage.tsx
│       └── components/
│           ├── Hero.tsx
│           ├── Features.tsx
│           ├── HowItWorks.tsx
│           ├── Pricing.tsx
│           ├── Testimonials.tsx
│           ├── CTA.tsx
│           ├── Footer.tsx
│           └── Navbar.tsx
│
├── types/                   # TypeScript type definitions
│   └── index.ts
│
├── App.tsx                  # Main app with routing
├── App.css                  # App styles
├── index.css                # Global styles
├── main.tsx                 # Entry point
└── vite-env.d.ts            # Vite type declarations
```

## Supabase Backend (`supabase/`)

```
supabase/
├── config.toml              # Local Supabase config
├── schema.sql               # Complete DB schema reference
├── functions/               # Edge Functions (Deno)
│   ├── _shared/
│   │   └── auth.ts          # Shared auth utilities
│   ├── agents/
│   │   └── index.ts
│   ├── personas/
│   │   └── index.ts
│   ├── chat/
│   │   └── index.ts
│   ├── knowledge/
│   │   └── index.ts
│   ├── sessions/
│   │   └── index.ts
│   ├── log-chat-session/
│   │   └── index.ts
│   ├── analytics/
│   │   └── index.ts
│   ├── billing/
│   │   └── index.ts
│   ├── stripe-checkout/
│   │   └── index.ts
│   ├── stripe-webhook/
│   │   └── index.ts
│   └── widget-config/
│       └── index.ts
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
└── migrations/              # Database migrations
    ├── 20260102000000_initial_schema.sql
    ├── 20260102000001_agents.sql
    ├── 20260102000002_personas.sql
    ├── 20260102000003_knowledge.sql
    ├── 20260102000004_sessions.sql
    ├── 20260102000005_leads.sql
    ├── 20260102000006_channels.sql
    ├── 20260102000007_widget_config.sql
    ├── 20260102000008_rls_policies.sql
    ├── 20260102000009_functions.sql
    ├── 20260116000000_llm_providers.sql
    ├── 20260116000001_secure_rls.sql
    └── 20260116000002_billing.sql
```

## Public Assets (`public/`)

```
public/
├── favicon.ico              # Browser favicon
├── placeholder.svg          # Placeholder image
├── robots.txt               # Search engine rules
└── widget.js                # Embeddable chat widget
```

## Key Files Description

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main routing configuration |
| `src/main.tsx` | React entry point |
| `src/contexts/AuthContext.tsx` | Global auth state management |
| `src/integrations/supabase/client.ts` | Supabase client initialization |
| `supabase/functions/_shared/auth.ts` | Shared authentication utilities |
| `supabase/schema.sql` | Complete database schema reference |

## Component Categories

### Layout Components
- **DashboardLayout**: Main dashboard wrapper with sidebar
- **Sidebar**: Navigation menu with workspace switcher
- **TopBar**: Header with user menu and settings

### Shared Components
- **Breadcrumbs**: Navigation breadcrumbs
- **PageHeader**: Page title with description
- **ConfirmDialog**: Confirmation modal

### UI Components (shadcn/ui)
55+ pre-built components including forms, modals, tables, and more.

## See Also

- [DATABASE.md](./DATABASE.md) - Database schema documentation
- [API.md](./API.md) - Edge Functions API reference
- [HOOKS.md](./HOOKS.md) - Custom hooks documentation
- [COMPONENTS.md](./COMPONENTS.md) - Component documentation
