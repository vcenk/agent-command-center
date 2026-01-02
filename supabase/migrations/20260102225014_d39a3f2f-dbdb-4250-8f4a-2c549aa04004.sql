-- Add foreign key from leads to agents
ALTER TABLE public.leads
ADD CONSTRAINT leads_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;

-- Add foreign key from leads to chat_sessions (using session_id column to id)
-- Note: leads.session_id stores the chat_sessions.session_id value, not chat_sessions.id
-- We need to reference it properly, but since session_id is TEXT in chat_sessions and UUID in leads,
-- we'll add a proper FK to workspaces instead

-- Add foreign key from leads to workspaces  
ALTER TABLE public.leads
ADD CONSTRAINT leads_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;