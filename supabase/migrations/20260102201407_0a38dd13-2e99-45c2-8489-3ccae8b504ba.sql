-- Create enum types
CREATE TYPE public.persona_tone AS ENUM ('professional', 'friendly', 'casual', 'formal');
CREATE TYPE public.fallback_policy AS ENUM ('apologize', 'escalate', 'retry', 'transfer');
CREATE TYPE public.business_domain AS ENUM ('healthcare', 'retail', 'finance', 'realestate', 'hospitality', 'other');
CREATE TYPE public.agent_status AS ENUM ('draft', 'live');
CREATE TYPE public.knowledge_type AS ENUM ('PDF', 'URL', 'TEXT');

-- Create personas table
CREATE TABLE public.personas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  tone persona_tone NOT NULL DEFAULT 'professional',
  style_notes TEXT DEFAULT '',
  do_not_do TEXT[] DEFAULT '{}',
  greeting_script TEXT DEFAULT '',
  fallback_policy fallback_policy NOT NULL DEFAULT 'apologize',
  escalation_rules TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agents table
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_domain business_domain NOT NULL DEFAULT 'other',
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  channels JSONB NOT NULL DEFAULT '{"webChat": false, "phone": false, "sms": false, "whatsapp": false}',
  goals TEXT DEFAULT '',
  allowed_actions TEXT[] DEFAULT '{}',
  knowledge_source_ids UUID[] DEFAULT '{}',
  status agent_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create knowledge_sources table
CREATE TABLE public.knowledge_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type knowledge_type NOT NULL DEFAULT 'TEXT',
  url TEXT,
  file_name TEXT,
  raw_text TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create knowledge_chunks table for RAG
CREATE TABLE public.knowledge_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create channel_configs table
CREATE TABLE public.channel_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  greeting TEXT DEFAULT '',
  voicemail_fallback BOOLEAN DEFAULT false,
  business_hours TEXT DEFAULT '',
  escalation_to_human BOOLEAN DEFAULT false,
  provider TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_id, channel)
);

-- Enable RLS on all tables
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_configs ENABLE ROW LEVEL SECURITY;

-- Personas policies (workspace members can view, managers+ can modify)
CREATE POLICY "Users can view personas in their workspaces"
ON public.personas FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_roles.workspace_id = personas.workspace_id
  AND user_roles.user_id = auth.uid()
));

CREATE POLICY "Managers can create personas"
ON public.personas FOR INSERT
WITH CHECK (has_role(auth.uid(), workspace_id, 'MANAGER'));

CREATE POLICY "Managers can update personas"
ON public.personas FOR UPDATE
USING (has_role(auth.uid(), workspace_id, 'MANAGER'));

CREATE POLICY "Managers can delete personas"
ON public.personas FOR DELETE
USING (has_role(auth.uid(), workspace_id, 'MANAGER'));

-- Agents policies
CREATE POLICY "Users can view agents in their workspaces"
ON public.agents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_roles.workspace_id = agents.workspace_id
  AND user_roles.user_id = auth.uid()
));

CREATE POLICY "Managers can create agents"
ON public.agents FOR INSERT
WITH CHECK (has_role(auth.uid(), workspace_id, 'MANAGER'));

CREATE POLICY "Managers can update agents"
ON public.agents FOR UPDATE
USING (has_role(auth.uid(), workspace_id, 'MANAGER'));

CREATE POLICY "Managers can delete agents"
ON public.agents FOR DELETE
USING (has_role(auth.uid(), workspace_id, 'MANAGER'));

-- Knowledge sources policies
CREATE POLICY "Users can view knowledge in their workspaces"
ON public.knowledge_sources FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_roles.workspace_id = knowledge_sources.workspace_id
  AND user_roles.user_id = auth.uid()
));

CREATE POLICY "Managers can create knowledge"
ON public.knowledge_sources FOR INSERT
WITH CHECK (has_role(auth.uid(), workspace_id, 'MANAGER'));

CREATE POLICY "Managers can update knowledge"
ON public.knowledge_sources FOR UPDATE
USING (has_role(auth.uid(), workspace_id, 'MANAGER'));

CREATE POLICY "Managers can delete knowledge"
ON public.knowledge_sources FOR DELETE
USING (has_role(auth.uid(), workspace_id, 'MANAGER'));

-- Knowledge chunks policies (based on parent source)
CREATE POLICY "Users can view chunks for accessible sources"
ON public.knowledge_chunks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.knowledge_sources ks
  JOIN public.user_roles ur ON ur.workspace_id = ks.workspace_id
  WHERE ks.id = knowledge_chunks.source_id
  AND ur.user_id = auth.uid()
));

CREATE POLICY "System can manage chunks"
ON public.knowledge_chunks FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.knowledge_sources ks
  WHERE ks.id = knowledge_chunks.source_id
  AND has_role(auth.uid(), ks.workspace_id, 'MANAGER')
));

-- Channel configs policies (based on parent agent)
CREATE POLICY "Users can view channel configs"
ON public.channel_configs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.agents a
  JOIN public.user_roles ur ON ur.workspace_id = a.workspace_id
  WHERE a.id = channel_configs.agent_id
  AND ur.user_id = auth.uid()
));

CREATE POLICY "Managers can manage channel configs"
ON public.channel_configs FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.agents a
  WHERE a.id = channel_configs.agent_id
  AND has_role(auth.uid(), a.workspace_id, 'MANAGER')
));

-- Add updated_at triggers
CREATE TRIGGER update_personas_updated_at
BEFORE UPDATE ON public.personas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_sources_updated_at
BEFORE UPDATE ON public.knowledge_sources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_channel_configs_updated_at
BEFORE UPDATE ON public.channel_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_personas_workspace ON public.personas(workspace_id);
CREATE INDEX idx_agents_workspace ON public.agents(workspace_id);
CREATE INDEX idx_agents_persona ON public.agents(persona_id);
CREATE INDEX idx_knowledge_sources_workspace ON public.knowledge_sources(workspace_id);
CREATE INDEX idx_knowledge_chunks_source ON public.knowledge_chunks(source_id);
CREATE INDEX idx_channel_configs_agent ON public.channel_configs(agent_id);