import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),

  supabase: {
    url: requireEnv('SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },

  openai: {
    apiKey: requireEnv('OPENAI_API_KEY'),
  },

  deepgram: {
    apiKey: requireEnv('DEEPGRAM_API_KEY'),
  },

  twilio: {
    accountSid: requireEnv('TWILIO_ACCOUNT_SID'),
    authToken: requireEnv('TWILIO_AUTH_TOKEN'),
  },

  // Voice AI defaults
  voice: {
    ttsModel: 'tts-1',
    ttsVoice: 'alloy' as const,
    llmModel: 'gpt-4o-mini',
    deepgramModel: 'nova-2',
    sampleRate: 8000,
    // Deepgram endpointing — ms of silence before finalizing a transcript
    endpointingMs: 300,
  },
};
