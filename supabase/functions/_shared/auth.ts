// Shared authentication utilities for Edge Functions
// This ensures all requests are properly authenticated before accessing the database

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Get allowed origins from environment or use default
function getAllowedOrigins(): string[] {
  const origins = Deno.env.get('ALLOWED_ORIGINS');
  if (origins) {
    return origins.split(',').map(o => o.trim());
  }
  // Default allowed origins (update for production)
  return ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000'];
}

// Get CORS origin based on request
export function getCorsOrigin(req: Request): string {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigins = getAllowedOrigins();

  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  // For development, allow localhost variations
  if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
    return origin;
  }

  // Default to first allowed origin (for non-browser requests)
  return allowedOrigins[0] || '';
}

// Security headers for all responses
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, max-age=0',
}

// CORS headers for all responses (use getCorsOrigin for dynamic origin)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Override with getCorsOrigin in actual responses
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Get full headers with CORS and security
export function getResponseHeaders(req: Request): Record<string, string> {
  return {
    ...corsHeaders,
    ...securityHeaders,
    'Access-Control-Allow-Origin': getCorsOrigin(req),
  }
}

// Response helpers with security headers
export function jsonResponse(data: unknown, status = 200, req?: Request) {
  const headers = req ? getResponseHeaders(req) : { ...corsHeaders, ...securityHeaders };
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(message: string, status = 400, req?: Request) {
  const headers = req ? getResponseHeaders(req) : { ...corsHeaders, ...securityHeaders };
  // Don't expose internal error details in production
  const safeMessage = status >= 500 ? 'Internal server error' : message;
  return new Response(JSON.stringify({ error: safeMessage }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

// Authentication result type
export interface AuthResult {
  user: { id: string; email?: string }
  workspaceId: string | null
  role: 'OWNER' | 'MANAGER' | 'VIEWER' | null
}

/**
 * Authenticate the request and get user info
 * Returns 401/403 if authentication fails
 */
export async function authenticateRequest(req: Request): Promise<AuthResult | Response> {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    return errorResponse('Missing authorization header', 401, req)
  }

  const token = authHeader.replace('Bearer ', '')

  if (!token) {
    return errorResponse('Invalid authorization header', 401, req)
  }

  // Check for required environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY')
    return errorResponse('Server configuration error', 500, req)
  }

  // Create a client with the user's token to verify it
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  })

  // Verify the token by getting the user
  const { data: { user }, error: userError } = await userClient.auth.getUser()

  if (userError) {
    console.error('Auth error:', userError.message)
    return errorResponse('Invalid or expired token', 401, req)
  }

  if (!user) {
    return errorResponse('User not found', 401, req)
  }

  // Now use service role to get user's workspace and role
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceRoleKey) {
    console.error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY')
    return errorResponse('Server configuration error', 500, req)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // Get user's profile and workspace
  const { data: profile } = await adminClient
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile?.workspace_id) {
    return {
      user: { id: user.id, email: user.email },
      workspaceId: null,
      role: null,
    }
  }

  // Get user's role in the workspace
  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  return {
    user: { id: user.id, email: user.email },
    workspaceId: profile.workspace_id,
    role: roleData?.role || null,
  }
}

/**
 * Check if user has at least the required role
 */
export function hasMinRole(
  userRole: 'OWNER' | 'MANAGER' | 'VIEWER' | null,
  minRole: 'OWNER' | 'MANAGER' | 'VIEWER'
): boolean {
  if (!userRole) return false

  const roleHierarchy = { VIEWER: 1, MANAGER: 2, OWNER: 3 }
  return roleHierarchy[userRole] >= roleHierarchy[minRole]
}

/**
 * Get admin Supabase client (uses service role key)
 * This client bypasses RLS - use with caution!
 */
export function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(supabaseUrl, serviceRoleKey)
}
