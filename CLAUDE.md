# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Command Center (Agentland) — a multi-tenant SaaS platform for building, deploying, and managing AI conversational agents across web chat, phone, SMS, and WhatsApp channels. Built with React + Supabase.

## Commands

```bash
npm run dev        # Start dev server on http://localhost:8081
npm run build      # Production build (output: dist/)
npm run preview    # Preview production build
npm run lint       # ESLint checks
```

No test framework is currently configured.

### Supabase

```bash
npx supabase start                    # Start local Supabase
npx supabase db reset                 # Reset DB and run all migrations
npx supabase functions serve          # Serve Edge Functions locally
npx supabase functions deploy <name>  # Deploy a single Edge Function
```

## Architecture

### Request Flow

```
React UI → Edge Functions (Deno) → PostgreSQL (with RLS)
         ↘ Supabase Auth (JWT)
```

The frontend **never** talks directly to the database. All CRUD goes through Edge Functions at `VITE_SUPABASE_URL/functions/v1/<function-name>`. The secure API client in `src/lib/api.ts` handles auth token refresh and request routing.

### Frontend Stack

- **React 18** with TypeScript, **Vite 7** bundler
- **React Router DOM 6** — 43+ routes, all lazy-loaded via `React.lazy`
- **TanStack React Query** — server state, caching, mutations
- **React Hook Form + Zod** — form handling and validation
- **shadcn/ui + Radix UI + Tailwind CSS** — component library (55+ components in `src/components/ui/`)
- **Framer Motion** — animations
- Path alias: `@/` maps to `./src/`

### Backend Stack

- **Supabase** — Auth, PostgreSQL, Edge Functions (Deno runtime)
- **Row Level Security** — workspace isolation at the database level
- **Stripe** — billing and subscriptions
- Edge Functions use `supabase/functions/_shared/auth.ts` for JWT verification and RBAC

### Key Directories

| Path | Purpose |
|------|---------|
| `src/lib/api.ts` | Secure API client (token refresh, request routing) |
| `src/services/api.ts` | Unified API service layer |
| `src/contexts/AuthContext.tsx` | Auth state, workspace management, session handling |
| `src/hooks/` | React Query hooks for each entity (agents, personas, leads, etc.) |
| `src/pages/dashboard/` | Dashboard page components (agents, sessions, analytics, billing, etc.) |
| `src/components/shared/` | Reusable business components (EmptyState, FilterBar, StatusBadge) |
| `src/constants/` | App constants (channels, domains, LLM providers, roles) |
| `supabase/functions/` | Edge Functions — each subfolder is an endpoint |
| `supabase/functions/_shared/` | Shared utilities (auth, crypto, rate limiting, schemas) |
| `supabase/migrations/` | PostgreSQL migration files |

### Data Patterns

- **Multi-tenancy**: All tables have `workspace_id`. RLS policies enforce isolation.
- **RBAC**: Roles are OWNER > MANAGER > VIEWER. Checked in Edge Functions via `hasMinRole()`.
- **React Query keys**: Follow `['entity', workspaceId]` pattern. Mutations invalidate matching keys.
- **Auth flow**: Supabase Auth → JWT → `AuthContext` stores user/workspace/role → API client attaches Bearer token.

### Edge Function Pattern

Every Edge Function follows this structure:
1. Handle CORS preflight (`OPTIONS`)
2. Call `authenticateRequest(req)` to get `{ user, workspaceId, role }`
3. Route by HTTP method (GET/POST/PUT/DELETE)
4. Check role permissions for mutations
5. Use service role client for database operations

## Environment Variables

Copy `.env.example` to `.env`. Required variables:

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key
- `VITE_SUPABASE_PROJECT_ID` — Project ID for function URLs

Edge Functions need (set in Supabase dashboard or `.env`):
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `ENCRYPTION_KEY` for stored API keys
- OAuth credentials for Slack and Google Calendar integrations

## Coding Conventions

- **Components**: PascalCase files, named exports (default exports only for pages)
- **Hooks**: `use` prefix, camelCase files
- **Folders**: lowercase, kebab-case for multi-word
- **Interfaces** for objects, **types** for unions/utilities
- **Tailwind class order**: layout → spacing → sizing → typography → colors → effects
- **Mobile-first** responsive design
- **No `any` types** — use `unknown` if needed
- All API responses go through Edge Functions, not direct Supabase client queries (except `useLLMModels` which reads public data directly)

## Known Issues

- The `.env` file was deleted from the repo. You must create it from `.env.example` with valid Supabase credentials or the app will fail at runtime (API URLs become `undefined/functions/v1`).
- Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) are used without null checks in `src/lib/api.ts` and `src/integrations/supabase/client.ts`. Missing values cause silent failures.
- `src/pages/dashboard/channels/ChannelsPage.tsx` has a hardcoded Supabase URL fallback — not portable across environments.
- `tsconfig.app.json` has strict mode disabled despite `docs/RULES.md` recommending strict TypeScript.
- Security audit in `docs/SECURITY_AUDIT.md` lists critical and high-priority issues that are not yet resolved.

## Documentation

Comprehensive docs are in `docs/` — see `docs/INDEX.md` for navigation. Key files: `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `SETUP.md`, `SECURITY_AUDIT.md`.
