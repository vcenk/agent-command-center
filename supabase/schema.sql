-- Agent Command Center - Complete Database Schema
-- This file contains the complete database schema for reference and fresh installations
-- Run this in a new Supabase project to set up all tables

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE agent_status AS ENUM ('draft', 'live');
CREATE TYPE app_role AS ENUM ('OWNER', 'MANAGER', 'VIEWER');
CREATE TYPE business_domain AS ENUM ('healthcare', 'retail', 'finance', 'realestate', 'hospitality', 'other');
CREATE TYPE fallback_policy AS ENUM ('apologize', 'escalate', 'retry', 'transfer');
CREATE TYPE knowledge_type AS ENUM ('PDF', 'URL', 'TEXT');
CREATE TYPE persona_tone AS ENUM ('professional', 'friendly', 'casual', 'formal');
CREATE TYPE llm_provider AS ENUM ('openai', 'anthropic', 'google', 'mistral', 'groq', 'together', 'custom');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Workspaces (Multi-tenant base)
CREATE TABLE workspaces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- User Profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  workspace_id uuid REFERENCES workspaces(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- User Roles
CREATE TABLE user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role app_role DEFAULT 'VIEWER' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (user_id, workspace_id)
);

-- =====================================================
-- LLM CONFIGURATION
-- =====================================================

