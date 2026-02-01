# AgentCenter Project Roadmap

**Last Updated:** 2026-01-25

---

## Current State

### ✅ Production Ready
- Web Chat Widget (embeddable)
- Agent Management (CRUD)
- Persona Management
- Knowledge Base / RAG
- Lead Capture (automatic)
- Slack Notifications
- Google Calendar Sync
- Stripe Billing
- Analytics Dashboard
- Multi-tenant Architecture

### ⚠️ UI Only (No Backend)
- WhatsApp Channel
- SMS Channel
- Phone/VoIP Channel
- Standalone Booking Page

### ❌ Not Started
- Voice AI / Telephony
- Email Sending
- Webhooks / Zapier
- HubSpot CRM

---

## Phase 1: Security Hardening (CRITICAL)

**Priority:** 🔴 Must complete before production

### 1.1 Remove Hardcoded Credentials
- [ ] Remove ANON_KEY from `public/widget.js`
- [ ] Remove ANON_KEY from `supabase/functions/widget/index.ts`
- [ ] Create widget config endpoint that provides credentials
- [ ] Update widget to fetch config dynamically

### 1.2 Input Validation
- [ ] Create shared Zod schemas in `supabase/functions/_shared/schemas.ts`
- [ ] Add validation to `/agents` endpoint
- [ ] Add validation to `/personas` endpoint
- [ ] Add validation to `/knowledge` endpoint
- [ ] Add validation to `/sessions` endpoint
- [ ] Add validation to `/integrations` endpoint
- [ ] Add validation to `/tools` endpoint
- [ ] Add validation to `/calendar` endpoint

### 1.3 Field Allowlists
- [ ] Create allowlist helper function
- [ ] Apply to all UPDATE operations
- [ ] Apply to all INSERT operations (remove spread)

### 1.4 Eliminate Direct Supabase Calls
- [ ] Refactor `useAgents.ts` → use Edge Functions
- [ ] Refactor `usePersonas.ts` → use Edge Functions
- [ ] Refactor `useChatSessions.ts` → use Edge Functions
- [ ] Refactor `useLeads.ts` → use Edge Functions
- [ ] Refactor `useKnowledgeSources.ts` → use Edge Functions
- [ ] Refactor `useChannelConfigs.ts` → use Edge Functions
- [ ] Refactor `AuthContext.tsx` → use Edge Functions

### 1.5 Rate Limiting
- [ ] Set up Upstash Redis (or alternative)
- [ ] Create rate limit middleware
- [ ] Apply to widget/chat endpoint (30/min per session)
- [ ] Apply to session creation (10/min per IP)
- [ ] Apply to OAuth flows (5/min per workspace)
- [ ] Apply to API mutations (60/min per user)

### 1.6 Token Encryption
- [ ] Create encryption utilities
- [ ] Encrypt OAuth tokens before storage
- [ ] Decrypt tokens when needed for API calls
- [ ] Migration to encrypt existing tokens

### 1.7 Additional Security
- [ ] Add security headers to all responses
- [ ] Restrict CORS for dashboard endpoints
- [ ] Add webhook idempotency for Stripe
- [ ] Create audit logging table and functions

---

## Phase 2: Appointment Booking System

**Priority:** 🟠 High - Core Feature

### 2.1 Database Schema
- [ ] Review `calendar_bookings` table (already exists)
- [ ] Add booking types/templates table
- [ ] Add availability rules table
- [ ] Add booking notifications table

### 2.2 Availability Engine
- [ ] Create `/calendar/availability` improvements
  - Multiple date range queries
  - Timezone handling
  - Recurring availability rules
- [ ] Add blocked dates/times support
- [ ] Add booking limits per day/week

### 2.3 Customer Booking Flow
- [ ] Create booking widget component
- [ ] Date picker with availability
- [ ] Time slot selection
- [ ] Contact information form
- [ ] Confirmation page
- [ ] Email confirmation (requires Phase 3)

### 2.4 Agent-Initiated Booking
- [ ] Create booking tool for chat agents
- [ ] Natural language date parsing
- [ ] Availability check during chat
- [ ] In-chat booking confirmation

