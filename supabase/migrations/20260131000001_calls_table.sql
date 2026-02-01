-- Voice Calls Table
-- Stores call records for the phone channel (Twilio Voice AI)

CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Twilio identifiers
  twilio_call_sid text UNIQUE,
  from_number text NOT NULL,
  to_number text NOT NULL,
  direction text NOT NULL DEFAULT 'inbound'
    CHECK (direction IN ('inbound', 'outbound')),

  -- Call state
  status text NOT NULL DEFAULT 'ringing'
    CHECK (status IN ('ringing', 'in-progress', 'completed', 'failed', 'no-answer', 'busy', 'transferred', 'voicemail')),
  duration integer, -- seconds

  -- Recording
  recording_url text,
  recording_sid text,
  recording_duration integer, -- seconds

  -- Transcript (JSONB array matching chat message format)
  -- [{role: "user", content: "...", timestamp: "..."}, {role: "assistant", content: "...", timestamp: "..."}]
  transcript jsonb DEFAULT '[]'::jsonb,

  -- AI-generated summary
  summary text,

  -- Timestamps
  started_at timestamptz,
  ended_at timestamptz,

  -- Transfer info
  transferred_to text,
  transfer_reason text,

  -- Linked entities
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,

  -- Metadata (provider-specific data, call quality metrics, etc.)
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_calls_workspace_id ON calls(workspace_id);
CREATE INDEX idx_calls_agent_id ON calls(agent_id);
CREATE INDEX idx_calls_workspace_status ON calls(workspace_id, status);
CREATE INDEX idx_calls_workspace_created ON calls(workspace_id, created_at DESC);
CREATE INDEX idx_calls_twilio_sid ON calls(twilio_call_sid) WHERE twilio_call_sid IS NOT NULL;
CREATE INDEX idx_calls_from_number ON calls(from_number);

-- RLS: service_role only (same pattern as all other tables)
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'calls' AND policyname = 'calls_service_role_only') THEN
    CREATE POLICY "calls_service_role_only" ON calls FOR ALL USING (false);
  END IF;
END $$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calls_updated_at_trigger
BEFORE UPDATE ON calls
FOR EACH ROW
EXECUTE FUNCTION update_calls_updated_at();

COMMENT ON TABLE calls IS 'Voice call records from Twilio Voice AI integration';
COMMENT ON COLUMN calls.transcript IS 'JSONB array of {role, content, timestamp} objects matching chat message format';
COMMENT ON COLUMN calls.metadata IS 'Provider-specific data, call quality metrics, Twilio event data';
