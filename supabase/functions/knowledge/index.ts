// Edge Function: /knowledge
// Handles all knowledge source CRUD operations with proper authentication

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
    const pathParts = url.pathname.split('/').filter(Boolean)
    const sourceId = pathParts[1]

    const db = getAdminClient()

    switch (req.method) {
      case 'GET': {
        if (sourceId) {
          const { data, error } = await db
            .from('knowledge_sources')
            .select('*')
            .eq('id', sourceId)
            .eq('workspace_id', workspaceId)
            .single()

          if (error || !data) return errorResponse('Knowledge source not found', 404)
          return jsonResponse(data)
        } else {
          const { data, error } = await db
            .from('knowledge_sources')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })

          if (error) return errorResponse(error.message, 500)
          return jsonResponse(data)
        }
      }

      case 'POST': {
        if (!hasMinRole(role, 'MANAGER')) {
          return errorResponse('Manager role required', 403)
        }

        const body = await req.json()
        if (!body.name || !body.type) {
          return errorResponse('Name and type are required', 400)
        }

        const { data, error } = await db
          .from('knowledge_sources')
          .insert({ ...body, workspace_id: workspaceId })
          .select()
          .single()

        if (error) return errorResponse(error.message, 500)
        return jsonResponse(data, 201)
      }

      case 'PUT':
      case 'PATCH': {
        if (!hasMinRole(role, 'MANAGER')) {
          return errorResponse('Manager role required', 403)
        }

        if (!sourceId) return errorResponse('Source ID required', 400)

        const body = await req.json()
        delete body.id
        delete body.workspace_id
        delete body.created_at

        const { data, error } = await db
          .from('knowledge_sources')
          .update(body)
          .eq('id', sourceId)
          .eq('workspace_id', workspaceId)
          .select()
          .single()

        if (error) return errorResponse(error.message, 500)
        if (!data) return errorResponse('Knowledge source not found', 404)
        return jsonResponse(data)
      }

      case 'DELETE': {
        if (!hasMinRole(role, 'MANAGER')) {
          return errorResponse('Manager role required', 403)
        }

        if (!sourceId) return errorResponse('Source ID required', 400)

        const { error } = await db
          .from('knowledge_sources')
          .delete()
          .eq('id', sourceId)
          .eq('workspace_id', workspaceId)

        if (error) return errorResponse(error.message, 500)
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
