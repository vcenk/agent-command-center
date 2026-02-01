# Security Audit Report: AgentCenter

**Audit Date:** 2026-01-25
**Auditor:** AI Security Review
**Status:** Action Required

---

## Executive Summary

The AgentCenter application demonstrates a **strong security architecture** with several excellent security practices, particularly around backend-first principles and RLS policies. However, there are **critical and high-severity issues** that must be addressed before production deployment.

### Risk Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2 | 🔴 Immediate Action |
| High | 5 | 🟠 Fix Before Production |
| Medium | 6 | 🟡 Fix Soon |
| Low | 3 | 🟢 Nice to Have |

---

## CRITICAL SECURITY ISSUES

### 1. HARDCODED CREDENTIALS IN PRODUCTION CODE

**Severity:** 🔴 CRITICAL

**Files Affected:**
- `public/widget.js` (Line 16)
- `supabase/functions/widget/index.ts` (Line 24)

**Issue:** Supabase ANON_KEY and URL are hardcoded directly in JavaScript source code.

```javascript
// ❌ FOUND IN CODE
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const SUPABASE_URL = 'https://ehvcrdooykxmcpcopuxz.supabase.co';
```

**Impact:**
- Exposes the specific Supabase project for reconnaissance
- Credentials are deployed to every browser loading the widget
- Any malicious actor can attempt to bypass RLS policies

**Remediation:**
```javascript
// ✅ CORRECT APPROACH
// 1. Widget should fetch config from Edge Function
const response = await fetch(`${baseUrl}/functions/v1/widget-config?agentId=${agentId}`);
const { supabaseUrl, anonKey } = await response.json();

// 2. Or inject at build time from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
```

---

### 2. MISSING INPUT VALIDATION

**Severity:** 🔴 CRITICAL

**Files Affected:**
- `supabase/functions/agents/index.ts`
- `supabase/functions/personas/index.ts`
- `supabase/functions/knowledge/index.ts`
- `supabase/functions/sessions/index.ts`
- `supabase/functions/integrations/index.ts`

**Issue:** Edge Functions accept and directly insert user input without schema validation.

```typescript
// ❌ CURRENT CODE
const body = await req.json()
const { data, error } = await db
  .from('agents')
  .insert({
    ...body,  // SPREADS UNVALIDATED INPUT
    workspace_id: workspaceId,
  })
```

**Impact:**
- SQL injection potential
- Mass assignment vulnerabilities
- Data corruption from invalid types
- Could inject unexpected fields

**Remediation:**
```typescript
// ✅ CORRECT APPROACH
import { z } from 'zod'

const AgentCreateSchema = z.object({
  name: z.string().min(1).max(255),
  business_domain: z.string().max(100).optional(),
  persona_id: z.string().uuid().nullable().optional(),
  goals: z.array(z.string()).max(10).optional(),
  llm_model_id: z.string().uuid().optional(),
  temperature: z.number().min(0).max(2).optional(),
})

// In handler:
const body = await req.json()
const validated = AgentCreateSchema.parse(body)
// Now safe to use validated data
```

---

## HIGH SECURITY ISSUES

### 3. DIRECT SUPABASE CLIENT CALLS FROM FRONTEND

**Severity:** 🟠 HIGH

**Files Affected:**
- `src/hooks/useAgents.ts`
- `src/hooks/usePersonas.ts`
- `src/hooks/useChatSessions.ts`
- `src/hooks/useLeads.ts`
- `src/hooks/useKnowledgeSources.ts`
- `src/hooks/useChannelConfigs.ts`
- `src/contexts/AuthContext.tsx`

**Issue:** Multiple hooks make direct `supabase.from()` calls, bypassing Edge Function security.

```typescript
// ❌ CURRENT CODE in useAgents.ts
const { data, error } = await supabase
  .from('agents')
  .select('*')
  .eq('workspace_id', workspaceId)
```

**Impact:**
- Bypasses Edge Function authentication layer
- No audit trail for data access
- No rate limiting on reads
- Relies entirely on RLS (defense in depth violated)

