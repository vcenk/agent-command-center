-- Agent Tools Schema for Function Calling
-- This enables agents to execute actions via OpenAI function calling

-- Create tool type enum
CREATE TYPE tool_type AS ENUM (
  'webhook',           -- Call external API
  'calendar_booking',  -- Book appointments
  'email_send',        -- Send emails
  'human_transfer',    -- Escalate to human agent
  'knowledge_search',  -- Search knowledge base
  'lead_capture',      -- Explicitly capture lead info
  'custom'             -- User-defined function
);

-- Create agent_tools table
CREATE TABLE agent_tools (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  tool_type tool_type NOT NULL,
  -- JSON Schema for the function parameters
  parameters jsonb NOT NULL DEFAULT '{"type": "object", "properties": {}, "required": []}',
  -- Configuration specific to the tool type
  config jsonb NOT NULL DEFAULT '{}',
  -- Whether this tool is enabled
  is_enabled boolean DEFAULT true,
  -- Rate limiting (calls per hour, 0 = unlimited)
  rate_limit integer DEFAULT 0,
  -- Timeout in seconds
  timeout_seconds integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (agent_id, name)
);

-- Create tool_executions table to track tool calls
CREATE TABLE tool_executions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES agent_tools(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  -- Input parameters sent to the tool
  input_params jsonb,
  -- Output result from the tool
  output_result jsonb,
  -- Execution status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'timeout')),
  -- Error message if failed
  error_message text,
  -- Execution time in milliseconds
  execution_time_ms integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_agent_tools_agent ON agent_tools(agent_id);
CREATE INDEX idx_agent_tools_type ON agent_tools(tool_type);
CREATE INDEX idx_agent_tools_enabled ON agent_tools(agent_id, is_enabled) WHERE is_enabled = true;

CREATE INDEX idx_tool_executions_agent ON tool_executions(agent_id);
CREATE INDEX idx_tool_executions_session ON tool_executions(session_id);
CREATE INDEX idx_tool_executions_tool ON tool_executions(tool_id);
CREATE INDEX idx_tool_executions_created ON tool_executions(created_at DESC);

-- Enable RLS
ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_tools (service role only for security)
CREATE POLICY "service_role_only" ON agent_tools
FOR ALL USING (false);

-- RLS policies for tool_executions (service role only)
CREATE POLICY "service_role_only" ON tool_executions
FOR ALL USING (false);

-- Add trigger for updated_at
CREATE TRIGGER update_agent_tools_updated_at
BEFORE UPDATE ON agent_tools
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some built-in tool templates (disabled by default, as examples)
-- These can be cloned by users when creating tools

-- Comments for documentation
COMMENT ON TABLE agent_tools IS 'Tool definitions for agent function calling';
COMMENT ON TABLE tool_executions IS 'Log of all tool executions for auditing and debugging';
COMMENT ON COLUMN agent_tools.parameters IS 'JSON Schema defining the function parameters';
COMMENT ON COLUMN agent_tools.config IS 'Tool-specific configuration (webhook URL, email settings, etc.)';
