import OpenAI from 'openai';
import { config } from '../config';
import type { ChatMessage } from '../types';

let openaiClient: OpenAI;

function getClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openaiClient;
}

/**
 * Get a chat completion from OpenAI
 * Uses non-streaming mode since we need the full response for TTS
 */
export async function getChatCompletion(
  systemPrompt: string,
  messages: ChatMessage[],
  model: string = config.voice.llmModel,
  temperature: number = 0.7
): Promise<string> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature,
    max_tokens: 200, // Keep responses short for voice
    stream: false,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  return content;
}