**Remediation:**
```typescript
// ✅ CORRECT APPROACH - Use Edge Functions
import { secureApi } from '@/lib/api'

const fetchAgents = async () => {
  return secureApi.get<Agent[]>('/agents')
}
```

---

### 4. NO FIELD ALLOWLISTS (MASS ASSIGNMENT)

**Severity:** 🟠 HIGH

**Files Affected:** All Edge Functions with update operations

**Issue:** Update operations spread user input without explicit field allowlists.

```typescript
// ❌ CURRENT CODE
const body = await req.json()
delete body.id
delete body.workspace_id
delete body.created_at

const { data, error } = await db
  .from('agents')
  .update(body)  // Still spreads remaining fields
```

**Remediation:**
```typescript
// ✅ CORRECT APPROACH
const ALLOWED_UPDATE_FIELDS = ['name', 'business_domain', 'persona_id', 'goals', 'status']

const sanitized = Object.fromEntries(
  Object.entries(body).filter(([key]) => ALLOWED_UPDATE_FIELDS.includes(key))
)

const { data, error } = await db
  .from('agents')
  .update(sanitized)
```

---

### 5. NO RATE LIMITING

**Severity:** 🟠 HIGH

**Issue:** No rate limiting on any endpoints, including:
- Session creation (widget)
- Chat messages
- OAuth flows
- Stripe webhooks

**Impact:**
- DoS vulnerability
- Abuse of expensive operations
- Spam lead/session creation
- Brute force attacks possible

**Remediation:**
```typescript
// ✅ IMPLEMENT RATE LIMITING
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '60 s'),
})

// In handler:
const ip = req.headers.get('x-forwarded-for') ?? 'anonymous'
const { success } = await ratelimit.limit(`${ip}:${endpoint}`)
if (!success) {
  return errorResponse('Too many requests', 429)
}
```

**Recommended Limits:**

| Endpoint | Limit |
|----------|-------|
| Widget chat | 30/min per session |
| Session create | 10/min per IP |
| OAuth connect | 5/min per workspace |
| API mutations | 60/min per user |

---

### 6. OAUTH TOKENS STORED UNENCRYPTED

**Severity:** 🟠 HIGH

**File:** `supabase/functions/integrations/index.ts`

**Issue:** OAuth access_token and refresh_token stored in plaintext.

```typescript
// ❌ CURRENT CODE
const config = {
  access_token: tokenData.access_token,
  refresh_token: tokenData.refresh_token,
  // Stored directly in database
}
```

**Impact:**
- Database breach exposes all OAuth tokens
- Could allow attackers to access user's Slack/Google Calendar

**Remediation:**
```typescript
// ✅ CORRECT APPROACH - Encrypt tokens
import { encrypt, decrypt } from '../_shared/crypto'

const config = {
  access_token: await encrypt(tokenData.access_token),
  refresh_token: await encrypt(tokenData.refresh_token),
}

// When using:
const accessToken = await decrypt(config.access_token)
```

---

### 7. WORKSPACE ISOLATION IN AUTHCONTEXT

**Severity:** 🟠 HIGH

**File:** `src/contexts/AuthContext.tsx`

**Issue:** `setWorkspace` allows setting any workspace without server verification.

```typescript
// ❌ CURRENT CODE
const setWorkspace = async (ws: Workspace, role: Role = 'OWNER') => {
  await supabase
    .from('profiles')
    .update({ workspace_id: ws.id })  // No server verification
    .eq('id', user.id);
}
```

**Remediation:**
```typescript
// ✅ CORRECT APPROACH - Verify via Edge Function
const setWorkspace = async (workspaceId: string) => {
  const response = await secureApi.post('/workspace/switch', { workspaceId })
  // Server verifies user has access to this workspace
}
```

---

## MEDIUM SECURITY ISSUES

### 8. CORS ALLOWS ALL ORIGINS

**Files:** All Edge Functions

```typescript
// ❌ CURRENT CODE
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
}
```

**Remediation:**
```typescript
// ✅ FOR DASHBOARD ENDPOINTS
const allowedOrigins = [
  'https://yourdomain.com',
  process.env.NODE_ENV === 'development' && 'http://localhost:5173'
].filter(Boolean)

const origin = req.headers.get('origin')
const corsOrigin = allowedOrigins.includes(origin) ? origin : ''
```

