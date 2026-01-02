-- Create leads table for capturing visitor contact information
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  session_id uuid UNIQUE,
  channel text DEFAULT 'web',
  name text,
  email text,
  phone text,
  source text DEFAULT 'chat_autodetect',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  -- At least one of email or phone must be present
  CONSTRAINT leads_contact_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Create indexes for performance
CREATE INDEX idx_leads_workspace_id ON public.leads(workspace_id);
CREATE INDEX idx_leads_agent_id ON public.leads(agent_id);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_email ON public.leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_phone ON public.leads(phone) WHERE phone IS NOT NULL;

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Users can view leads in their workspaces
CREATE POLICY "Users can view leads in their workspaces"
ON public.leads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.workspace_id = leads.workspace_id
    AND user_roles.user_id = auth.uid()
  )
);

-- System can insert leads (via service role from edge function)
CREATE POLICY "System can insert leads"
ON public.leads
FOR INSERT
WITH CHECK (true);

-- System can update leads (via service role from edge function)
CREATE POLICY "System can update leads"
ON public.leads
FOR UPDATE
USING (true);

-- Add lead tracking columns to chat_sessions
ALTER TABLE public.chat_sessions
ADD COLUMN lead_captured boolean DEFAULT false,
ADD COLUMN lead_id uuid REFERENCES public.leads(id);

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();