import OpenAI from 'openai';
import { config } from '../config';
import { pcm16ToMuLaw8k } from '../audio/encoding';

let openaiClient: OpenAI;

function getClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openaiClient;
}

/**
 * Convert text to speech using OpenAI TTS API
 * Returns mu-law 8kHz audio buffer ready for Twilio
 */
export async function textToSpeech(text: string): Promise<Buffer> {
  const client = getClient();

  // Request PCM format from OpenAI TTS
  const response = await client.audio.speech.create({
    model: config.voice.ttsModel,
    voice: config.voice.ttsVoice,
    input: text,
    response_format: 'pcm', // Raw PCM16 at 24kHz
  });

  // Get the audio data as a buffer
  const arrayBuffer = await response.arrayBuffer();
  const pcmBuffer = Buffer.from(arrayBuffer);

  // Convert PCM16 24kHz to mu-law 8kHz for Twilio
  const muLawBuffer = pcm16ToMuLaw8k(pcmBuffer, 24000);

  return muLawBuffer;
}
