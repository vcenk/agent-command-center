import WebSocket from 'ws';
import { URL } from 'url';
import { callManager } from './callManager';
import { loadAgentConfig, updateCallRecord, finalizeCall } from '../services/supabase';
import { createDeepgramConnection, sendAudioToDeepgram, closeDeepgramConnection } from '../services/deepgram';
import { getChatCompletion } from '../services/openai-llm';
import { textToSpeech } from '../services/openai-tts';
import { transferCall, hangupCall } from '../services/twilio';
import { splitIntoFrames } from '../audio/encoding';
import { buildSystemPrompt } from '../prompts/systemPrompt';
import { config } from '../config';
import type { CallSession, TwilioMediaMessage, TranscriptMessage, ChatMessage } from '../types';

const TRANSFER_REGEX = /\[TRANSFER(?::([^\]]*))?\]/;

/**
 * Handle a new Twilio Media Stream WebSocket connection
 */
export async function handleMediaStream(ws: WebSocket, requestUrl: string): Promise<void> {
  // Parse query params from the connection URL
  const parsedUrl = new URL(requestUrl, 'http://localhost');
  const callId = parsedUrl.searchParams.get('callId');
  const agentId = parsedUrl.searchParams.get('agentId');
  const workspaceId = parsedUrl.searchParams.get('workspaceId');
  const callSid = parsedUrl.searchParams.get('callSid');

  if (!callId || !agentId || !workspaceId || !callSid) {
    console.error('[WS] Missing required query params:', { callId, agentId, workspaceId, callSid });
    ws.close();
    return;
  }

  console.log(`[WS] New connection: callId=${callId}, agentId=${agentId}`);

  // Load agent configuration
  let agentConfig;
  try {
    agentConfig = await loadAgentConfig(agentId);
  } catch (err) {
    console.error('[WS] Failed to load agent config:', err);
    ws.close();
    return;
  }

  const { agent, persona, knowledgeChunks, escalationNumber } = agentConfig;

  // Build system prompt
  const systemPrompt = buildSystemPrompt(agent, persona, knowledgeChunks);

  // Determine LLM model
  const llmModel = agent.llm_model?.model_id || config.voice.llmModel;
  const temperature = agent.llm_temperature ?? 0.7;

  // Create the call session (will be registered once we get streamSid)
  const session: CallSession = {
    callId,
    agentId,
    workspaceId,
    callSid,
    streamSid: '', // Set on 'start' event
    systemPrompt,
    llmModel,
    temperature,
    conversationHistory: [],
    transcript: [],
    deepgramConnection: null,
    isProcessing: false,
    startedAt: new Date(),
    escalationToHuman: !!escalationNumber,
    escalationNumber: escalationNumber || undefined,
  };

  // Buffer to accumulate interim transcripts
  let interimBuffer = '';

  // Set up Deepgram STT connection
  const deepgramConnection = createDeepgramConnection(
    // onTranscript
    async (text: string, isFinal: boolean) => {
      if (!isFinal) {
        interimBuffer = text;
        return;
      }

      // Final transcript received
      const finalText = text || interimBuffer;
      interimBuffer = '';

      if (!finalText.trim()) return;

      console.log(`[STT] Final: "${finalText}"`);

      // Add to transcript
      const userMessage: TranscriptMessage = {
        role: 'user',
        content: finalText,
        timestamp: new Date().toISOString(),
      };
      session.transcript.push(userMessage);
      session.conversationHistory.push({ role: 'user', content: finalText });

      // Process with LLM and respond with TTS
      if (!session.isProcessing) {
        await processAndRespond(session, ws);
      }
    },
    // onError
    (error: Error) => {
      console.error('[Deepgram] STT error:', error.message);
      // Try to speak a fallback message
      speakFallback(ws, session, 'I\'m having trouble understanding right now. Could you repeat that?');
    },
    // onClose
    () => {
      console.log('[Deepgram] STT connection closed');
    }
  );

  session.deepgramConnection = deepgramConnection;

  // Handle Twilio Media Stream messages
  ws.on('message', (data: WebSocket.Data) => {
    try {
      const message: TwilioMediaMessage = JSON.parse(data.toString());

      switch (message.event) {
        case 'connected':
          console.log('[Twilio] Media stream connected');
          break;

        case 'start':
          // Media stream started — register the session
          session.streamSid = message.start!.streamSid;
          callManager.add(session.streamSid, session);

          // Update call status to in-progress
          updateCallRecord(callId, { status: 'in-progress' });

          console.log(`[Twilio] Stream started: ${session.streamSid}`);

          // Send initial greeting via TTS
          const greeting = persona?.greeting_script || `Hello, you've reached ${agent.name}. How can I help you today?`;
          sendTTSResponse(ws, session, greeting);
          break;

        case 'media':
          // Forward audio to Deepgram for STT
          if (message.media?.payload && session.deepgramConnection) {
            const audioBuffer = Buffer.from(message.media.payload, 'base64');
            sendAudioToDeepgram(session.deepgramConnection, audioBuffer);
          }
          break;

        case 'mark':
          // TTS playback completed
          console.log(`[Twilio] Mark: ${message.mark?.name}`);
          break;

        case 'stop':
          // Stream ended — clean up
          console.log('[Twilio] Media stream stopped');
          cleanupSession(session);
          break;
      }
    } catch (err) {
      console.error('[WS] Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Connection closed: callId=${callId}`);
    cleanupSession(session);
  });

  ws.on('error', (err) => {
    console.error(`[WS] WebSocket error: callId=${callId}`, err);
    cleanupSession(session);
  });
}

/**
 * Process user input with LLM and respond with TTS
 */
async function processAndRespond(session: CallSession, ws: WebSocket): Promise<void> {
  session.isProcessing = true;

  try {
    // Get LLM response
    const responseText = await getChatCompletion(
      session.systemPrompt,
      session.conversationHistory,
      session.llmModel,
      session.temperature
    );

    console.log(`[LLM] Response: "${responseText.substring(0, 100)}..."`);

    // Check for transfer request
    const transferMatch = responseText.match(TRANSFER_REGEX);
    if (transferMatch && session.escalationToHuman && session.escalationNumber) {
      const transferReason = transferMatch[1] || 'Customer requested transfer';

      // Remove the [TRANSFER] marker from spoken text
      const spokenText = responseText.replace(TRANSFER_REGEX, '').trim();

      // Speak the pre-transfer message
      if (spokenText) {
        await sendTTSResponse(ws, session, spokenText);
      }

      // Update call record
      await updateCallRecord(session.callId, {
        status: 'transferred',
        transferred_to: session.escalationNumber,
        transfer_reason: transferReason,
      });

      // Initiate transfer via Twilio REST API
      await transferCall(session.callSid, session.escalationNumber);

      // Add to transcript
      session.transcript.push({
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
      });
      session.conversationHistory.push({ role: 'assistant', content: responseText });

      return;
    }

    // Normal response — add to transcript and speak
    const assistantMessage: TranscriptMessage = {
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString(),
    };
    session.transcript.push(assistantMessage);
    session.conversationHistory.push({ role: 'assistant', content: responseText });

    // Convert to speech and send
    await sendTTSResponse(ws, session, responseText);
  } catch (err) {
    console.error('[processAndRespond] Error:', err);

    // Fallback: try to speak an error message
    if (session.escalationToHuman && session.escalationNumber) {
      await speakFallback(ws, session, 'I apologize, I\'m experiencing a technical issue. Let me transfer you to a team member.');
      try {
        await transferCall(session.callSid, session.escalationNumber);
        await updateCallRecord(session.callId, {
          status: 'transferred',
          transferred_to: session.escalationNumber,
          transfer_reason: 'Technical error during AI processing',
        });
      } catch (transferErr) {
        console.error('[processAndRespond] Transfer failed:', transferErr);
      }
    } else {
      await speakFallback(ws, session, 'I apologize, I\'m having some trouble right now. Please try calling back in a moment.');
    }
  } finally {
    session.isProcessing = false;
  }
}

/**
 * Convert text to speech and send audio frames to Twilio
 */
async function sendTTSResponse(ws: WebSocket, session: CallSession, text: string): Promise<void> {
  try {
    const muLawBuffer = await textToSpeech(text);
    const frames = splitIntoFrames(muLawBuffer);

    // Send each frame as a Twilio media message
    for (const frame of frames) {
      if (ws.readyState !== WebSocket.OPEN) break;

      const message = JSON.stringify({
        event: 'media',
        streamSid: session.streamSid,
        media: {
          payload: frame.toString('base64'),
        },
      });

      ws.send(message);
    }

    // Send a mark to track when playback completes
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        event: 'mark',
        streamSid: session.streamSid,
        mark: { name: `tts_${Date.now()}` },
      }));
    }
  } catch (err) {
    console.error('[TTS] Error generating/sending speech:', err);

    // Fallback: use Twilio's built-in Say via REST API
    try {
      await hangupCall(session.callSid, text);
    } catch (fallbackErr) {
      console.error('[TTS] Fallback also failed:', fallbackErr);
    }
  }
}

/**
 * Speak a simple fallback message using TTS
 */
async function speakFallback(ws: WebSocket, session: CallSession, text: string): Promise<void> {
  try {
    await sendTTSResponse(ws, session, text);
  } catch {
    // Last resort — try Twilio REST API
    try {
      await hangupCall(session.callSid, text);
    } catch (err) {
      console.error('[speakFallback] All fallbacks failed:', err);
    }
  }
}

/**
 * Clean up a call session
 */
function cleanupSession(session: CallSession): void {
  // Close Deepgram connection
  if (session.deepgramConnection) {
    closeDeepgramConnection(session.deepgramConnection);
    session.deepgramConnection = null;
  }

  // Calculate duration
  const duration = Math.round((Date.now() - session.startedAt.getTime()) / 1000);

  // Save final transcript
  finalizeCall(session.callId, session.transcript, duration).catch(err => {
    console.error('[cleanupSession] Failed to finalize call:', err);
  });

  // Remove from call manager
  if (session.streamSid) {
    callManager.remove(session.streamSid);
  }
}
