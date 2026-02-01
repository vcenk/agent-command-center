import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';
import { config } from '../config';

/**
 * Create a Deepgram live transcription connection
 * Configured for Twilio's mu-law 8kHz audio format
 */
export function createDeepgramConnection(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError: (error: Error) => void,
  onClose: () => void
): LiveClient {
  const deepgram = createClient(config.deepgram.apiKey);

  const connection = deepgram.listen.live({
    model: config.voice.deepgramModel,
    language: 'en',
    encoding: 'mulaw',
    sample_rate: config.voice.sampleRate,
    channels: 1,
    punctuate: true,
    interim_results: true,
    endpointing: config.voice.endpointingMs,
    utterance_end_ms: 1000,
    smart_format: true,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log('[Deepgram] Connection opened');
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    if (transcript && transcript.trim().length > 0) {
      const isFinal = data.is_final || false;
      onTranscript(transcript, isFinal);
    }
  });

  connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
    // Utterance end — the speaker has stopped talking
    // This is handled via the isFinal flag in Transcript events
  });

  connection.on(LiveTranscriptionEvents.Error, (error) => {
    console.error('[Deepgram] Error:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log('[Deepgram] Connection closed');
    onClose();
  });

  return connection;
}

/**
 * Send audio data to Deepgram
 */
export function sendAudioToDeepgram(connection: LiveClient, audioBuffer: Buffer): void {
  if (connection.getReadyState() === 1) { // WebSocket.OPEN
    connection.send(audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer);
  }
}

/**
 * Close the Deepgram connection gracefully
 */
export function closeDeepgramConnection(connection: LiveClient): void {
  try {
    connection.requestClose();
  } catch (err) {
    console.error('[Deepgram] Error closing connection:', err);
  }
}
