// Edge Function: /leads
// Handles lead listing and retrieval with proper authentication

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  authenticateRequest,
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

    const { workspaceId } = authResult as AuthResult

    if (!workspaceId) {
      return errorResponse('No workspace found', 403)
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const leadIdOrAction = pathParts[1]
    const sessionId = pathParts[2]

    const db = getAdminClient()

    switch (req.method) {
      case 'GET': {
        // GET /leads/by-session/:sessionId - Get lead by session
        if (leadIdOrAction === 'by-session' && sessionId) {
          const { data, error } = await db
            .from('leads')
            .select('*')
            .eq('session_id', sessionId)
            .eq('workspace_id', workspaceId)
            .maybeSingle()

          if (error) return errorResponse(error.message, 500)
          return jsonResponse(data)
        }

        // GET /leads/:id - Get specific lead
        if (leadIdOrAction && leadIdOrAction !== 'by-session') {
          const { data, error } = await db
            .from('leads')
            .select('*, agents(id, name)')
            .eq('id', leadIdOrAction)
            .eq('workspace_id', workspaceId)
            .single()

          if (error || !data) return errorResponse('Lead not found', 404)
          return jsonResponse(data)
        }

        // GET /leads - List leads with filters
        const agentId = url.searchParams.get('agentId')
        const channel = url.searchParams.get('channel')
        const dateRange = url.searchParams.get('dateRange')
        const search = url.searchParams.get('search')

        let query = db
          .from('leads')
          .select('*, agents(id, name)')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })

        if (agentId && agentId !== 'all') {
          query = query.eq('agent_id', agentId)
        }

        if (channel && channel !== 'all') {
          query = query.eq('channel', channel)
        }

        if (dateRange && dateRange !== 'all') {
          const days = parseInt(dateRange)
          const fromDate = new Date()
          fromDate.setDate(fromDate.getDate() - days)
          query = query.gte('created_at', fromDate.toISOString())
        }

        if (search) {
          const searchTerm = `%${search}%`
          query = query.or(`email.ilike.${searchTerm},phone.ilike.${searchTerm},name.ilike.${searchTerm}`)
        }

        const { data, error } = await query

        if (error) return errorResponse(error.message, 500)
        return jsonResponse(data || [])
      }

      default:
        return errorResponse('Method not allowed', 405)
    }
  } catch (err) {
    console.error('Edge function error:', err)
    return errorResponse('Internal server error', 500)
  }
})
