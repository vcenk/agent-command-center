-- Add new columns to chat_sessions for inbox functionality
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS last_message text,
ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS channel text DEFAULT 'web',
ADD COLUMN IF NOT EXISTS internal_note text;

-- Update existing sessions to populate last_message fields from messages jsonb
UPDATE public.chat_sessions 
SET 
  last_message = (messages->-1->>'content')::text,
  last_message_at = updated_at
WHERE last_message IS NULL AND jsonb_array_length(messages) > 0;