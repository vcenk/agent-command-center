-- Secure RLS Migration
-- This migration implements the security pattern recommended by @burakeregar:
-- 1. Enable RLS on all tables
-- 2. Remove permissive policies (frontend can't access directly)
-- 3. Only service_role can access the database
-- 4. All access goes through Edge Functions which authenticate users

-- =====================================================
-- IMPORTANT: After running this migration, your frontend
-- MUST use Edge Functions for ALL database operations.
-- Direct Supabase client queries will be blocked.
-- =====================================================

-- Drop all existing permissive policies for core tables
-- (We're replacing them with service-role-only access)

-- Agents table
DROP POLICY IF EXISTS "Users can view agents in their workspace" ON agents;
DROP POLICY IF EXISTS "Managers can manage agents" ON agents;

-- Personas table
DROP POLICY IF EXISTS "Users can view personas in their workspace" ON personas;
DROP POLICY IF EXISTS "Managers can manage personas" ON personas;

-- Knowledge sources table
DROP POLICY IF EXISTS "Users can view knowledge sources in their workspace" ON knowledge_sources;
DROP POLICY IF EXISTS "Managers can manage knowledge sources" ON knowledge_sources;

-- Knowledge chunks table
DROP POLICY IF EXISTS "Users can view knowledge chunks via source" ON knowledge_chunks;

-- Chat sessions table
DROP POLICY IF EXISTS "Users can view sessions in their workspace" ON chat_sessions;
DROP POLICY IF EXISTS "Anyone can insert sessions (widget)" ON chat_sessions;
DROP POLICY IF EXISTS "Anyone can update their own session" ON chat_sessions;

-- Leads table
DROP POLICY IF EXISTS "Users can view leads in their workspace" ON leads;
DROP POLICY IF EXISTS "Anyone can insert leads (widget)" ON leads;

-- Channel configs table
DROP POLICY IF EXISTS "Users can view channel configs" ON channel_configs;
DROP POLICY IF EXISTS "Managers can manage channel configs" ON channel_configs;

-- User roles table
DROP POLICY IF EXISTS "Users can view roles in their workspace" ON user_roles;
DROP POLICY IF EXISTS "Owners can manage roles" ON user_roles;

-- Workspace LLM config table
DROP POLICY IF EXISTS "Users can view their workspace LLM config" ON workspace_llm_config;
DROP POLICY IF EXISTS "Managers can manage workspace LLM config" ON workspace_llm_config;

-- =====================================================
-- Create new restrictive policies
-- These policies DENY all access except for service_role
-- This means frontend code using anon key cannot access data
-- =====================================================

-- Helper function to check if request is from service role
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS boolean AS $$
BEGIN
  -- service_role bypasses RLS entirely, so this function
  -- is only called for anon/authenticated users
  -- Always return false for non-service-role requests
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agents: No direct access (use Edge Functions)
CREATE POLICY "service_role_only" ON agents
FOR ALL USING (is_service_role());

-- Personas: No direct access
CREATE POLICY "service_role_only" ON personas
FOR ALL USING (is_service_role());

-- Knowledge sources: No direct access
CREATE POLICY "service_role_only" ON knowledge_sources
FOR ALL USING (is_service_role());

-- Knowledge chunks: No direct access
CREATE POLICY "service_role_only" ON knowledge_chunks
FOR ALL USING (is_service_role());

-- Channel configs: No direct access
CREATE POLICY "service_role_only" ON channel_configs
FOR ALL USING (is_service_role());

-- User roles: No direct access
CREATE POLICY "service_role_only" ON user_roles
FOR ALL USING (is_service_role());

-- Workspace LLM config: No direct access
CREATE POLICY "service_role_only" ON workspace_llm_config
FOR ALL USING (is_service_role());

-- =====================================================
-- SPECIAL CASES: Tables that need limited public access
-- =====================================================

-- Chat sessions: Widget needs to create/update sessions
-- But we route through Edge Functions anyway
CREATE POLICY "service_role_only" ON chat_sessions
FOR ALL USING (is_service_role());

-- Leads: Widget needs to create leads
-- But we route through Edge Functions anyway
CREATE POLICY "service_role_only" ON leads
FOR ALL USING (is_service_role());

-- LLM Models: Public read access (reference data)
-- This is safe because it's just a list of available models
DROP POLICY IF EXISTS "LLM models are viewable by authenticated users" ON llm_models;
CREATE POLICY "llm_models_public_read" ON llm_models
FOR SELECT USING (is_active = true);

-- Widget config: Public read for the widget embed script
DROP POLICY IF EXISTS "Anyone can view enabled widget configs" ON agent_web_widget_config;
DROP POLICY IF EXISTS "Managers can manage widget configs" ON agent_web_widget_config;

CREATE POLICY "widget_config_public_read" ON agent_web_widget_config
FOR SELECT USING (enabled = true);

CREATE POLICY "widget_config_service_write" ON agent_web_widget_config
FOR ALL USING (is_service_role());

-- =====================================================
-- PROFILES AND WORKSPACES
-- These need authenticated user access for auth flow
-- =====================================================

-- Profiles: Users can read/update their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "profiles_own_read" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_own_update" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_service_all" ON profiles
FOR ALL USING (is_service_role());

-- Workspaces: Limited access for auth flow
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update workspaces" ON workspaces;

-- Users can only see workspaces they're members of (for auth context)
CREATE POLICY "workspaces_member_read" ON workspaces
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.workspace_id = workspaces.id
    AND user_roles.user_id = auth.uid()
  )
);

CREATE POLICY "workspaces_service_all" ON workspaces
FOR ALL USING (is_service_role());

-- =====================================================
-- COMMENTS: Security notes
-- =====================================================

COMMENT ON POLICY "service_role_only" ON agents IS
'Blocks all direct access. Use Edge Functions with service_role key.';

COMMENT ON FUNCTION is_service_role() IS
'Always returns false for anon/authenticated. Service role bypasses RLS entirely.';
