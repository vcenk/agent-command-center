# Deployment Guide

## Overview

This guide covers deploying Agent Command Center to production environments.

---

## Deployment Options

| Option | Complexity | Best For |
|--------|------------|----------|
| Vercel | Easy | Quick deployment, auto-scaling |
| Netlify | Easy | Static hosting, forms |
| AWS | Medium | Full control, enterprise |
| Docker | Medium | Self-hosted, custom infra |

---

## Prerequisites

Before deploying:

1. **Supabase Project** - Production project configured
2. **Environment Variables** - All secrets set
3. **Domain** - Custom domain (optional)
4. **SSL Certificate** - HTTPS enabled

---

## Vercel Deployment

### Step 1: Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New Project**
3. Import your Git repository
4. Select the `AgentCenter` folder

### Step 2: Configure Build

**Build Settings:**
```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### Step 3: Environment Variables

Add these in Vercel project settings:

```env
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### Step 4: Deploy

Click **Deploy** and wait for build completion.

### Step 5: Custom Domain

1. Go to **Project Settings > Domains**
2. Add your custom domain
3. Configure DNS records as instructed

---

## Netlify Deployment

### Step 1: Connect Repository

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **Add new site > Import an existing project**
3. Connect your Git provider
4. Select the repository

### Step 2: Configure Build

**Build Settings:**
```
Base directory: (leave empty)
Build command: npm run build
Publish directory: dist
```

### Step 3: Environment Variables

Go to **Site settings > Environment variables** and add:

```env
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### Step 4: Deploy

Netlify auto-deploys on push. Manual deploy via **Deploys > Trigger deploy**.

---

## Docker Deployment

### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Build and Run

```bash
# Build image
docker build -t agent-command-center .

# Run container
docker run -p 80:80 \
  -e VITE_SUPABASE_URL=https://your-project.supabase.co \
  -e VITE_SUPABASE_PUBLISHABLE_KEY=your-key \
  agent-command-center
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
    restart: unless-stopped
```

---

## Supabase Production Setup

### 1. Create Production Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Select organization and region
4. Wait for project creation

### 2. Apply Migrations

```bash
# Link to production project
npx supabase link --project-ref YOUR_PROD_PROJECT_ID

# Push migrations
npx supabase db push
```

### 3. Deploy Edge Functions

```bash
npx supabase functions deploy
```

### 4. Set Production Secrets

```bash
npx supabase secrets set OPENAI_API_KEY=sk-prod-key
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_key
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_key
```

### 5. Configure Auth

1. Go to **Authentication > URL Configuration**
2. Set **Site URL** to your production domain
3. Add production URLs to **Redirect URLs**

### 6. Enable RLS

Verify Row Level Security is enabled on all tables:

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

---

## Environment Configuration

### Development vs Production

| Variable | Development | Production |
|----------|-------------|------------|
| `VITE_SUPABASE_URL` | Dev project URL | Prod project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Dev anon key | Prod anon key |
| `VITE_APP_URL` | `http://localhost:8080` | `https://yourdomain.com` |

### Secrets Management

**Never commit secrets to git!**

Use:
- `.env.local` for local development
- Platform environment variables for deployment
- Supabase secrets for Edge Functions

---

## Post-Deployment Checklist

### Security

- [ ] HTTPS enabled
- [ ] RLS policies verified
- [ ] API keys rotated
- [ ] CORS configured
- [ ] Domain whitelisting set

### Functionality

- [ ] Authentication works
- [ ] Database connected
- [ ] Edge Functions responding
- [ ] Chat functionality tested
- [ ] Billing integration verified

### Monitoring

- [ ] Error tracking enabled
- [ ] Analytics configured
- [ ] Uptime monitoring set
- [ ] Log aggregation active

---

## Rollback Procedures

### Code Rollback

```bash
# Vercel
vercel rollback

# Git-based
git revert HEAD
git push
```

### Database Rollback

```bash
# Revert last migration
npx supabase migration repair --status reverted MIGRATION_ID
```

### Edge Function Rollback

Deploy previous version:
```bash
git checkout HEAD~1 -- supabase/functions/
npx supabase functions deploy
```

---

## Scaling Considerations

### Database

- Enable connection pooling
- Add read replicas for heavy loads
- Implement caching layer

### Edge Functions

- Auto-scaled by Supabase
- Monitor cold starts
- Optimize function size

### Frontend

- Enable CDN caching
- Implement code splitting
- Optimize images

---

## See Also

- [SETUP.md](./SETUP.md) - Local development setup
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
