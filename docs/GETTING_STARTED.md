# Getting Started

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or later
- **npm** 9.x or later (or **Bun** as alternative)
- **Git**
- **Supabase CLI** (optional, for local development)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/vcenk/agent-command-center.git
cd agent-command-center
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Configure Environment

Create or update the `.env` file:

```env
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 4. Start Development Server

```bash
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

---

## Project Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Supabase Setup

### Option A: Use Existing Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select or create a project
3. Go to **Settings > API**
4. Copy the **Project URL** and **anon public** key
5. Add to your `.env` file

### Option B: Local Supabase Development

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Start local Supabase:
```bash
supabase start
```

3. Apply migrations:
```bash
supabase db push
```

4. Use local credentials in `.env`:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local-anon-key>
```

---

## Database Setup

### Running Migrations

Migrations are in `supabase/migrations/`. Apply them in order:

```bash
# Using Supabase CLI
supabase db push

# Or manually via SQL editor in Supabase Dashboard
```

### Seeding Demo Data

The app includes demo data seeding via the Settings page:

1. Log in to the app
2. Go to **Settings**
3. Click **Seed Demo Data**

Or use the `demoData.ts` utilities directly.

---

## Authentication

### Creating Your First Account

1. Navigate to `/auth`
2. Click **Sign Up**
3. Enter email and password
4. Check email for verification link
5. Complete onboarding to create workspace

### Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full access, billing, team management |
| **Manager** | Create/edit agents, personas, knowledge |
| **Viewer** | Read-only access |

---

## Folder Structure Quick Reference

```
src/
├── components/     # React components
│   ├── layout/     # Layout components
│   ├── shared/     # Shared business components
│   └── ui/         # shadcn/ui primitives
├── contexts/       # React contexts
├── hooks/          # Custom hooks
├── integrations/   # Third-party integrations
├── lib/            # Utility functions
├── pages/          # Page components
│   ├── dashboard/  # Dashboard pages
│   └── landing/    # Landing page
└── types/          # TypeScript types

supabase/
├── functions/      # Edge Functions
├── migrations/     # Database migrations
└── config.toml     # Local config
```

---

## Development Workflow

### 1. Creating a New Feature

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ...

# Commit
git add .
git commit -m "feat: add my feature"

# Push
git push origin feature/my-feature
```

### 2. Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in `Sidebar.tsx`

```typescript
// src/pages/dashboard/MyPage.tsx
export default function MyPage() {
  return <div>My Page</div>;
}

// src/App.tsx
<Route path="my-page" element={<MyPage />} />
```

### 3. Adding a New Hook

```typescript
// src/hooks/useMyData.ts
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useMyData() {
  const { workspaceId } = useAuth();

  return useQuery({
    queryKey: ['my-data', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}
```

### 4. Adding a New Edge Function

```bash
# Create function directory
mkdir supabase/functions/my-function

# Create index.ts
touch supabase/functions/my-function/index.ts
```

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { authenticateRequest, corsHeaders } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, workspaceId } = await authenticateRequest(req);

    // Your logic here

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

Deploy:
```bash
supabase functions deploy my-function
```

---

## Environment Variables

### Frontend (Vite)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Yes |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID | Yes |

### Edge Functions

Set via Supabase Dashboard or CLI:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Troubleshooting

### Common Issues

**"Invalid API key" error**
- Check `.env` has correct Supabase credentials
- Ensure no extra whitespace in values

**"Permission denied" errors**
- Check user role in `user_roles` table
- Verify RLS policies are correct

**Build errors**
- Run `npm install` to ensure dependencies
- Check TypeScript errors with `npm run lint`

**Hot reload not working**
- Check Vite is running
- Clear browser cache
- Restart dev server

### Getting Help

- Check [docs/](./docs/) for documentation
- Search existing GitHub issues
- Create new issue with reproduction steps

---

## Next Steps

1. **Explore the Dashboard**: Log in and explore the UI
2. **Create an Agent**: Use templates or create custom
3. **Add Knowledge**: Upload documents or add text
4. **Test Chat**: Use the Test Chat feature
5. **Review Code**: Explore `src/` to understand patterns

---

## Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TanStack Query](https://tanstack.com/query)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

---

## See Also

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Detailed file structure
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [RULES.md](./RULES.md) - Coding standards
- [DATABASE.md](./DATABASE.md) - Database schema
- [API.md](./API.md) - API reference
