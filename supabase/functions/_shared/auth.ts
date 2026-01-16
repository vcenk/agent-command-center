// Shared authentication utilities for Edge Functions
// This ensures all requests are properly authenticated before accessing the database

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for all responses
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Response helpers
export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    return errorResponse('Missing authorization header', 401)
  }

  const token = authHeader.replace('Bearer ', '')

  if (!token) {
    return errorResponse('Invalid authorization header', 401)
  }

  // Create a client with the user's token to verify it
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  })

  // Verify the token by getting the user
  const { data: { user }, error: userError } = await userClient.auth.getUser()

  if (userError || !user) {
    return errorResponse('Invalid or expired token', 403)
  }

  // Now use service role to get user's workspace and role
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
