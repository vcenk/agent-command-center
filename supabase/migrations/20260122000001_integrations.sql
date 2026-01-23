-- Integrations Schema for Slack Notifications and Google Calendar
-- Phase 1: Quick Wins - Activation & Time-to-Value

-- ==============================================
-- WORKSPACE INTEGRATIONS TABLE
-- ==============================================
-- Stores OAuth tokens and config for each integration per workspace

CREATE TABLE workspace_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'slack', 'google_calendar', 'hubspot', etc.
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disconnected')),
  -- Config stores encrypted OAuth tokens and API keys
  -- Structure varies by provider:
  -- Slack: { access_token, team_id, team_name, channel_id, channel_name, bot_user_id }
  -- Google: { access_token, refresh_token, expires_at, calendar_id }
  config jsonb NOT NULL DEFAULT '{}',
  -- User preferences for this integration
  -- Slack: { notify_new_lead, notify_session_start, notify_human_handoff }
  -- Google: { business_hours_start, business_hours_end, buffer_minutes, default_duration }
  settings jsonb NOT NULL DEFAULT '{}',
  connected_at timestamptz,
  connected_by uuid REFERENCES auth.users(id),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (workspace_id, provider)
);

-- ==============================================
-- INTEGRATION EVENTS TABLE
-- ==============================================
-- Audit log for all integration activity (notifications sent, API calls, errors)

CREATE TABLE integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES workspace_integrations(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'notification_sent', 'oauth_refresh', 'booking_created', etc.
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  payload jsonb, -- What was sent
  response jsonb, -- What was received
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- ==============================================
-- CALENDAR BOOKINGS TABLE
-- ==============================================
-- Track appointments booked through agents

CREATE TABLE calendar_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_id text NOT NULL, -- Links to chat session
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  -- Event details
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  timezone text DEFAULT 'UTC',
  -- Attendee info
  attendee_name text,
  attendee_email text,
  attendee_phone text,
  -- External calendar reference
  external_event_id text, -- Google Calendar event ID
  external_calendar_id text, -- Which calendar it's on
  -- Status tracking
  status text DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  cancelled_at timestamptz,
  cancellation_reason text,
  -- Notifications
  reminder_sent boolean DEFAULT false,
  reminder_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==============================================
-- WEBHOOK SUBSCRIPTIONS TABLE
-- ==============================================
-- For Zapier and custom webhooks (Phase 2 prep)

CREATE TABLE webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'custom', -- 'zapier', 'custom', etc.
  event_type text NOT NULL, -- 'lead.created', 'session.started', 'booking.created', etc.
  target_url text NOT NULL,
  secret text NOT NULL, -- For HMAC signature verification
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  failure_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- workspace_integrations
CREATE INDEX idx_workspace_integrations_workspace ON workspace_integrations(workspace_id);
CREATE INDEX idx_workspace_integrations_provider ON workspace_integrations(provider);
CREATE INDEX idx_workspace_integrations_status ON workspace_integrations(workspace_id, status) WHERE status = 'connected';

-- integration_events
CREATE INDEX idx_integration_events_integration ON integration_events(integration_id);
CREATE INDEX idx_integration_events_created ON integration_events(created_at DESC);
CREATE INDEX idx_integration_events_status ON integration_events(status) WHERE status = 'failed';

-- calendar_bookings
CREATE INDEX idx_calendar_bookings_workspace ON calendar_bookings(workspace_id);
CREATE INDEX idx_calendar_bookings_agent ON calendar_bookings(agent_id);
CREATE INDEX idx_calendar_bookings_session ON calendar_bookings(session_id);
CREATE INDEX idx_calendar_bookings_time ON calendar_bookings(start_time);
CREATE INDEX idx_calendar_bookings_upcoming ON calendar_bookings(workspace_id, start_time)
  WHERE status IN ('pending', 'confirmed');

-- webhook_subscriptions
CREATE INDEX idx_webhook_subscriptions_workspace ON webhook_subscriptions(workspace_id);
CREATE INDEX idx_webhook_subscriptions_event ON webhook_subscriptions(event_type);
CREATE INDEX idx_webhook_subscriptions_active ON webhook_subscriptions(workspace_id, is_active) WHERE is_active = true;

-- ==============================================
-- ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE workspace_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role only policies (frontend uses Edge Functions)
CREATE POLICY "service_role_only" ON workspace_integrations FOR ALL USING (false);
CREATE POLICY "service_role_only" ON integration_events FOR ALL USING (false);
CREATE POLICY "service_role_only" ON calendar_bookings FOR ALL USING (false);
CREATE POLICY "service_role_only" ON webhook_subscriptions FOR ALL USING (false);

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Auto-update updated_at timestamps
CREATE TRIGGER update_workspace_integrations_updated_at
BEFORE UPDATE ON workspace_integrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_bookings_updated_at
BEFORE UPDATE ON calendar_bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_subscriptions_updated_at
BEFORE UPDATE ON webhook_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- ADD NOTIFICATION SETTINGS TO WORKSPACES
-- ==============================================

-- Add notification preferences column to workspaces if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'notification_settings'
  ) THEN
    ALTER TABLE workspaces ADD COLUMN notification_settings jsonb DEFAULT '{
      "email_new_lead": true,
      "email_daily_summary": false,
      "email_weekly_report": true
    }';
  END IF;
END $$;

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE workspace_integrations IS 'OAuth tokens and configuration for third-party integrations (Slack, Google Calendar, etc.)';
COMMENT ON TABLE integration_events IS 'Audit log of all integration events for debugging and analytics';
COMMENT ON TABLE calendar_bookings IS 'Appointments booked through AI agents, synced to external calendars';
COMMENT ON TABLE webhook_subscriptions IS 'Custom webhook endpoints for Zapier and programmatic integrations';
COMMENT ON COLUMN workspace_integrations.config IS 'Encrypted OAuth tokens and API credentials (access_token, refresh_token, etc.)';
COMMENT ON COLUMN workspace_integrations.settings IS 'User preferences for this integration (notification types, business hours, etc.)';