---

### 9. MISSING WEBHOOK IDEMPOTENCY

**File:** `supabase/functions/stripe-webhook/index.ts`

**Issue:** Same webhook event could be processed multiple times.

**Remediation:**
```typescript
// ✅ TRACK PROCESSED EVENTS
const { data: existing } = await db
  .from('processed_webhooks')
  .select('id')
  .eq('event_id', event.id)
  .maybeSingle()

if (existing) {
  return jsonResponse({ received: true, duplicate: true })
}

// Process event, then:
await db.from('processed_webhooks').insert({ event_id: event.id })
```

---

### 10. ERROR MESSAGES MAY LEAK INFORMATION

**Issue:** Specific error messages could aid attackers.

```typescript
// ❌ CURRENT
return errorResponse('Agent not found', 404)  // Confirms existence

// ✅ BETTER (for unauthenticated endpoints)
return errorResponse('Not found', 404)
```

---

### 11. NO AUDIT LOGGING

**Issue:** No comprehensive audit trails for sensitive operations.

**Remediation:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 12. INTEGRATION CONFIG RETURNED IN SOME RESPONSES

**File:** `supabase/functions/integrations/index.ts`

**Issue:** Some queries select `config` field containing tokens.

**Remediation:** Never return `config` in API responses. Keep it server-side only.

---

### 13. UUID VALIDATION MISSING

**Issue:** Agent IDs, session IDs not validated as proper UUIDs.

**Remediation:**
```typescript
const UUIDSchema = z.string().uuid()

if (!UUIDSchema.safeParse(agentId).success) {
  return errorResponse('Invalid agent ID', 400)
}
```

---

## LOW SECURITY ISSUES

### 14. Console Logs in Production

**Issue:** `console.error()` calls could expose data.

**Remediation:** Use structured logging with PII filtering.

---

### 15. Missing Security Headers

**Remediation:**
```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
}
```

---

### 16. Session IDs Predictable

**Issue:** Widget allows client to provide session_id.

**Remediation:** Generate session IDs server-side only.

---

## POSITIVE SECURITY IMPLEMENTATIONS ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Backend-First Architecture | ✅ Good | Edge Functions handle business logic |
| RLS Enabled | ✅ Good | All tables have RLS policies |
| Service Role Key Protection | ✅ Good | Never exposed to frontend |
| Stripe Webhook Verification | ✅ Good | Properly verifies signatures |
| OAuth CSRF Protection | ✅ Good | State parameter implemented |
| Workspace Isolation | ✅ Good | All queries scoped to workspace |
| Password Hashing | ✅ Good | Handled by Supabase Auth |
| JWT Token Validation | ✅ Good | Supabase handles this |

---

## REMEDIATION PRIORITY

### Phase 1: Critical (Immediate)
- [ ] Remove hardcoded credentials from widget
- [ ] Add Zod validation to all Edge Functions
- [ ] Implement field allowlists for updates

### Phase 2: High (Before Production)
- [ ] Replace direct Supabase calls with Edge Function calls
- [ ] Implement rate limiting
- [ ] Encrypt OAuth tokens in database
- [ ] Fix AuthContext workspace switching

### Phase 3: Medium (Soon After Launch)
- [ ] Restrict CORS origins
- [ ] Add webhook idempotency
- [ ] Implement audit logging
- [ ] Add security headers

### Phase 4: Low (Ongoing)
- [ ] Improve error messages
- [ ] Add structured logging
- [ ] Server-side session ID generation

---

## COMPLIANCE CHECKLIST

Before deploying to production, verify:

- [ ] All hardcoded credentials removed
- [ ] Input validation on all endpoints
- [ ] Field allowlists on all updates
- [ ] Rate limiting implemented
- [ ] OAuth tokens encrypted
- [ ] Direct Supabase calls eliminated
- [ ] CORS properly configured
- [ ] Audit logging enabled
- [ ] Security headers added
- [ ] Error messages sanitized

---

## REFERENCES

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [Stripe Webhook Security](https://stripe.com/docs/webhooks/security)

---

*This audit should be repeated after major changes and at least quarterly.*
