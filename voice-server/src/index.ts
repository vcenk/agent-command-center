import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config';
import { handleMediaStream } from './server/websocket';
import { callManager } from './server/callManager';
import { cleanupStaleCalls } from './services/supabase';

const app = express();
const server = createServer(app);

// WebSocket server — handles Twilio Media Streams
const wss = new WebSocketServer({ server, path: '/media' });

wss.on('connection', (ws: WebSocket, req) => {
  const url = req.url || '/';
  console.log(`[Server] WebSocket connection on ${url}`);
  handleMediaStream(ws, url);
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeCalls: callManager.activeCount,
    uptime: process.uptime(),
  });
});

// Start server
async function start() {
  // Cleanup any stale calls from previous runs
  await cleanupStaleCalls();

  server.listen(config.port, () => {
    console.log(`[Server] Voice server listening on port ${config.port}`);
    console.log(`[Server] WebSocket endpoint: ws://localhost:${config.port}/media`);
    console.log(`[Server] Health check: http://localhost:${config.port}/health`);
  });
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  wss.close();
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...');
  wss.close();
  server.close();
  process.exit(0);
});
