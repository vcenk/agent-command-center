import type { CallSession } from '../types';

/**
 * Manages active call sessions
 * Each WebSocket connection gets its own CallSession keyed by streamSid
 */
class CallManager {
  private sessions = new Map<string, CallSession>();

  /**
   * Register a new call session
   */
  add(streamSid: string, session: CallSession): void {
    this.sessions.set(streamSid, session);
    console.log(`[CallManager] Session added: ${streamSid} (total: ${this.sessions.size})`);
  }

  /**
   * Get a call session by streamSid
   */
  get(streamSid: string): CallSession | undefined {
    return this.sessions.get(streamSid);
  }

  /**
   * Remove a call session
   */
  remove(streamSid: string): void {
    this.sessions.delete(streamSid);
    console.log(`[CallManager] Session removed: ${streamSid} (total: ${this.sessions.size})`);
  }

  /**
   * Get the count of active sessions
   */
  get activeCount(): number {
    return this.sessions.size;
  }

  /**
   * Get all active sessions (for monitoring/cleanup)
   */
  getAll(): Map<string, CallSession> {
    return this.sessions;
  }
}

// Singleton instance
export const callManager = new CallManager();
