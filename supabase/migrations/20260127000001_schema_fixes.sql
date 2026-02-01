-- Schema Fixes Migration
-- Fixes critical issues identified in security audit
-- All operations are wrapped in conditionals to handle partially deployed schemas

-- =====================================================
-- 1. FIX RLS POLICY FUNCTION PARAMETER ORDER
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspace_llm_config') THEN
    DROP POLICY IF EXISTS "Users with write access can manage LLM config" ON workspace_llm_config;
    CREATE POLICY "Users with write access can manage LLM config" ON workspace_llm_config
    FOR ALL USING (has_role(auth.uid(), workspace_id, 'MANAGER'::app_role));
  END IF;
END $$;

-- =====================================================
-- 2. ADD MISSING PERFORMANCE INDEXES (conditional)
-- =====================================================

-- Core tables (should always exist)
CREATE INDEX IF NOT EXISTS idx_user_roles_workspace_id ON user_roles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_profiles_workspace_id ON profiles(workspace_id);

-- Agents table
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agents') THEN
    CREATE INDEX IF NOT EXISTS idx_agents_workspace_status ON agents(workspace_id, status);
  END IF;
END $$;

-- Chat sessions table
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace_status ON chat_sessions(workspace_id, status);
  END IF;
END $$;

-- Leads table
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') THEN
    CREATE INDEX IF NOT EXISTS idx_leads_workspace_agent ON leads(workspace_id, agent_id);
    CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
  END IF;
END $$;

-- Billing invoices table
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'billing_invoices') THEN
    CREATE INDEX IF NOT EXISTS idx_billing_invoices_workspace_created ON billing_invoices(workspace_id, created_at DESC);
  END IF;
END $$;

-- Calendar bookings table
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_bookings') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_calendar_bookings_external_event ON calendar_bookings(external_event_id) WHERE external_event_id IS NOT NULL';
    CREATE INDEX IF NOT EXISTS idx_calendar_bookings_start_time ON calendar_bookings(start_time);
  END IF;
END $$;

-- Integration events table
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'integration_events') THEN
    CREATE INDEX IF NOT EXISTS idx_integration_events_event_type ON integration_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_integration_events_integration_created ON integration_events(integration_id, created_at DESC);
  END IF;
END $$;

-- Knowledge chunks table
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'knowledge_chunks') THEN
    CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source_order ON knowledge_chunks(source_id, chunk_index);
  END IF;
END $$;

-- Tool executions table
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tool_executions') THEN
    CREATE INDEX IF NOT EXISTS idx_tool_executions_agent ON tool_executions(agent_id);
    CREATE INDEX IF NOT EXISTS idx_tool_executions_status ON tool_executions(status);
  END IF;
END $$;

-- =====================================================
-- 3. ADD TIME VALIDATION CONSTRAINTS (conditional)
-- =====================================================

-- Calendar bookings time constraint
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_bookings') THEN
    ALTER TABLE calendar_bookings DROP CONSTRAINT IF EXISTS check_booking_times;
    ALTER TABLE calendar_bookings ADD CONSTRAINT check_booking_times CHECK (end_time > start_time);
  END IF;
END $$;

-- Workspace usage period constraint
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspace_usage') THEN
    ALTER TABLE workspace_usage DROP CONSTRAINT IF EXISTS check_usage_period;
    ALTER TABLE workspace_usage ADD CONSTRAINT check_usage_period CHECK (period_end > period_start);
  END IF;
END $$;

-- =====================================================
-- 4. ADD CHAT SESSION STATUS CONSTRAINT (conditional)
-- =====================================================
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_sessions') THEN
    ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS check_session_status;
    ALTER TABLE chat_sessions ADD CONSTRAINT check_session_status CHECK (status IN ('active', 'ended', 'archived'));
  END IF;
END $$;

-- =====================================================
-- 5. ADD WEBHOOK FAILURE LIMIT TRIGGER (conditional)
-- =====================================================
CREATE OR REPLACE FUNCTION check_webhook_failure_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.failure_count >= 10 AND NEW.is_active = true THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'webhook_subscriptions') THEN
    DROP TRIGGER IF EXISTS webhook_failure_limit_trigger ON webhook_subscriptions;
    CREATE TRIGGER webhook_failure_limit_trigger
    BEFORE UPDATE ON webhook_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION check_webhook_failure_limit();
  END IF;
END $$;

-- =====================================================
-- 6. ADD AUDIT LOG TABLE FOR SECURITY EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_workspace ON security_audit_log(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_user ON security_audit_log(user_id);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'security_audit_log' AND policyname = 'security_audit_service_only') THEN
    CREATE POLICY "security_audit_service_only" ON security_audit_log FOR ALL USING (false);
  END IF;
END $$;

-- =====================================================
-- 7. ADD API RATE LIMIT TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  window_end timestamptz DEFAULT (now() + interval '1 minute'),
  UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_tracking(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_tracking(window_end);

ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'rate_limit_tracking' AND policyname = 'rate_limit_service_only') THEN
    CREATE POLICY "rate_limit_service_only" ON rate_limit_tracking FOR ALL USING (false);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_tracking WHERE window_end < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. DOCUMENTATION
-- =====================================================
COMMENT ON TABLE security_audit_log IS 'Tracks security-relevant events for compliance and monitoring';
COMMENT ON TABLE rate_limit_tracking IS 'Tracks API rate limits per identifier and endpoint';
COMMENT ON FUNCTION check_webhook_failure_limit() IS 'Automatically disables webhooks after 10 consecutive failures';
COMMENT ON FUNCTION cleanup_old_rate_limits() IS 'Removes expired rate limit records - call periodically via cron';
