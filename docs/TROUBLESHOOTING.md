# Troubleshooting Guide

## Overview

Common issues and solutions for Agent Command Center.

---

## Authentication Issues

### "Invalid API Key" Error

**Symptoms:**
- Can't connect to Supabase
- API calls fail with 401

**Solutions:**

1. Check `.env.local` has correct values:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...  # Full JWT token
```

2. Ensure no extra whitespace or quotes:
```env
# Wrong
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbG..."

# Correct
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...
```

3. Restart dev server after changing env vars:
```bash
# Stop server (Ctrl+C) then:
npm run dev
```

---

### "User Not Found" After Sign Up

**Symptoms:**
- Sign up succeeds but can't sign in
- No profile created

**Solutions:**

1. Check if email confirmation is disabled:
   - Supabase Dashboard > Authentication > Providers > Email
   - Toggle OFF "Confirm email"

2. Check database triggers:
```sql
-- Verify profile trigger exists
SELECT * FROM pg_trigger WHERE tgname LIKE '%profile%';
```

3. Manually create profile if needed:
```sql
INSERT INTO profiles (id, email, workspace_id)
VALUES ('user-uuid', 'email@example.com', NULL);
```

---

### "Permission Denied" Errors

**Symptoms:**
- Can sign in but can't access data
- 403 errors on API calls

**Solutions:**

1. Check user role:
```sql
SELECT * FROM user_roles WHERE user_id = 'your-user-id';
```

2. Verify RLS policies:
```sql
-- List policies on agents table
SELECT * FROM pg_policies WHERE tablename = 'agents';
```

3. Check workspace assignment:
```sql
SELECT workspace_id FROM profiles WHERE id = 'your-user-id';
```

---

## Database Issues

### Migrations Not Applying

**Symptoms:**
- Tables missing
- Schema out of sync

**Solutions:**

1. Check migration status:
```bash
npx supabase migration list
```

2. Repair migration history if needed:
```bash
npx supabase migration repair --status applied MIGRATION_ID
```

3. Force push (use carefully):
```bash
npx supabase db push --force
```

---

### "Relation Does Not Exist"

**Symptoms:**
- SQL errors about missing tables
- App crashes on data fetch

**Solutions:**

1. Verify table exists:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

2. Re-run migrations:
```bash
npx supabase db push
```

3. Check for typos in table names (case-sensitive).

---

### RLS Blocking All Queries

**Symptoms:**
- Empty results when data exists
- Queries work in SQL editor but not in app

**Solutions:**

1. Temporarily check RLS status:
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';
```

2. Test with service role (admin):
```javascript
// In Edge Function only
const supabase = createClient(url, SERVICE_ROLE_KEY);
```

3. Review policy conditions:
```sql
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

---

## Edge Function Issues

### "Function Not Found"

**Symptoms:**
- 404 when calling function
- "Function does not exist"

**Solutions:**

1. Verify function is deployed:
```bash
npx supabase functions list
```

2. Redeploy the function:
```bash
npx supabase functions deploy FUNCTION_NAME
```

3. Check function naming (case-sensitive).

---

### "AI Service Not Configured"

**Symptoms:**
- Chat returns error
- "OPENAI_API_KEY not configured"

**Solutions:**

1. Set the secret:
```bash
npx supabase secrets set OPENAI_API_KEY=sk-your-key
```

2. Verify secret is set:
```bash
npx supabase secrets list
```

3. Redeploy chat function:
```bash
npx supabase functions deploy chat
```

---

### Function Timeout

**Symptoms:**
- Requests hang then fail
- 504 Gateway Timeout

**Solutions:**

1. Optimize function code:
   - Reduce database queries
   - Add early returns
   - Use caching

2. Check external API latency:
   - OpenAI response times
   - Database connection time

3. Increase timeout (if possible):
```typescript
// In function, use streaming for long operations
return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' }
});
```

---

## Frontend Issues

### Blank Page / White Screen

**Symptoms:**
- App loads but shows nothing
- Console shows JavaScript errors

**Solutions:**

1. Check browser console for errors (F12)

2. Verify environment variables are loaded:
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL);
```

3. Clear browser cache and localStorage:
```javascript
localStorage.clear();
location.reload();
```

4. Check for build errors:
```bash
npm run build
```

---

### Components Not Styling

**Symptoms:**
- Missing styles
- Tailwind classes not working

**Solutions:**

1. Verify Tailwind is processing files:
```javascript
// tailwind.config.ts
content: ["./src/**/*.{ts,tsx}"]
```

2. Restart dev server:
```bash
npm run dev
```

3. Check for CSS import:
```typescript
// main.tsx
import './index.css';
```

---

### React Query Cache Issues

**Symptoms:**
- Stale data showing
- Updates not reflecting

**Solutions:**

1. Invalidate queries manually:
```typescript
queryClient.invalidateQueries({ queryKey: ['agents'] });
```

2. Clear all cache:
```typescript
queryClient.clear();
```

3. Disable cache for debugging:
```typescript
useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  staleTime: 0,
  cacheTime: 0,
});
```

---

## Chat Issues

### Chat Not Responding

**Symptoms:**
- Messages sent but no response
- Loading indicator stuck

**Solutions:**

1. Check Edge Function logs:
```bash
npx supabase functions logs chat
```

2. Verify OpenAI API key is valid

3. Check agent configuration:
   - Agent exists
   - Agent status is "live"
   - Persona assigned

4. Test function directly:
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/chat \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "...", "messages": [{"role": "user", "content": "Hello"}]}'
```

---

### "Domain Not Allowed"

**Symptoms:**
- Chat works locally but not on deployed site
- 403 error with "Domain not allowed"

**Solutions:**

1. Add domain to widget config:
   - Dashboard > Agent > Install > Allowed Domains
   - Add your production domain

2. Check CORS headers in function

3. Verify origin header is being sent

---

## Billing Issues

### Stripe Webhooks Failing

**Symptoms:**
- Payments succeed but subscription not updated
- Webhook errors in Stripe dashboard

**Solutions:**

1. Verify webhook secret:
```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

2. Check webhook URL is correct in Stripe:
```
https://your-project.supabase.co/functions/v1/stripe-webhook
```

3. View webhook logs:
```bash
npx supabase functions logs stripe-webhook
```

---

## Performance Issues

### Slow Page Loads

**Solutions:**

1. Enable code splitting:
```typescript
const Page = lazy(() => import('./Page'));
```

2. Optimize images

3. Check network tab for slow requests

4. Use production build:
```bash
npm run build && npm run preview
```

---

### High Database Latency

**Solutions:**

1. Add indexes:
```sql
CREATE INDEX idx_agents_workspace ON agents(workspace_id);
```

2. Use connection pooling

3. Optimize queries (avoid `SELECT *`)

4. Consider caching layer

---

## Getting Help

### Debug Information to Collect

1. Browser console errors (F12)
2. Network request/response details
3. Supabase function logs
4. Environment configuration (redact secrets)

### Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query)
- [shadcn/ui Docs](https://ui.shadcn.com)

---

## See Also

- [SETUP.md](./SETUP.md) - Initial setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [API.md](./API.md) - API reference