### 2.5 Booking Management Dashboard
- [ ] Calendar view of bookings
- [ ] List view with filters
- [ ] Reschedule functionality
- [ ] Cancel with notifications
- [ ] No-show tracking

---

## Phase 3: Email Integration

**Priority:** 🟠 High - Required for Booking Confirmations

### 3.1 Email Provider Setup
- [ ] Choose provider (Resend, SendGrid, or Postmark)
- [ ] Create Edge Function `/email/send`
- [ ] Store API keys securely
- [ ] Create email templates table

### 3.2 Transactional Emails
- [ ] Booking confirmation email
- [ ] Booking reminder (24h, 1h before)
- [ ] Booking cancellation email
- [ ] Booking rescheduled email
- [ ] Lead capture notification (to business)

### 3.3 Email Templates
- [ ] Create template system with variables
- [ ] Default templates for each email type
- [ ] Custom template editor in dashboard
- [ ] Preview functionality

### 3.4 Agent Email Tool
- [ ] Create `email_send` tool implementation
- [ ] Template selection in chat
- [ ] Dynamic variable injection
- [ ] Delivery tracking

---

## Phase 4: WhatsApp Integration

**Priority:** 🟡 Medium - Popular Channel

### 4.1 WhatsApp Business API Setup
- [ ] Register for WhatsApp Business API
- [ ] Set up Meta Business verification
- [ ] Configure webhook endpoint
- [ ] Store credentials securely

### 4.2 Message Handling
- [ ] Create `/whatsapp/webhook` Edge Function
- [ ] Receive incoming messages
- [ ] Route to appropriate agent
- [ ] Send responses via API
- [ ] Handle media messages

### 4.3 Session Management
- [ ] Map WhatsApp conversations to sessions
- [ ] Handle 24-hour messaging window
- [ ] Template messages for outside window
- [ ] Session handoff to human

### 4.4 Dashboard Integration
- [ ] WhatsApp setup page (phone number, verification)
- [ ] Message templates management
- [ ] WhatsApp-specific analytics
- [ ] Conversation view in sessions

---

## Phase 5: SMS Integration

**Priority:** 🟡 Medium - Simple Channel

### 5.1 Twilio Setup
- [ ] Create Twilio account/subaccount
- [ ] Purchase phone number(s)
- [ ] Configure webhook URL
- [ ] Store credentials

### 5.2 SMS Edge Functions
- [ ] Create `/sms/webhook` for incoming
- [ ] Create `/sms/send` for outgoing
- [ ] Handle delivery status webhooks
- [ ] Rate limiting per number

### 5.3 SMS Features
- [ ] Two-way conversation support
- [ ] Opt-out handling (STOP keyword)
- [ ] Link shortening
- [ ] MMS support (optional)

### 5.4 Dashboard
- [ ] SMS setup page
- [ ] Phone number management
- [ ] Message logs
- [ ] Compliance settings

---

## Phase 6: Voice AI / Telephony

**Priority:** 🟡 Medium - Advanced Feature

### 6.1 Voice Provider Setup
- [ ] Choose provider (Twilio Voice, Telnyx)
- [ ] Configure phone numbers
- [ ] Set up TwiML/webhook endpoints
- [ ] HIPAA compliance if needed

### 6.2 Inbound Call Handling
- [ ] Create `/voice/incoming` Edge Function
- [ ] IVR menu system
- [ ] Speech-to-text (Whisper API)
- [ ] Route to AI agent
- [ ] Text-to-speech response (ElevenLabs/OpenAI TTS)

### 6.3 Call Features
- [ ] Call recording with consent
- [ ] Voicemail handling
- [ ] Call transfer to human
- [ ] Business hours routing
- [ ] Queue management

### 6.4 Outbound Calls (Optional)
- [ ] Appointment reminder calls
- [ ] Follow-up calls
- [ ] Click-to-call from dashboard

### 6.5 Transcription & Analytics
- [ ] Real-time transcription
- [ ] Call summary generation
- [ ] Sentiment analysis
- [ ] Call duration metrics
- [ ] Quality scoring

### 6.6 Dashboard
- [ ] Call logs with recordings
- [ ] Transcription viewer
- [ ] Voice settings (greeting, hold music)
- [ ] Phone number management

