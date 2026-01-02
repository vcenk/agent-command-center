-- Create chat_sessions table for logging web chat conversations
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_sessions
CREATE POLICY "Users can view chat sessions in their workspaces"
ON public.chat_sessions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_roles.workspace_id = chat_sessions.workspace_id
  AND user_roles.user_id = auth.uid()
));

CREATE POLICY "System can insert chat sessions"
ON public.chat_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update chat sessions"
ON public.chat_sessions FOR UPDATE
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_chat_sessions_workspace ON public.chat_sessions(workspace_id);
CREATE INDEX idx_chat_sessions_agent ON public.chat_sessions(agent_id);
CREATE INDEX idx_chat_sessions_session_id ON public.chat_sessions(session_id);