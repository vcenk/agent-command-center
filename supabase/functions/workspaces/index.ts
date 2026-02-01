// Edge Function: /workspaces
// Handles workspace creation and management with proper authentication
// Required because user_roles table has service_role_only RLS policy

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify user with anon client
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return errorResponse('Invalid or expired token', 401)
    }

    // Use service role for database operations
    const db = createClient(supabaseUrl, serviceRoleKey)

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const workspaceId = pathParts[1] // /workspaces/:id

    switch (req.method) {
      case 'POST': {
        // Create new workspace
        const body = await req.json()
        const { name } = body

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          return errorResponse('Workspace name is required', 400)
        }

        // Create the workspace
        const { data: workspace, error: wsError } = await db
          .from('workspaces')
          .insert({ name: name.trim(), created_by: user.id })
          .select()
          .single()

        if (wsError) {
          console.error('Failed to create workspace:', wsError)
          return errorResponse('Failed to create workspace', 500)
        }

        // Create user role as OWNER
        const { error: roleError } = await db
          .from('user_roles')
          .insert({
            user_id: user.id,
            workspace_id: workspace.id,
            role: 'OWNER',
          })

        if (roleError) {
          console.error('Failed to create user role:', roleError)
          // Rollback workspace creation
          await db.from('workspaces').delete().eq('id', workspace.id)
          return errorResponse('Failed to set up workspace permissions', 500)
        }

        // Update user's profile with workspace
        const { error: profileError } = await db
          .from('profiles')
          .update({ workspace_id: workspace.id })
          .eq('id', user.id)

        if (profileError) {
          console.error('Failed to update profile:', profileError)
          // Non-fatal, workspace is still created
        }

        return jsonResponse(workspace, 201)
      }

      case 'PATCH': {
        // Switch workspace
        if (!workspaceId) {
          return errorResponse('Workspace ID is required', 400)
        }

        // Verify user has access to this workspace
        const { data: roleData, error: roleCheckError } = await db
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('workspace_id', workspaceId)
          .single()

        if (roleCheckError || !roleData) {
          return errorResponse('You do not have access to this workspace', 403)
        }

        // Update user's profile
        const { error: profileError } = await db
          .from('profiles')
          .update({ workspace_id: workspaceId })
          .eq('id', user.id)

        if (profileError) {
          console.error('Failed to update profile:', profileError)
          return errorResponse('Failed to switch workspace', 500)
        }

        // Get workspace details
        const { data: workspace, error: wsError } = await db
          .from('workspaces')
          .select('*')
          .eq('id', workspaceId)
          .single()

        if (wsError || !workspace) {
          return errorResponse('Workspace not found', 404)
        }

        return jsonResponse({ workspace, role: roleData.role })
      }

      case 'GET': {
        // List user's workspaces
        const { data: roles, error: rolesError } = await db
          .from('user_roles')
          .select('role, workspace_id')
          .eq('user_id', user.id)

        if (rolesError) {
          console.error('Failed to fetch user roles:', rolesError)
          return errorResponse('Failed to fetch workspaces', 500)
        }

        if (!roles || roles.length === 0) {
          return jsonResponse([])
        }

        const workspaceIds = roles.map(r => r.workspace_id)
        const { data: workspaces, error: wsError } = await db
          .from('workspaces')
          .select('*')
          .in('id', workspaceIds)

        if (wsError) {
          console.error('Failed to fetch workspaces:', wsError)
          return errorResponse('Failed to fetch workspaces', 500)
        }

        const result = roles.map(r => {
          const ws = workspaces?.find(w => w.id === r.workspace_id)
          return ws ? { workspace: ws, role: r.role } : null
        }).filter(Boolean)

        return jsonResponse(result)
      }

      default:
        return errorResponse('Method not allowed', 405)
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    return errorResponse('Internal server error', 500)
  }
})
