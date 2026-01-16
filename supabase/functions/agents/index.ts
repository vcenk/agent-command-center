// Edge Function: /agents
// Handles all agent CRUD operations with proper authentication
// Frontend NEVER talks directly to the database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  authenticateRequest,
  hasMinRole,
  getAdminClient,
  jsonResponse,
  errorResponse,
  corsHeaders,
  AuthResult,
} from '../_shared/auth.ts'

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the request - returns 401/403 if invalid
    const authResult = await authenticateRequest(req)

    // If authResult is a Response, it's an error - return it immediately
    if (authResult instanceof Response) {
      return authResult
    }

    const { user, workspaceId, role } = authResult as AuthResult

    // User must have a workspace
    if (!workspaceId) {
      return errorResponse('No workspace found. Please complete onboarding.', 403)
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const agentId = pathParts[1] // /agents/:id

    const db = getAdminClient()

    // Route based on HTTP method
    switch (req.method) {
      case 'GET': {
        if (agentId) {
          // Get single agent - any role can view
          const { data, error } = await db
            .from('agents')
            .select('*')
            .eq('id', agentId)
            .eq('workspace_id', workspaceId) // CRITICAL: Only allow access to own workspace
            .single()

          if (error || !data) {
            return errorResponse('Agent not found', 404)
          }

          return jsonResponse(data)
        } else {
          // List all agents in workspace
          const { data, error } = await db
            .from('agents')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })

          if (error) {
            return errorResponse(error.message, 500)
          }

          return jsonResponse(data)
        }
      }

      case 'POST': {
        // Create agent - requires MANAGER or higher
        if (!hasMinRole(role, 'MANAGER')) {
          return errorResponse('Insufficient permissions. Manager role required.', 403)
        }

        const body = await req.json()

        // Validate required fields
        if (!body.name) {
          return errorResponse('Agent name is required', 400)
        }

        const { data, error } = await db
          .from('agents')
          .insert({
            ...body,
            workspace_id: workspaceId, // CRITICAL: Force workspace_id from auth
          })
          .select()
          .single()

        if (error) {
          return errorResponse(error.message, 500)
        }

        return jsonResponse(data, 201)
      }

      case 'PUT':
      case 'PATCH': {
        // Update agent - requires MANAGER or higher
        if (!hasMinRole(role, 'MANAGER')) {
          return errorResponse('Insufficient permissions. Manager role required.', 403)
        }

        if (!agentId) {
          return errorResponse('Agent ID is required', 400)
        }

        const body = await req.json()

        // Remove fields that shouldn't be updated
        delete body.id
        delete body.workspace_id
        delete body.created_at

        const { data, error } = await db
          .from('agents')
          .update(body)
          .eq('id', agentId)
          .eq('workspace_id', workspaceId) // CRITICAL: Only update own workspace
          .select()
          .single()

        if (error) {
          return errorResponse(error.message, 500)
        }

        if (!data) {
          return errorResponse('Agent not found', 404)
        }

        return jsonResponse(data)
      }

      case 'DELETE': {
        // Delete agent - requires MANAGER or higher
        if (!hasMinRole(role, 'MANAGER')) {
          return errorResponse('Insufficient permissions. Manager role required.', 403)
        }

        if (!agentId) {
          return errorResponse('Agent ID is required', 400)
        }

        const { error } = await db
          .from('agents')
          .delete()
          .eq('id', agentId)
          .eq('workspace_id', workspaceId) // CRITICAL: Only delete own workspace

        if (error) {
          return errorResponse(error.message, 500)
        }

        return jsonResponse({ success: true })
      }

      default:
        return errorResponse('Method not allowed', 405)
    }
  } catch (err) {
    console.error('Edge function error:', err)
    return errorResponse('Internal server error', 500)
  }
})
