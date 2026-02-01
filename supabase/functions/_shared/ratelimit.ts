// Rate limiting utility for Edge Functions
// Uses in-memory storage with sliding window algorithm
// For production at scale, consider using Upstash Redis

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in current window */
  remaining: number;
  /** Unix timestamp when the rate limit resets */
  resetAt: number;
  /** Total limit for the window */
  limit: number;
}

// In-memory store for rate limit data
// Note: In a multi-instance deployment, use Redis/Upstash instead
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  const nowSeconds = Math.floor(now / 1000);

  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < nowSeconds) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., IP address, user ID, session ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Math.floor(Date.now() / 1000);
  const windowEnd = now + config.windowSeconds;

  const existing = rateLimitStore.get(identifier);

  // If no existing record or window has expired, start fresh
  if (!existing || existing.resetAt < now) {
    rateLimitStore.set(identifier, { count: 1, resetAt: windowEnd });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: windowEnd,
      limit: config.limit,
    };
  }

  // Window is still active
  if (existing.count >= config.limit) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      limit: config.limit,
    };
  }

  // Increment count
  existing.count++;
  rateLimitStore.set(identifier, existing);

  return {
    allowed: true,
    remaining: config.limit - existing.count,
    resetAt: existing.resetAt,
    limit: config.limit,
  };
}

/**
 * Create a rate limit key from request attributes
 */
export function createRateLimitKey(
  endpoint: string,
  ...identifiers: (string | null | undefined)[]
): string {
  const parts = [endpoint, ...identifiers.filter(Boolean)];
  return parts.join(':');
}

/**
 * Get client IP from request headers
 */
export function getClientIP(req: Request): string {
  // Check common proxy headers
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to a default if no IP can be determined
  return 'unknown';
}

/**
 * Create a rate limit error response
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter: result.resetAt - Math.floor(Date.now() / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetAt),
        'Retry-After': String(result.resetAt - Math.floor(Date.now() / 1000)),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    }
  );
}

// ============================================
// Predefined rate limit configurations
// ============================================

export const RATE_LIMITS = {
  // Widget/chat - higher limits for user experience
  WIDGET_CHAT: { limit: 30, windowSeconds: 60 },       // 30 per minute
  WIDGET_CONFIG: { limit: 60, windowSeconds: 60 },     // 60 per minute

  // Session operations
  SESSION_CREATE: { limit: 10, windowSeconds: 60 },    // 10 per minute per IP
  SESSION_UPDATE: { limit: 60, windowSeconds: 60 },    // 60 per minute

  // Authenticated API operations
  API_READ: { limit: 100, windowSeconds: 60 },         // 100 per minute
  API_WRITE: { limit: 30, windowSeconds: 60 },         // 30 per minute
  API_DELETE: { limit: 10, windowSeconds: 60 },        // 10 per minute

  // OAuth operations - stricter limits
  OAUTH_CONNECT: { limit: 5, windowSeconds: 300 },     // 5 per 5 minutes

  // Webhooks
  WEBHOOK: { limit: 100, windowSeconds: 60 },          // 100 per minute

  // Billing operations - very strict
  BILLING: { limit: 10, windowSeconds: 300 },          // 10 per 5 minutes
} as const;

/**
 * Middleware-style rate limit checker
 * Returns null if allowed, or a Response if rate limited
 */
export function rateLimit(
  req: Request,
  endpoint: string,
  config: RateLimitConfig,
  additionalIdentifier?: string
): Response | null {
  const ip = getClientIP(req);
  const key = createRateLimitKey(endpoint, ip, additionalIdentifier);
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return rateLimitResponse(result);
  }

  return null;
}

/**
 * Rate limit by user/workspace instead of IP
 * Use this for authenticated endpoints
 */
export function rateLimitByUser(
  endpoint: string,
  userId: string,
  workspaceId: string,
  config: RateLimitConfig
): Response | null {
  const key = createRateLimitKey(endpoint, workspaceId, userId);
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return rateLimitResponse(result);
  }

  return null;
}
