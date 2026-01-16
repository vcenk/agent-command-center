-- Billing System Migration
-- Stripe integration for subscriptions and usage-based billing

-- =====================================================
-- PRICING PLANS
-- =====================================================

CREATE TABLE pricing_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  stripe_price_id text,
  stripe_price_id_yearly text,
  price_monthly integer NOT NULL DEFAULT 0, -- cents
  price_yearly integer NOT NULL DEFAULT 0, -- cents
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
  'Starter',
  'starter',
  'Perfect for small businesses getting started with AI support',
  4900, -- $49/month
  47000, -- $470/year (2 months free)
  '["1 AI Agent", "1,000 conversations/month", "Web chat channel", "Email support", "Basic analytics", "Knowledge base (5 sources)"]'::jsonb,
  '{"agents": 1, "conversations_monthly": 1000, "knowledge_sources": 5, "team_members": 2}'::jsonb,
  false,
  1
),
(
  'Professional',
  'professional',
  'For growing teams that need more power and flexibility',
  14900, -- $149/month
  143000, -- $1430/year (2 months free)
  '["5 AI Agents", "10,000 conversations/month", "All channels (web, SMS, WhatsApp)", "Priority support", "Advanced analytics", "Knowledge base (25 sources)", "Custom personas", "API access", "Webhooks"]'::jsonb,
  '{"agents": 5, "conversations_monthly": 10000, "knowledge_sources": 25, "team_members": 10}'::jsonb,
  true,
  2
),
(
  'Enterprise',
  'enterprise',
  'Custom solutions for large organizations',
  0, -- Custom pricing
  0,
  '["Unlimited AI Agents", "Unlimited conversations", "All channels + phone", "Dedicated support", "Custom integrations", "SLA guarantee", "SSO/SAML", "Custom training", "White-label option"]'::jsonb,
  '{"agents": -1, "conversations_monthly": -1, "knowledge_sources": -1, "team_members": -1}'::jsonb,
  false,
  3
);

-- =====================================================
-- WORKSPACE SUBSCRIPTIONS
-- =====================================================

CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused'
);

CREATE TABLE workspace_subscriptions (
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

-- =====================================================
-- USAGE TRACKING
-- =====================================================

CREATE TABLE workspace_usage (
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

-- =====================================================
-- BILLING HISTORY
-- =====================================================

CREATE TABLE billing_invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  stripe_invoice_id text UNIQUE,
  stripe_payment_intent_id text,
  amount integer NOT NULL, -- cents
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

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON pricing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspace_subscriptions_updated_at
  BEFORE UPDATE ON workspace_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspace_usage_updated_at
  BEFORE UPDATE ON workspace_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_workspace_subscriptions_workspace ON workspace_subscriptions(workspace_id);
CREATE INDEX idx_workspace_subscriptions_stripe_customer ON workspace_subscriptions(stripe_customer_id);
CREATE INDEX idx_workspace_subscriptions_status ON workspace_subscriptions(status);
CREATE INDEX idx_workspace_usage_workspace_period ON workspace_usage(workspace_id, period_start);
CREATE INDEX idx_billing_invoices_workspace ON billing_invoices(workspace_id);
CREATE INDEX idx_billing_invoices_stripe ON billing_invoices(stripe_invoice_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;

-- Pricing plans: Public read (anyone can see pricing)
CREATE POLICY "pricing_plans_public_read" ON pricing_plans
FOR SELECT USING (is_active = true);

-- Subscriptions: Service role only (manage through Edge Functions)
CREATE POLICY "subscriptions_service_only" ON workspace_subscriptions
FOR ALL USING (false);

-- Usage: Service role only
CREATE POLICY "usage_service_only" ON workspace_usage
FOR ALL USING (false);

-- Invoices: Service role only
CREATE POLICY "invoices_service_only" ON billing_invoices
FOR ALL USING (false);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Get current usage for a workspace
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
  -- Get subscription
  SELECT * INTO v_subscription
  FROM workspace_subscriptions
  WHERE workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 1000, 0, now(), now() + interval '30 days';
    RETURN;
  END IF;

  -- Get plan limits
  SELECT * INTO v_plan
  FROM pricing_plans
  WHERE id = v_subscription.plan_id;

  -- Return usage
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

-- Increment conversation count (called by chat function)
CREATE OR REPLACE FUNCTION increment_conversation_count(p_workspace_id uuid)
RETURNS void AS $$
DECLARE
  v_period_start timestamp with time zone;
  v_period_end timestamp with time zone;
BEGIN
  -- Get current billing period
  SELECT current_period_start, current_period_end
  INTO v_period_start, v_period_end
  FROM workspace_subscriptions
  WHERE workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    -- No subscription, use default monthly period
    v_period_start := date_trunc('month', now());
    v_period_end := date_trunc('month', now()) + interval '1 month';
  END IF;

  -- Upsert usage record
  INSERT INTO workspace_usage (workspace_id, period_start, period_end, conversations_count)
  VALUES (p_workspace_id, v_period_start, v_period_end, 1)
  ON CONFLICT (workspace_id, period_start)
  DO UPDATE SET
    conversations_count = workspace_usage.conversations_count + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if workspace has reached usage limit
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

  -- -1 means unlimited
  IF v_limit = -1 THEN
    RETURN true;
  END IF;

  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
