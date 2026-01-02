-- Create table for web widget configuration per agent
CREATE TABLE public.agent_web_widget_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid UNIQUE NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  allowed_domains text[] NOT NULL DEFAULT '{}',
  position text NOT NULL DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
  launcher_label text NOT NULL DEFAULT 'Chat with us',
  primary_color text NOT NULL DEFAULT '#111827',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on agent_id for fast lookups
CREATE INDEX idx_agent_web_widget_config_agent_id ON public.agent_web_widget_config(agent_id);

-- Enable RLS
ALTER TABLE public.agent_web_widget_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can manage configs for agents in their workspace
CREATE POLICY "Users can view widget configs in their workspaces"
ON public.agent_web_widget_config
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM agents a
    JOIN user_roles ur ON ur.workspace_id = a.workspace_id
    WHERE a.id = agent_web_widget_config.agent_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Managers can insert widget configs"
ON public.agent_web_widget_config
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents a
    WHERE a.id = agent_web_widget_config.agent_id
    AND has_role(auth.uid(), a.workspace_id, 'MANAGER'::app_role)
  )
);

CREATE POLICY "Managers can update widget configs"
ON public.agent_web_widget_config
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM agents a
    WHERE a.id = agent_web_widget_config.agent_id
    AND has_role(auth.uid(), a.workspace_id, 'MANAGER'::app_role)
  )
);

CREATE POLICY "Managers can delete widget configs"
ON public.agent_web_widget_config
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM agents a
    WHERE a.id = agent_web_widget_config.agent_id
    AND has_role(auth.uid(), a.workspace_id, 'MANAGER'::app_role)
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_agent_web_widget_config_updated_at
BEFORE UPDATE ON public.agent_web_widget_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();