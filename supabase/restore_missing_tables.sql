-- ============================================================
-- RESTORE MISSING TABLES
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. LLM PROVIDERS (llm_models + workspace_llm_config)
-- ============================================================

-- Enum may already exist
DO $$ BEGIN
  CREATE TYPE llm_provider AS ENUM ('openai','anthropic','google','mistral','groq','together','custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS llm_models (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider llm_provider NOT NULL,
  model_id text NOT NULL,
  display_name text NOT NULL,
  description text,
  context_window integer DEFAULT 4096,
  max_output_tokens integer DEFAULT 4096,
  supports_vision boolean DEFAULT false,
  supports_function_calling boolean DEFAULT true,
  cost_per_1k_input numeric(10, 6),
  cost_per_1k_output numeric(10, 6),
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (provider, model_id)
);

CREATE TABLE IF NOT EXISTS workspace_llm_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  provider llm_provider NOT NULL,
  api_key_encrypted text,
  base_url text,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (workspace_id, provider)
);

-- Add LLM columns to agents if missing
DO $$ BEGIN
  ALTER TABLE agents ADD COLUMN llm_model_id uuid REFERENCES llm_models(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE agents ADD COLUMN llm_temperature numeric(3, 2) DEFAULT 0.7 CHECK (llm_temperature >= 0 AND llm_temperature <= 2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE agents ADD COLUMN llm_max_tokens integer DEFAULT 1024;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Insert default LLM models (skip if already inserted)
INSERT INTO llm_models (provider, model_id, display_name, description, context_window, max_output_tokens, supports_vision, supports_function_calling, is_default) VALUES
('openai', 'gpt-4o', 'GPT-4o', 'Most capable OpenAI model with vision support', 128000, 16384, true, true, true),
('openai', 'gpt-4o-mini', 'GPT-4o Mini', 'Smaller, faster, and cheaper GPT-4o variant', 128000, 16384, true, true, false),
('openai', 'gpt-4-turbo', 'GPT-4 Turbo', 'GPT-4 Turbo with improved performance', 128000, 4096, true, true, false),
('openai', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Fast and cost-effective for simple tasks', 16385, 4096, false, true, false),
('anthropic', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'Most intelligent Anthropic model', 200000, 8192, true, true, false),
('anthropic', 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 'Fast and affordable Anthropic model', 200000, 8192, true, true, false),
('anthropic', 'claude-3-opus-20240229', 'Claude 3 Opus', 'Most powerful for complex tasks', 200000, 4096, true, true, false),
('google', 'gemini-1.5-pro', 'Gemini 1.5 Pro', 'Google flagship model with large context', 2000000, 8192, true, true, false),
('google', 'gemini-1.5-flash', 'Gemini 1.5 Flash', 'Fast and efficient Google model', 1000000, 8192, true, true, false),
('mistral', 'mistral-large-latest', 'Mistral Large', 'Most capable Mistral model', 128000, 4096, false, true, false),
('mistral', 'mistral-medium-latest', 'Mistral Medium', 'Balanced performance and cost', 32000, 4096, false, true, false),
('mistral', 'mistral-small-latest', 'Mistral Small', 'Fast and cost-effective', 32000, 4096, false, true, false),
('groq', 'llama-3.1-70b-versatile', 'Llama 3.1 70B', 'Large Llama model via Groq', 131072, 4096, false, true, false),
('groq', 'llama-3.1-8b-instant', 'Llama 3.1 8B', 'Fast Llama model via Groq', 131072, 4096, false, true, false),
('groq', 'mixtral-8x7b-32768', 'Mixtral 8x7B', 'Mixtral MoE via Groq', 32768, 4096, false, true, false),
('together', 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'Llama 3.1 70B (Together)', 'Llama via Together AI', 131072, 4096, false, true, false),
('together', 'mistralai/Mixtral-8x22B-Instruct-v0.1', 'Mixtral 8x22B (Together)', 'Large Mixtral via Together', 65536, 4096, false, true, false)
ON CONFLICT (provider, model_id) DO NOTHING;

-- RLS
ALTER TABLE llm_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_llm_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "LLM models are viewable by everyone" ON llm_models FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view their workspace LLM config" ON workspace_llm_config FOR SELECT USING (user_has_workspace_access(auth.uid(), workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users with write access can manage LLM config" ON workspace_llm_config FOR ALL USING (has_role(auth.uid(), workspace_id, 'MANAGER'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Triggers
DROP TRIGGER IF EXISTS update_llm_models_updated_at ON llm_models;
CREATE TRIGGER update_llm_models_updated_at BEFORE UPDATE ON llm_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_llm_config_updated_at ON workspace_llm_config;
CREATE TRIGGER update_workspace_llm_config_updated_at BEFORE UPDATE ON workspace_llm_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_llm_models_provider ON llm_models(provider);
CREATE INDEX IF NOT EXISTS idx_llm_models_default ON llm_models(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_workspace_llm_config_workspace ON workspace_llm_config(workspace_id);


-- ============================================================
-- 2. BILLING (pricing_plans, workspace_subscriptions, workspace_usage, billing_invoices)
-- ============================================================

CREATE TABLE IF NOT EXISTS pricing_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  stripe_price_id text,
  stripe_price_id_yearly text,
  price_monthly integer NOT NULL DEFAULT 0,
  price_yearly integer NOT NULL DEFAULT 0,
  features jsonb DEFAULT '[]',
  limits jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Insert default pricing plans
INSERT INTO pricing_plans (name, slug, description, price_monthly, price_yearly, features, limits, is_featured, sort_order) VALUES
(
  'Starter', 'starter',
  'Perfect for small businesses getting started with AI support',
  4900, 47000,
  '["1 AI Agent", "1,000 conversations/month", "Web chat channel", "Email support", "Basic analytics", "Knowledge base (5 sources)"]'::jsonb,
  '{"agents": 1, "conversations_monthly": 1000, "knowledge_sources": 5, "team_members": 2}'::jsonb,
  false, 1
),
(
  'Professional', 'professional',
  'For growing teams that need more power and flexibility',
  14900, 143000,
  '["5 AI Agents", "10,000 conversations/month", "All channels (web, SMS, WhatsApp)", "Priority support", "Advanced analytics", "Knowledge base (25 sources)", "Custom personas", "API access", "Webhooks"]'::jsonb,
  '{"agents": 5, "conversations_monthly": 10000, "knowledge_sources": 25, "team_members": 10}'::jsonb,
  true, 2
),
(
  'Enterprise', 'enterprise',
  'Custom solutions for large organizations',
  0, 0,
  '["Unlimited AI Agents", "Unlimited conversations", "All channels + phone", "Dedicated support", "Custom integrations", "SLA guarantee", "SSO/SAML", "Custom training", "White-label option"]'::jsonb,
  '{"agents": -1, "conversations_monthly": -1, "knowledge_sources": -1, "team_members": -1}'::jsonb,
  false, 3
)
ON CONFLICT (slug) DO NOTHING;

-- Enum may already exist
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled','unpaid','paused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS workspace_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_id uuid REFERENCES pricing_plans(id) NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status subscription_status DEFAULT 'trialing' NOT NULL,
  billing_interval text DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  trial_ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  conversations_count integer DEFAULT 0,
  messages_count integer DEFAULT 0,
  ai_tokens_used bigint DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (workspace_id, period_start)
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  stripe_invoice_id text UNIQUE,
  stripe_payment_intent_id text,
  amount integer NOT NULL,
  currency text DEFAULT 'usd',
  status text DEFAULT 'draft',
  description text,
  invoice_pdf_url text,
  hosted_invoice_url text,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Triggers
DROP TRIGGER IF EXISTS update_pricing_plans_updated_at ON pricing_plans;
CREATE TRIGGER update_pricing_plans_updated_at BEFORE UPDATE ON pricing_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_subscriptions_updated_at ON workspace_subscriptions;
CREATE TRIGGER update_workspace_subscriptions_updated_at BEFORE UPDATE ON workspace_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_usage_updated_at ON workspace_usage;
CREATE TRIGGER update_workspace_usage_updated_at BEFORE UPDATE ON workspace_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_workspace ON workspace_subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_stripe_customer ON workspace_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_status ON workspace_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_workspace_usage_workspace_period ON workspace_usage(workspace_id, period_start);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_workspace ON billing_invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_stripe ON billing_invoices(stripe_invoice_id);

-- RLS
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "pricing_plans_public_read" ON pricing_plans FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "subscriptions_service_only" ON workspace_subscriptions FOR ALL USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "usage_service_only" ON workspace_usage FOR ALL USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "invoices_service_only" ON billing_invoices FOR ALL USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Functions
CREATE OR REPLACE FUNCTION get_workspace_usage(p_workspace_id uuid)
RETURNS TABLE (
  conversations_count integer,
  conversations_limit integer,
  messages_count integer,
  period_start timestamp with time zone,
  period_end timestamp with time zone
) AS $$
DECLARE
  v_subscription workspace_subscriptions%ROWTYPE;
  v_plan pricing_plans%ROWTYPE;
BEGIN
  SELECT * INTO v_subscription FROM workspace_subscriptions WHERE workspace_id = p_workspace_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 1000, 0, now(), now() + interval '30 days';
    RETURN;
  END IF;
  SELECT * INTO v_plan FROM pricing_plans WHERE id = v_subscription.plan_id;
  RETURN QUERY
  SELECT
    COALESCE(wu.conversations_count, 0)::integer,
    COALESCE((v_plan.limits->>'conversations_monthly')::integer, 1000),
    COALESCE(wu.messages_count, 0)::integer,
    COALESCE(wu.period_start, v_subscription.current_period_start),
    COALESCE(wu.period_end, v_subscription.current_period_end)
  FROM workspace_usage wu
  WHERE wu.workspace_id = p_workspace_id
    AND wu.period_start <= now()
    AND wu.period_end > now()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_conversation_count(p_workspace_id uuid)
RETURNS void AS $$
DECLARE
  v_period_start timestamp with time zone;
  v_period_end timestamp with time zone;
BEGIN
  SELECT current_period_start, current_period_end
  INTO v_period_start, v_period_end
  FROM workspace_subscriptions WHERE workspace_id = p_workspace_id;
  IF NOT FOUND THEN
    v_period_start := date_trunc('month', now());
    v_period_end := date_trunc('month', now()) + interval '1 month';
  END IF;
  INSERT INTO workspace_usage (workspace_id, period_start, period_end, conversations_count)
  VALUES (p_workspace_id, v_period_start, v_period_end, 1)
  ON CONFLICT (workspace_id, period_start)
  DO UPDATE SET conversations_count = workspace_usage.conversations_count + 1, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_usage_limit(p_workspace_id uuid)
RETURNS boolean AS $$
DECLARE
  v_current_count integer;
  v_limit integer;
BEGIN
  SELECT
    COALESCE(wu.conversations_count, 0),
    COALESCE((pp.limits->>'conversations_monthly')::integer, 1000)
  INTO v_current_count, v_limit
  FROM workspace_subscriptions ws
  JOIN pricing_plans pp ON pp.id = ws.plan_id
  LEFT JOIN workspace_usage wu ON wu.workspace_id = ws.workspace_id
    AND wu.period_start <= now() AND wu.period_end > now()
  WHERE ws.workspace_id = p_workspace_id;
  IF v_limit = -1 THEN RETURN true; END IF;
  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 3. AGENT TOOLS
-- ============================================================

-- Enum may already exist
DO $$ BEGIN
  CREATE TYPE tool_type AS ENUM ('webhook','calendar_booking','email_send','human_transfer','knowledge_search','lead_capture','custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS agent_tools (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  tool_type tool_type NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{"type": "object", "properties": {}, "required": []}',
  config jsonb NOT NULL DEFAULT '{}',
  is_enabled boolean DEFAULT true,
  rate_limit integer DEFAULT 0,
  timeout_seconds integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (agent_id, name)
);

-- Re-add FK from tool_executions to agent_tools (was dropped when agent_tools was deleted)
DO $$ BEGIN
  ALTER TABLE tool_executions ADD CONSTRAINT tool_executions_tool_id_fkey FOREIGN KEY (tool_id) REFERENCES agent_tools(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_only" ON agent_tools FOR ALL USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_tools_agent ON agent_tools(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tools_type ON agent_tools(tool_type);
CREATE INDEX IF NOT EXISTS idx_agent_tools_enabled ON agent_tools(agent_id, is_enabled) WHERE is_enabled = true;

DROP TRIGGER IF EXISTS update_agent_tools_updated_at ON agent_tools;
CREATE TRIGGER update_agent_tools_updated_at BEFORE UPDATE ON agent_tools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE agent_tools IS 'Tool definitions for agent function calling';


-- ============================================================
-- 4. CALLS (new table for Voice AI)
-- ============================================================

CREATE TABLE IF NOT EXISTS calls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  twilio_call_sid text,
  from_number text NOT NULL,
  to_number text NOT NULL,
  direction text NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'in-progress', 'completed', 'failed', 'no-answer', 'busy', 'transferred', 'voicemail')),
  duration integer,
  recording_url text,
  recording_sid text,
  recording_duration integer,
  transcript jsonb DEFAULT '[]'::jsonb,
  summary text,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  transferred_to text,
  transfer_reason text,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  session_id uuid REFERENCES chat_sessions(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "calls_service_role_only" ON calls FOR ALL USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_calls_workspace ON calls(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_twilio_sid ON calls(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_calls_from ON calls(from_number);

DROP TRIGGER IF EXISTS update_calls_updated_at ON calls;
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE calls IS 'Voice call records from Twilio Voice AI integration';


-- ============================================================
-- DONE! Verify with:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- ============================================================
