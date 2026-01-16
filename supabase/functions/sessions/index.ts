// Edge Function: /sessions
// Handles chat session operations
// Supports both authenticated users (dashboard) and anonymous (widget)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  jsonResponse,
  errorResponse,
  corsHeaders,
} from '../_shared/auth.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, serviceRoleKey)

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const sessionId = pathParts[1]

    // Check if request is from authenticated user or widget
    const authHeader = req.headers.get('Authorization')
    let workspaceId: string | null = null
    let isAuthenticated = false

    if (authHeader) {
      // Authenticated request - verify token
      const token = authHeader.replace('Bearer ', '')
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })

      const { data: { user } } = await userClient.auth.getUser()

      if (user) {
        isAuthenticated = true
        const { data: profile } = await db
          .from('profiles')
          .select('workspace_id')
          .eq('id', user.id)
          .single()

        workspaceId = profile?.workspace_id
      }
    }

    switch (req.method) {
      case 'GET': {
        // List sessions - requires authentication
        if (!isAuthenticated || !workspaceId) {
          return errorResponse('Authentication required', 401)
        }

        if (sessionId) {
          // Get single session
          const { data, error } = await db
            .from('chat_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('workspace_id', workspaceId)
            .single()

          if (error || !data) return errorResponse('Session not found', 404)
          return jsonResponse(data)
        } else {
          // List all sessions
          const limit = parseInt(url.searchParams.get('limit') || '50')
          const offset = parseInt(url.searchParams.get('offset') || '0')

          const { data, error } = await db
            .from('chat_sessions')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

          if (error) return errorResponse(error.message, 500)
          return jsonResponse(data)
        }
      }

      case 'POST': {
        // Create session - can be from widget (anonymous) or dashboard
        const body = await req.json()

        if (!body.agent_id || !body.session_id) {
          return errorResponse('agent_id and session_id are required', 400)
        }

        // Get agent to verify it exists and get workspace
        const { data: agent } = await db
          .from('agents')
          .select('workspace_id, status')
          .eq('id', body.agent_id)
          .single()

        if (!agent) {
          return errorResponse('Agent not found', 404)
        }

        // If agent is not live, only authenticated workspace members can use it
        if (agent.status !== 'live' && (!isAuthenticated || workspaceId !== agent.workspace_id)) {
          return errorResponse('Agent is not available', 403)
        }

        const { data, error } = await db
          .from('chat_sessions')
          .insert({
            workspace_id: agent.workspace_id,
            agent_id: body.agent_id,
            session_id: body.session_id,
            channel: body.channel || 'web',
            status: 'active',
            messages: body.messages || [],
          })
          .select()
          .single()

        if (error) return errorResponse(error.message, 500)
        return jsonResponse(data, 201)
      }

      case 'PATCH': {
        // Update session - add messages, end session, etc.
        if (!sessionId) {
          return errorResponse('Session ID required', 400)
        }

        const body = await req.json()

        // Get existing session
        const { data: existing } = await db
          .from('chat_sessions')
          .select('*')
          .eq('session_id', sessionId)
          .single()

        if (!existing) {
          return errorResponse('Session not found', 404)
        }

        // If authenticated, verify workspace access
        if (isAuthenticated && workspaceId !== existing.workspace_id) {
          return errorResponse('Access denied', 403)
        }

        // Build update object
        const updates: Record<string, unknown> = {}

        if (body.messages) {
          // Append new messages
          updates.messages = [...(existing.messages as unknown[]), ...body.messages]
          updates.last_message = body.messages[body.messages.length - 1]?.content
          updates.last_message_at = new Date().toISOString()
        }

        if (body.status) {
          updates.status = body.status
          if (body.status === 'ended') {
            updates.ended_at = new Date().toISOString()
          }
        }

        if (body.summary) updates.summary = body.summary
        if (body.internal_note) updates.internal_note = body.internal_note
        if (body.lead_captured !== undefined) updates.lead_captured = body.lead_captured

        const { data, error } = await db
          .from('chat_sessions')
          .update(updates)
          .eq('session_id', sessionId)
          .select()
          .single()

        if (error) return errorResponse(error.message, 500)
        return jsonResponse(data)
      }

      default:
        return errorResponse('Method not allowed', 405)
    }
  } catch (err) {
    console.error('Edge function error:', err)
    return errorResponse('Internal server error', 500)
  }
})