-- LLM Models Reference
CREATE TABLE llm_models (
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

-- Workspace LLM Configuration (API keys per workspace)
CREATE TABLE workspace_llm_config (
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

-- =====================================================
-- AGENT CONFIGURATION
-- =====================================================

-- Personas
CREATE TABLE personas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  role_title text NOT NULL,
  tone persona_tone DEFAULT 'professional' NOT NULL,
  greeting_script text,
  style_notes text,
  do_not_do text[],
  fallback_policy fallback_policy DEFAULT 'apologize' NOT NULL,
  escalation_rules text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Knowledge Sources
CREATE TABLE knowledge_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  type knowledge_type DEFAULT 'TEXT' NOT NULL,
  url text,
  file_name text,
  raw_text text,
  tags text[],
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Knowledge Chunks (for RAG)
CREATE TABLE knowledge_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id uuid NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Agents
CREATE TABLE agents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  persona_id uuid REFERENCES personas(id) ON DELETE SET NULL,
  business_domain business_domain DEFAULT 'other' NOT NULL,
  status agent_status DEFAULT 'draft' NOT NULL,
  goals text,
  channels jsonb DEFAULT '{}' NOT NULL,
  knowledge_source_ids text[],
  allowed_actions text[],
  llm_model_id uuid REFERENCES llm_models(id),
  llm_temperature numeric(3, 2) DEFAULT 0.7 CHECK (llm_temperature >= 0 AND llm_temperature <= 2),
  llm_max_tokens integer DEFAULT 1024,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Agent Web Widget Configuration
CREATE TABLE agent_web_widget_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE UNIQUE,
  enabled boolean DEFAULT true,
  primary_color text DEFAULT '#0ea5e9',
  position text DEFAULT 'bottom-right',
  launcher_label text DEFAULT 'Chat with us',
  allowed_domains text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Channel Configurations
CREATE TABLE channel_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  channel text NOT NULL,
  provider text,
  phone_number text,
  greeting text,
  business_hours text,
  escalation_to_human boolean DEFAULT false,
  voicemail_fallback boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (agent_id, channel)
);

-- =====================================================
-- CONVERSATION DATA
-- =====================================================

-- Leads
CREATE TABLE leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_id text,
  name text,
  email text,
  phone text,
  channel text,
  source text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Chat Sessions
CREATE TABLE chat_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  channel text DEFAULT 'web',
  status text DEFAULT 'active' NOT NULL,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  ended_at timestamp with time zone,
  messages jsonb DEFAULT '[]' NOT NULL,
  last_message text,
  last_message_at timestamp with time zone,
  summary text,
  internal_note text,
  lead_captured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Get user role in workspace
CREATE OR REPLACE FUNCTION get_user_role(_user_id uuid, _workspace_id uuid)
RETURNS app_role AS $$
  SELECT role FROM user_roles
  WHERE user_id = _user_id AND workspace_id = _workspace_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user has at least a certain role
CREATE OR REPLACE FUNCTION has_role(_min_role app_role, _user_id uuid, _workspace_id uuid)
RETURNS boolean AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role FROM user_roles
  WHERE user_id = _user_id AND workspace_id = _workspace_id;

  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  RETURN CASE
    WHEN _min_role = 'VIEWER' THEN true
    WHEN _min_role = 'MANAGER' THEN user_role IN ('MANAGER', 'OWNER')
    WHEN _min_role = 'OWNER' THEN user_role = 'OWNER'
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check workspace access
CREATE OR REPLACE FUNCTION user_has_workspace_access(_user_id uuid, _workspace_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_sources_updated_at
  BEFORE UPDATE ON knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_web_widget_config_updated_at
  BEFORE UPDATE ON agent_web_widget_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_configs_updated_at
  BEFORE UPDATE ON channel_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_llm_models_updated_at
  BEFORE UPDATE ON llm_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspace_llm_config_updated_at
  BEFORE UPDATE ON workspace_llm_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_web_widget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_llm_config ENABLE ROW LEVEL SECURITY;

-- Workspaces policies
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (user_has_workspace_access(auth.uid(), id));

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update workspaces"
  ON workspaces FOR UPDATE
  USING (has_role('OWNER', auth.uid(), id));

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- User roles policies
CREATE POLICY "Users can view roles in their workspace"
  ON user_roles FOR SELECT
  USING (user_has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Owners can manage roles"
  ON user_roles FOR ALL
  USING (has_role('OWNER', auth.uid(), workspace_id));

-- Personas policies
CREATE POLICY "Users can view personas in their workspace"
  ON personas FOR SELECT
  USING (user_has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Managers can manage personas"
  ON personas FOR ALL
  USING (has_role('MANAGER', auth.uid(), workspace_id));

-- Knowledge sources policies
CREATE POLICY "Users can view knowledge sources in their workspace"
  ON knowledge_sources FOR SELECT
  USING (user_has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Managers can manage knowledge sources"
  ON knowledge_sources FOR ALL
  USING (has_role('MANAGER', auth.uid(), workspace_id));

-- Knowledge chunks policies
CREATE POLICY "Users can view knowledge chunks via source"
  ON knowledge_chunks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM knowledge_sources ks
    WHERE ks.id = source_id AND user_has_workspace_access(auth.uid(), ks.workspace_id)
  ));

-- Agents policies
CREATE POLICY "Users can view agents in their workspace"
  ON agents FOR SELECT
  USING (user_has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Managers can manage agents"
  ON agents FOR ALL
  USING (has_role('MANAGER', auth.uid(), workspace_id));

-- Widget config policies (public read for widget, auth write)
CREATE POLICY "Anyone can view enabled widget configs"
  ON agent_web_widget_config FOR SELECT
  USING (enabled = true);

CREATE POLICY "Managers can manage widget configs"
  ON agent_web_widget_config FOR ALL
  USING (EXISTS (
    SELECT 1 FROM agents a
    WHERE a.id = agent_id AND has_role('MANAGER', auth.uid(), a.workspace_id)
  ));

-- Channel configs policies
CREATE POLICY "Users can view channel configs"
  ON channel_configs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM agents a
    WHERE a.id = agent_id AND user_has_workspace_access(auth.uid(), a.workspace_id)
  ));

CREATE POLICY "Managers can manage channel configs"
  ON channel_configs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM agents a
    WHERE a.id = agent_id AND has_role('MANAGER', auth.uid(), a.workspace_id)
  ));

