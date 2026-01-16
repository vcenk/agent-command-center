-- LLM Providers Configuration
-- This migration adds support for configurable LLM providers

-- Create LLM provider enum
CREATE TYPE llm_provider AS ENUM (
  'openai',
  'anthropic',
  'google',
  'mistral',
  'groq',
  'together',
  'custom'
);

-- Create LLM model configuration table
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

-- Create workspace LLM configuration table
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

-- Add LLM model reference to agents table
ALTER TABLE agents
ADD COLUMN llm_model_id uuid REFERENCES llm_models(id),
ADD COLUMN llm_temperature numeric(3, 2) DEFAULT 0.7 CHECK (llm_temperature >= 0 AND llm_temperature <= 2),
ADD COLUMN llm_max_tokens integer DEFAULT 1024;

-- Insert default LLM models
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
('mistral', 'mistral-medium-latest', 'Mistral Medium', 'Balanced performance and cost', 32000, 4096, false, true, false),
('mistral', 'mistral-small-latest', 'Mistral Small', 'Fast and cost-effective', 32000, 4096, false, true, false),

-- Groq Models (fast inference)
('groq', 'llama-3.1-70b-versatile', 'Llama 3.1 70B', 'Large Llama model via Groq', 131072, 4096, false, true, false),
('groq', 'llama-3.1-8b-instant', 'Llama 3.1 8B', 'Fast Llama model via Groq', 131072, 4096, false, true, false),
('groq', 'mixtral-8x7b-32768', 'Mixtral 8x7B', 'Mixtral MoE via Groq', 32768, 4096, false, true, false),

-- Together AI Models
('together', 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'Llama 3.1 70B (Together)', 'Llama via Together AI', 131072, 4096, false, true, false),
('together', 'mistralai/Mixtral-8x22B-Instruct-v0.1', 'Mixtral 8x22B (Together)', 'Large Mixtral via Together', 65536, 4096, false, true, false);

-- Create RLS policies for llm_models (public read)
ALTER TABLE llm_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LLM models are viewable by everyone"
ON llm_models FOR SELECT
USING (is_active = true);

-- Create RLS policies for workspace_llm_config
ALTER TABLE workspace_llm_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace LLM config"
ON workspace_llm_config FOR SELECT
USING (user_has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Users with write access can manage LLM config"
ON workspace_llm_config FOR ALL
USING (has_role('MANAGER', auth.uid(), workspace_id));

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_llm_models_updated_at
BEFORE UPDATE ON llm_models
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspace_llm_config_updated_at
BEFORE UPDATE ON workspace_llm_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add index for faster model lookups
CREATE INDEX idx_llm_models_provider ON llm_models(provider);
CREATE INDEX idx_llm_models_default ON llm_models(is_default) WHERE is_default = true;
CREATE INDEX idx_workspace_llm_config_workspace ON workspace_llm_config(workspace_id);
