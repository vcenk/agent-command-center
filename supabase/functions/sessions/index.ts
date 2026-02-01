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
import {
  SessionCreateSchema,
  SessionUpdateSchema,
  UUIDSchema,
  SESSION_ALLOWED_UPDATE_FIELDS,
  filterAllowedFields,
  validationErrorResponse,
} from '../_shared/schemas.ts'
import {
  rateLimit,
  rateLimitByUser,
  RATE_LIMITS,
} from '../_shared/ratelimit.ts'
import { ZodError } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

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

    // Validate session ID format if provided
    if (sessionId) {
      const idValidation = UUIDSchema.safeParse(sessionId)
      if (!idValidation.success) {
        return errorResponse('Invalid session ID format', 400)
      }
    }

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
          // List all sessions with pagination and filters
          const limitParam = url.searchParams.get('limit')
          const offsetParam = url.searchParams.get('offset')
          const agentId = url.searchParams.get('agentId')
          const status = url.searchParams.get('status')
          const channel = url.searchParams.get('channel')

          const limit = Math.min(Math.max(parseInt(limitParam || '50') || 50, 1), 100)
          const offset = Math.max(parseInt(offsetParam || '0') || 0, 0)

          let query = db
            .from('chat_sessions')
            .select('*, agents(id, name)')
            .eq('workspace_id', workspaceId)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1)

          if (agentId && agentId !== 'all') {
            query = query.eq('agent_id', agentId)
          }
          if (status && status !== 'all') {
            query = query.eq('status', status)
          }
          if (channel && channel !== 'all') {
            query = query.eq('channel', channel)
          }

          const { data, error } = await query

          if (error) return errorResponse(error.message, 500)
          return jsonResponse(data)
        }
      }

      case 'POST': {
        // Rate limit session creation - by IP for anonymous requests
        const rateLimitResult = rateLimit(req, 'session_create', RATE_LIMITS.SESSION_CREATE)
        if (rateLimitResult) {
          return rateLimitResult
        }

        // Create session - can be from widget (anonymous) or dashboard
        const body = await req.json()

        // Validate input
        const validation = SessionCreateSchema.safeParse(body)
        if (!validation.success) {
          return validationErrorResponse(validation.error)
        }

        const validatedData = validation.data

        // Get agent to verify it exists and get workspace
        const { data: agent } = await db
          .from('agents')
          .select('workspace_id, status')
          .eq('id', validatedData.agent_id)
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
            agent_id: validatedData.agent_id,
            session_id: validatedData.session_id,
            channel: validatedData.channel,
            status: 'active',
            messages: [],
            metadata: validatedData.metadata || {},
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

        // Validate input
        const validation = SessionUpdateSchema.safeParse(body)
        if (!validation.success) {
          return validationErrorResponse(validation.error)
        }

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

        // Build update object with explicit field handling
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        }

        const validatedData = validation.data

        if (validatedData.messages && validatedData.messages.length > 0) {
          // Append new messages (with validation already done)
          const existingMessages = Array.isArray(existing.messages) ? existing.messages : []
          updates.messages = [...existingMessages, ...validatedData.messages]
          updates.last_message = validatedData.messages[validatedData.messages.length - 1]?.content
          updates.last_message_at = new Date().toISOString()
        }

        if (validatedData.status) {
          updates.status = validatedData.status
          if (validatedData.status === 'completed' || validatedData.status === 'abandoned') {
            updates.ended_at = new Date().toISOString()
          }
        }

        if (validatedData.summary !== undefined) {
          updates.summary = validatedData.summary
        }
        if (validatedData.internal_note !== undefined) {
          updates.internal_note = validatedData.internal_note
        }
        if (validatedData.lead_captured !== undefined) {
          updates.lead_captured = validatedData.lead_captured
        }

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
    if (err instanceof ZodError) {
      return validationErrorResponse(err)
    }
    console.error('Edge function error:', err)
    return errorResponse('Internal server error', 500)
  }
})