-- Leads policies
CREATE POLICY "Users can view leads in their workspace"
  ON leads FOR SELECT
  USING (user_has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Anyone can insert leads (widget)"
  ON leads FOR INSERT
  WITH CHECK (true);

-- Chat sessions policies
CREATE POLICY "Users can view sessions in their workspace"
  ON chat_sessions FOR SELECT
  USING (user_has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Anyone can insert sessions (widget)"
  ON chat_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their own session"
  ON chat_sessions FOR UPDATE
  USING (true);

-- LLM models policies
CREATE POLICY "LLM models are viewable by authenticated users"
  ON llm_models FOR SELECT
  USING (is_active = true);

-- Workspace LLM config policies
CREATE POLICY "Users can view their workspace LLM config"
  ON workspace_llm_config FOR SELECT
  USING (user_has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Managers can manage workspace LLM config"
  ON workspace_llm_config FOR ALL
  USING (has_role('MANAGER', auth.uid(), workspace_id));

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_profiles_workspace ON profiles(workspace_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_workspace ON user_roles(workspace_id);
CREATE INDEX idx_personas_workspace ON personas(workspace_id);
CREATE INDEX idx_knowledge_sources_workspace ON knowledge_sources(workspace_id);
CREATE INDEX idx_knowledge_chunks_source ON knowledge_chunks(source_id);
CREATE INDEX idx_agents_workspace ON agents(workspace_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_channel_configs_agent ON channel_configs(agent_id);
CREATE INDEX idx_leads_workspace ON leads(workspace_id);
CREATE INDEX idx_leads_agent ON leads(agent_id);
CREATE INDEX idx_chat_sessions_workspace ON chat_sessions(workspace_id);
CREATE INDEX idx_chat_sessions_agent ON chat_sessions(agent_id);
CREATE INDEX idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX idx_llm_models_provider ON llm_models(provider);
CREATE INDEX idx_llm_models_default ON llm_models(is_default) WHERE is_default = true;
CREATE INDEX idx_workspace_llm_config_workspace ON workspace_llm_config(workspace_id);

-- =====================================================
-- SEED DATA - DEFAULT LLM MODELS
-- =====================================================

INSERT INTO llm_models (provider, model_id, display_name, description, context_window, max_output_tokens, supports_vision, supports_function_calling, is_default) VALUES
-- OpenAI Models
('openai', 'gpt-4o', 'GPT-4o', 'Most capable OpenAI model with vision support', 128000, 16384, true, true, true),
('openai', 'gpt-4o-mini', 'GPT-4o Mini', 'Smaller, faster, and cheaper GPT-4o variant', 128000, 16384, true, true, false),
('openai', 'gpt-4-turbo', 'GPT-4 Turbo', 'GPT-4 Turbo with improved performance', 128000, 4096, true, true, false),
('openai', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Fast and cost-effective for simple tasks', 16385, 4096, false, true, false),
-- Anthropic Models
('anthropic', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'Most intelligent Anthropic model', 200000, 8192, true, true, false),
('anthropic', 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 'Fast and affordable Anthropic model', 200000, 8192, true, true, false),
('anthropic', 'claude-3-opus-20240229', 'Claude 3 Opus', 'Most powerful for complex tasks', 200000, 4096, true, true, false),
-- Google Models
('google', 'gemini-1.5-pro', 'Gemini 1.5 Pro', 'Google flagship model with large context', 2000000, 8192, true, true, false),
('google', 'gemini-1.5-flash', 'Gemini 1.5 Flash', 'Fast and efficient Google model', 1000000, 8192, true, true, false),
-- Mistral Models
('mistral', 'mistral-large-latest', 'Mistral Large', 'Most capable Mistral model', 128000, 4096, false, true, false),
('mistral', 'mistral-small-latest', 'Mistral Small', 'Fast and cost-effective', 32000, 4096, false, true, false),
-- Groq Models
('groq', 'llama-3.1-70b-versatile', 'Llama 3.1 70B', 'Large Llama model via Groq (fast inference)', 131072, 4096, false, true, false),
('groq', 'llama-3.1-8b-instant', 'Llama 3.1 8B', 'Fast Llama model via Groq', 131072, 4096, false, true, false);