---

## Phase 7: Webhooks & Zapier

**Priority:** 🟢 Lower - Nice to Have

### 7.1 Webhook System
- [ ] Create webhook dispatcher Edge Function
- [ ] Implement retry logic with backoff
- [ ] Webhook signature generation
- [ ] Delivery status tracking

### 7.2 Event Types
- [ ] `lead.created`
- [ ] `lead.updated`
- [ ] `session.started`
- [ ] `session.ended`
- [ ] `booking.created`
- [ ] `booking.cancelled`
- [ ] `human_handoff.requested`

### 7.3 Dashboard
- [ ] Webhook endpoint management
- [ ] Event type selection
- [ ] Test webhook button
- [ ] Delivery logs

### 7.4 Zapier Integration (Optional)
- [ ] Create Zapier app
- [ ] OAuth authentication
- [ ] Triggers for all events
- [ ] Actions (create lead, send message)

---

## Phase 8: CRM Integrations

**Priority:** 🟢 Lower - Enterprise Feature

### 8.1 HubSpot
- [ ] OAuth integration
- [ ] Sync leads → HubSpot contacts
- [ ] Sync sessions → HubSpot deals
- [ ] Bi-directional sync

### 8.2 Salesforce (Future)
- [ ] OAuth integration
- [ ] Lead sync
- [ ] Activity logging

### 8.3 Generic CRM Webhook
- [ ] Configurable field mapping
- [ ] Custom API endpoints

---

## Technical Debt & Improvements

### Code Quality
- [ ] Add comprehensive TypeScript types
- [ ] Create shared validation schemas
- [ ] Add unit tests for Edge Functions
- [ ] Add integration tests
- [ ] Set up CI/CD pipeline

### Performance
- [ ] Implement caching layer
- [ ] Optimize database queries
- [ ] Add database indexes review
- [ ] Widget bundle size optimization

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Add performance monitoring
- [ ] Create alerting rules
- [ ] Dashboard for system health

### Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Widget integration guide
- [ ] Developer setup guide
- [ ] Architecture documentation

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Security | 1-2 weeks | None |
| Phase 2: Booking | 2-3 weeks | Phase 1 |
| Phase 3: Email | 1 week | Phase 1 |
| Phase 4: WhatsApp | 2-3 weeks | Phase 1, 3 |
| Phase 5: SMS | 1-2 weeks | Phase 1 |
| Phase 6: Voice AI | 3-4 weeks | Phase 1, 5 |
| Phase 7: Webhooks | 1-2 weeks | Phase 1 |
| Phase 8: CRM | 2-3 weeks | Phase 1, 7 |

**Total Estimated Time:** 14-20 weeks

---

## Quick Wins (Can Do Anytime)

- [ ] Add loading skeletons to all pages
- [ ] Improve error messages
- [ ] Add keyboard shortcuts
- [ ] Mobile responsive improvements
- [ ] Dark/light theme polish
- [ ] Onboarding tour

---

## Decision Points

### WhatsApp vs SMS Priority
- WhatsApp: Higher engagement, richer features, but complex setup
- SMS: Simpler, universal reach, faster to implement
- **Recommendation:** SMS first (Phase 5 before Phase 4)

### Voice Provider
- Twilio: Most mature, higher cost
- Telnyx: Cost-effective, good quality
- Vonage: Middle ground
- **Recommendation:** Start with Twilio for reliability

### Email Provider
- Resend: Modern API, great DX
- SendGrid: Established, feature-rich
- Postmark: Best deliverability
- **Recommendation:** Resend for simplicity

---

## Success Metrics

### Phase 1 Complete When:
- Zero security vulnerabilities in audit
- All direct Supabase calls eliminated
- Rate limiting active on all endpoints

### Phase 2 Complete When:
- Customers can book appointments via widget
- Bookings sync to Google Calendar
- Confirmation emails sent

### MVP Complete When:
- Phases 1-5 complete
- Web + SMS + WhatsApp channels working
- Booking system fully functional
- Email notifications working

---

*This roadmap should be reviewed and updated monthly.*
