# Agent Command Center - Complete Setup Guide

Complete setup guide for deploying Agent Command Center with all required configurations.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Supabase Project Setup](#supabase-project-setup)
4. [Supabase Secrets Configuration](#supabase-secrets-configuration)
5. [Database Setup](#database-setup)
6. [Edge Functions Deployment](#edge-functions-deployment)
7. [OAuth Integration Setup](#oauth-integration-setup)
8. [Stripe Billing Setup](#stripe-billing-setup)
9. [Run the Application](#run-the-application)
10. [Deployment Checklist](#deployment-checklist)
11. [Verification Steps](#verification-steps)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Supabase CLI (`npm install -g supabase`)
- Git
- A Supabase account (free tier works)
- (Optional) Stripe account for billing features
- (Optional) Slack workspace for integration
- (Optional) Google Cloud account for Calendar integration

---

## Environment Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd agent-command-center

# Install dependencies
npm install
```

### 2. Create Environment File

```bash
# Copy the example file
cp .env.example .env.local
```

### 3. Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create one)
3. Go to **Settings > API**
4. Copy these values to `.env.local`:

```env
# Your Supabase project ID (from project URL)
VITE_SUPABASE_PROJECT_ID=your-project-id

# Supabase project URL
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase anon/public key (safe for frontend)
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**IMPORTANT**: Never expose the service role key in frontend code!

---

## Supabase Project Setup

### 1. Create Supabase Project (if new)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and enter:
   - **Project name**: `agent-command-center`
   - **Database password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for project to be created

### 2. Link Project to CLI

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project (get project-ref from Supabase dashboard URL)
npx supabase link --project-ref your-project-id
```

### 3. Configure Authentication

1. Go to **Authentication > Providers > Email**
2. Ensure **Enable Email provider** is ON
3. (Optional) Toggle OFF **Confirm email** for faster testing

4. Go to **Authentication > URL Configuration**
5. Set **Site URL** to your app URL (e.g., `http://localhost:8080`)
6. Add to **Redirect URLs**:
   - `http://localhost:8080`
   - `http://localhost:8080/auth`
   - `http://localhost:8080/dashboard`
   - Your production URLs

---

## Supabase Secrets Configuration

These secrets are stored securely in Supabase and used by Edge Functions. **This is the most critical step!**

### Required Secrets

| Secret | Required | How to Get |
|--------|----------|------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase Dashboard > Settings > API > service_role secret |
| `ENCRYPTION_KEY` | Yes | Generate: `openssl rand -base64 32` |
| `FRONTEND_URL` | Yes | Your app URL (e.g., `https://your-domain.com`) |
| `OPENAI_API_KEY` | At least one LLM | https://platform.openai.com/api-keys |
| `ANTHROPIC_API_KEY` | Optional | https://console.anthropic.com/ |
| `GOOGLE_AI_API_KEY` | Optional | https://makersuite.google.com/app/apikey |

### Set Required Secrets

```bash
# 1. Service role key (REQUIRED)
# Get from: Supabase Dashboard > Project Settings > API > service_role secret
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 2. Encryption key for OAuth tokens (REQUIRED)
# Generate with: openssl rand -base64 32
# On Windows without openssl, use: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
npx supabase secrets set ENCRYPTION_KEY=your-32-character-encryption-key-here

# 3. Frontend URL for OAuth redirects (REQUIRED)
npx supabase secrets set FRONTEND_URL=https://your-domain.com
# For local development:
npx supabase secrets set FRONTEND_URL=http://localhost:8080
```

### Set LLM Provider Keys (at least one required)

```bash
# OpenAI (recommended)
npx supabase secrets set OPENAI_API_KEY=sk-...

# OR Anthropic
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# OR Google AI
npx supabase secrets set GOOGLE_AI_API_KEY=...
```

### Verify Secrets

```bash
# List all configured secrets
npx supabase secrets list
```

You should see:
```
NAME                        DIGEST
ENCRYPTION_KEY              ********
FRONTEND_URL               ********
OPENAI_API_KEY             ********
SUPABASE_SERVICE_ROLE_KEY  ********
```

---

## Database Setup

### 1. Push Migrations

```bash
# Push all migrations to remote database
npx supabase db push
```

### 2. Verify Tables Created

Go to Supabase Dashboard > Table Editor. You should see these tables:

| Table | Purpose |
|-------|---------|
| `workspaces` | Multi-tenant workspace isolation |
| `profiles` | User profiles linked to auth.users |
| `user_roles` | RBAC (OWNER, MANAGER, VIEWER) |
| `agents` | AI agent configurations |
| `personas` | Agent personality/behavior settings |
| `knowledge_sources` | RAG knowledge base |
| `knowledge_chunks` | Chunked documents with embeddings |
| `chat_sessions` | Conversation history |
| `leads` | Captured lead information |
| `channel_configs` | Per-channel agent settings |
| `workspace_integrations` | OAuth connections (Slack, Calendar) |
| `bookings` | Calendar appointments |
| `subscriptions` | Stripe subscription data |
| `llm_models` | Available LLM models |

---

## Edge Functions Deployment

### Deploy All Functions

```bash
# Deploy all functions at once
npx supabase functions deploy
```

### Or Deploy Individually

```bash
# Core functions
npx supabase functions deploy agents
npx supabase functions deploy personas
npx supabase functions deploy knowledge
npx supabase functions deploy sessions
npx supabase functions deploy leads
npx supabase functions deploy channel-configs
npx supabase functions deploy chat
npx supabase functions deploy widget
npx supabase functions deploy widget-config

# Integration functions
npx supabase functions deploy integrations
npx supabase functions deploy calendar
npx supabase functions deploy slack

# Billing functions
npx supabase functions deploy billing
npx supabase functions deploy stripe-checkout
npx supabase functions deploy stripe-webhook

# Other
npx supabase functions deploy analytics
npx supabase functions deploy generate-embeddings
npx supabase functions deploy tools
```

### Verify Deployment

```bash
# List deployed functions
npx supabase functions list
```

---

## OAuth Integration Setup

### Slack Integration (Optional)

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click "Create New App" > "From scratch"
3. Enter app name (e.g., "Agent Command Center") and select workspace
4. Go to **OAuth & Permissions**:
   - Add Redirect URL: `https://YOUR-PROJECT-ID.supabase.co/functions/v1/slack/callback`
   - Add Bot Token Scopes:
     - `chat:write`
     - `channels:read`
     - `users:read`
5. Go to **Basic Information** and copy Client ID & Client Secret
6. Set secrets:
   ```bash
   npx supabase secrets set SLACK_CLIENT_ID=your-client-id
   npx supabase secrets set SLACK_CLIENT_SECRET=your-client-secret
   ```

### Google Calendar Integration (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Go to **APIs & Services > Library**, search and enable **Google Calendar API**
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI: `https://YOUR-PROJECT-ID.supabase.co/functions/v1/google_calendar/callback`
6. Copy Client ID and Client Secret
7. Go to **OAuth consent screen** (if prompted):
   - Choose "External" user type
   - Fill in app name and support email
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/calendar.events`
8. Set secrets:
   ```bash
   npx supabase secrets set GOOGLE_CALENDAR_CLIENT_ID=your-client-id
   npx supabase secrets set GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret
   ```

---

## Stripe Billing Setup (Optional)

### 1. Create Stripe Products

In [Stripe Dashboard > Products](https://dashboard.stripe.com/products):

Create three products with monthly recurring prices:

| Product | Price | Price ID (example) |
|---------|-------|-------------------|
| Free | $0/month | price_free_xxx |
| Pro | $49/month | price_pro_xxx |
| Enterprise | $199/month | price_ent_xxx |

### 2. Configure Webhook

1. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://YOUR-PROJECT-ID.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the Signing Secret

### 3. Set Secrets

```bash
# Use sk_test_ for testing, sk_live_ for production
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

## Run the Application

### Development

```bash
# Start development server
npm run dev
```

Access at [http://localhost:8080](http://localhost:8080)

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Deployment Checklist

### Required (Must Complete)

- [ ] Supabase project created
- [ ] `.env.local` configured:
  - [ ] `VITE_SUPABASE_PROJECT_ID`
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] Supabase secrets set:
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `ENCRYPTION_KEY` (32+ characters)
  - [ ] `FRONTEND_URL`
  - [ ] At least one LLM key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_AI_API_KEY`)
- [ ] Database migrations pushed (`npx supabase db push`)
- [ ] Edge Functions deployed (`npx supabase functions deploy`)
- [ ] Authentication configured (Email provider enabled)

### Optional Integrations

- [ ] Slack OAuth:
  - [ ] `SLACK_CLIENT_ID`
  - [ ] `SLACK_CLIENT_SECRET`
  - [ ] Redirect URL configured in Slack app
- [ ] Google Calendar OAuth:
  - [ ] `GOOGLE_CALENDAR_CLIENT_ID`
  - [ ] `GOOGLE_CALENDAR_CLIENT_SECRET`
  - [ ] Redirect URL configured in Google Cloud
- [ ] Stripe Billing:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] Webhook endpoint configured

### Production Deployment

- [ ] Update `FRONTEND_URL` secret to production URL
- [ ] Update Supabase Auth redirect URLs for production
- [ ] Update OAuth redirect URLs (Slack, Google) for production
- [ ] Use production Stripe keys (`sk_live_` instead of `sk_test_`)
- [ ] Enable email confirmation in Supabase Auth
- [ ] Deploy frontend to hosting (Vercel, Netlify, etc.)

---

## Verification Steps

### 1. Test Authentication

1. Open the app at `http://localhost:8080`
2. Click "Sign Up" and create an account
3. Complete email verification (if enabled)
4. Complete onboarding to create workspace

### 2. Test Agent Creation

1. Go to Dashboard > Agents
2. Click "Create Agent"
3. Fill in agent details and save
4. Verify agent appears in list

### 3. Test Chat Widget

1. Go to agent detail page
2. Click "Install" tab
3. Copy embed code
4. Paste into a test HTML file
5. Verify chat widget loads and responds

### 4. Test API Security

```bash
# Should fail without auth
curl https://YOUR-PROJECT-ID.supabase.co/functions/v1/agents

# Should work with valid token (get from browser dev tools after login)
curl https://YOUR-PROJECT-ID.supabase.co/functions/v1/agents \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. View Logs

```bash
# View all function logs
npx supabase functions logs --all

# View specific function
npx supabase functions logs chat --follow
```

---

## Troubleshooting

### Common Errors

| Error | Solution |
|-------|----------|
| "Missing authorization header" | User not logged in, or token not being sent |
| "Invalid or expired token" | Token expired, user needs to re-login |
| "No workspace found" | User hasn't completed onboarding |
| "Manager role required" | User has VIEWER role, needs upgrade |
| "ENCRYPTION_KEY environment variable is required" | Set `ENCRYPTION_KEY` secret |
| "Missing client ID" | Set OAuth secrets for the integration |
| "Rate limit exceeded" | Wait and retry |

### Debug Commands

```bash
# Check Supabase project status
npx supabase status

# List secrets (shows names, not values)
npx supabase secrets list

# List deployed functions
npx supabase functions list

# View function logs
npx supabase functions logs FUNCTION_NAME --follow

# Check database diff
npx supabase db diff
```

### Reset Database (Development Only!)

```bash
# WARNING: This deletes all data!
npx supabase db reset
```

---

## Security Notes

1. **Never commit `.env.local`** to version control (it's in `.gitignore`)
2. **Service role key** is only for Edge Functions, never expose in frontend
3. **Encryption key** should be unique per environment (dev/staging/prod)
4. **OAuth tokens** are encrypted at rest using AES-256-GCM
5. **All API calls** go through authenticated Edge Functions
6. **RLS policies** provide additional database-level security

See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for detailed security information.

---

## Quick Reference

### Environment Variables (.env.local)

```env
VITE_SUPABASE_PROJECT_ID=xxx
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

### Supabase Secrets (set via CLI)

```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxx
npx supabase secrets set ENCRYPTION_KEY=xxx
npx supabase secrets set FRONTEND_URL=xxx
npx supabase secrets set OPENAI_API_KEY=xxx
# Optional:
npx supabase secrets set ANTHROPIC_API_KEY=xxx
npx supabase secrets set SLACK_CLIENT_ID=xxx
npx supabase secrets set SLACK_CLIENT_SECRET=xxx
npx supabase secrets set GOOGLE_CALENDAR_CLIENT_ID=xxx
npx supabase secrets set GOOGLE_CALENDAR_CLIENT_SECRET=xxx
npx supabase secrets set STRIPE_SECRET_KEY=xxx
npx supabase secrets set STRIPE_WEBHOOK_SECRET=xxx
```

### Common Commands

```bash
npm run dev                     # Start dev server
npm run build                   # Build for production
npx supabase db push           # Push migrations
npx supabase functions deploy  # Deploy all functions
npx supabase secrets list      # List secrets
npx supabase functions logs X  # View function logs
```

---

## Next Steps

After setup is complete:

1. **Create an Agent**: Use a template or build from scratch
2. **Add a Persona**: Define your agent's personality
3. **Add Knowledge**: Upload documents or paste text
4. **Test Chat**: Use the built-in test chat feature
5. **Deploy Widget**: Install on your website

See [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed usage instructions.
