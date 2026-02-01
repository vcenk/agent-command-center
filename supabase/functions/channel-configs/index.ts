// Edge Function: /channel-configs
// Handles channel configuration CRUD operations with proper authentication

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authResult = await authenticateRequest(req)
    if (authResult instanceof Response) return authResult

    const { workspaceId, role } = authResult as AuthResult

    if (!workspaceId) {
      return errorResponse('No workspace found', 403)
    }

    const url = new URL(req.url)
    const db = getAdminClient()

    switch (req.method) {
      case 'GET': {
        // GET /channel-configs?agentId=xxx - List configs for agent
        const agentId = url.searchParams.get('agentId')

        if (!agentId) {
          return errorResponse('agentId is required', 400)
        }

        // Verify agent belongs to workspace
        const { data: agent } = await db
          .from('agents')
          .select('id')
          .eq('id', agentId)
          .eq('workspace_id', workspaceId)
          .single()

        if (!agent) {
          return errorResponse('Agent not found', 404)
        }

        const { data, error } = await db
          .from('channel_configs')
          .select('*')
          .eq('agent_id', agentId)

        if (error) return errorResponse(error.message, 500)
        return jsonResponse(data || [])
      }

      case 'POST': {
        // POST /channel-configs - Create or update channel config
        if (!hasMinRole(role, 'MANAGER')) {
          return errorResponse('Manager role required', 403)
        }

        const body = await req.json()

        if (!body.agent_id || !body.channel) {
          return errorResponse('agent_id and channel are required', 400)
        }

        // Verify agent belongs to workspace
        const { data: agent } = await db
          .from('agents')
          .select('id')
          .eq('id', body.agent_id)
          .eq('workspace_id', workspaceId)
          .single()

        if (!agent) {
          return errorResponse('Agent not found', 404)
        }

        // Remove fields that shouldn't be set by client
        delete body.id
        delete body.created_at
        delete body.updated_at

        const { data, error } = await db
          .from('channel_configs')
          .upsert(body, { onConflict: 'agent_id,channel' })
          .select()
          .single()

        if (error) return errorResponse(error.message, 500)
        return jsonResponse(data, 201)
      }

      default:
        return errorResponse('Method not allowed', 405)
    }
  } catch (err) {
    console.error('Edge function error:', err)
    return errorResponse('Internal server error', 500)
  }
})
