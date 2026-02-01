// Shared Twilio utilities for Edge Functions
// Handles webhook signature validation and form body parsing

/**
 * Validate Twilio webhook signature (X-Twilio-Signature)
 * Uses HMAC-SHA1 as specified by Twilio's security docs
 *
 * @param authToken - Twilio Auth Token
 * @param signature - Value of X-Twilio-Signature header
 * @param url - The full URL Twilio sent the request to
 * @param params - The POST parameters as key-value pairs
 * @returns true if signature is valid
 */
export async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  // 1. Sort POST params alphabetically by key
  const sortedKeys = Object.keys(params).sort();

  // 2. Concatenate URL + sorted key-value pairs
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // 3. HMAC-SHA1 with auth token
  const encoder = new TextEncoder();
  const keyData = encoder.encode(authToken);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

  // 4. Base64 encode
  const computed = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  // 5. Compare (timing-safe comparison)
  return timingSafeEqual(computed, signature);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Parse URL-encoded form body from Twilio webhook
 * Twilio sends webhooks as application/x-www-form-urlencoded
 */
export async function parseTwilioBody(req: Request): Promise<Record<string, string>> {
  const text = await req.text();
  const params: Record<string, string> = {};

  for (const pair of text.split('&')) {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  }

  return params;
}

/**
 * Get the full webhook URL from the request
 * Needed for signature validation
 */
export function getWebhookUrl(req: Request): string {
  const url = new URL(req.url);
  // Use the public-facing URL (Supabase functions URL)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/voice${url.pathname.replace(/^\/voice/, '').replace(/^\/[^/]+/, '')}`;
  }
  return req.url;
}

/**
 * Generate TwiML response
 * Helper to create properly formatted TwiML XML responses
 */
export function twimlResponse(twiml: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${twiml}\n</Response>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
        'Cache-Control': 'no-store',
      },
    }
  );
}
