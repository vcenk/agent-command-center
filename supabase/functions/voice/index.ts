// Edge Function: /voice
// Handles Twilio Voice AI webhook and call record CRUD
// Routes:
//   POST /voice/incoming  - Twilio incoming call webhook (returns TwiML)
//   POST /voice/status    - Twilio status callback (updates call record)
//   GET  /voice/calls     - List calls (authenticated, dashboard)
//   GET  /voice/calls/:id - Get single call (authenticated, dashboard)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  corsHeaders,
  AuthResult,
} from '../_shared/auth.ts'
import {
  CallFilterSchema,
  UUIDSchema,
} from '../_shared/schemas.ts'
import {
  rateLimit,
  RATE_LIMITS,
} from '../_shared/ratelimit.ts'
import {
  validateTwilioSignature,
  parseTwilioBody,
  twimlResponse,
} from '../_shared/twilio.ts'

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
    // pathParts: ["voice", "incoming"] or ["voice", "status"] or ["voice", "calls", ":id"]

    // Determine the sub-route
    const action = pathParts[1] || '' // "incoming", "status", or "calls"
    const callIdParam = pathParts[2] || '' // UUID for /calls/:id

    // =====================================================
    // POST /voice/incoming — Twilio incoming call webhook
    // =====================================================
    if (req.method === 'POST' && action === 'incoming') {
      // Rate limit by IP
      const rateLimitResult = rateLimit(req, 'voice_incoming', RATE_LIMITS.WEBHOOK)
      if (rateLimitResult) return rateLimitResult

      // Parse Twilio form body
      const params = await parseTwilioBody(req)

      // Validate Twilio signature
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
      if (twilioAuthToken) {
        const signature = req.headers.get('X-Twilio-Signature') || ''
        const webhookUrl = `${supabaseUrl}/functions/v1/voice/incoming`
        const isValid = await validateTwilioSignature(twilioAuthToken, signature, webhookUrl, params)
        if (!isValid) {
          console.error('Invalid Twilio signature')
          return twimlResponse('<Say>Sorry, this request could not be verified.</Say><Hangup/>')
        }
      }

      const callSid = params.CallSid
      const fromNumber = params.From || 'unknown'
      const toNumber = params.To || 'unknown'

      // Look up the agent by the To phone number in channel_configs
      const { data: channelConfig, error: configError } = await db
        .from('channel_configs')
        .select('agent_id, greeting, business_hours, voicemail_fallback, escalation_to_human')
        .eq('channel', 'phone')
        .eq('phone_number', toNumber)
        .maybeSingle()

      if (configError || !channelConfig) {
        console.error('No phone channel config found for number:', toNumber, configError)
        return twimlResponse(
          '<Say voice="alice">Sorry, this phone number is not configured for an AI agent. Goodbye.</Say><Hangup/>'
        )
      }

      // Get agent and workspace info
      const { data: agent, error: agentError } = await db
        .from('agents')
        .select('id, workspace_id, name, status')
        .eq('id', channelConfig.agent_id)
        .maybeSingle()

      if (agentError || !agent) {
        console.error('Agent not found for channel config:', channelConfig.agent_id, agentError)
        return twimlResponse(
          '<Say voice="alice">Sorry, this agent is not available right now. Goodbye.</Say><Hangup/>'
        )
      }

      if (agent.status !== 'live') {
        return twimlResponse(
          '<Say voice="alice">Sorry, this agent is not currently active. Please try again later. Goodbye.</Say><Hangup/>'
        )
      }

      // Check business hours (simple check)
      const businessHours = channelConfig.business_hours || '24/7'
      if (businessHours !== '24/7') {
        const now = new Date()
        const hour = now.getUTCHours() // Simplified — production should use timezone
        let startHour = 9
        let endHour = 17

        if (businessHours === '9am-9pm') {
          endHour = 21
        } else if (businessHours === '9am-5pm') {
          endHour = 17
        }

        if (hour < startHour || hour >= endHour) {
          if (channelConfig.voicemail_fallback) {
            return twimlResponse(
              `<Say voice="alice">Thank you for calling ${agent.name}. We are currently outside of business hours. Please leave a message after the beep, and we will get back to you.</Say>` +
              `<Record maxLength="120" action="${supabaseUrl}/functions/v1/voice/status" transcribe="true" />` +
              '<Say voice="alice">Thank you. Goodbye.</Say><Hangup/>'
            )
          }
          return twimlResponse(
            `<Say voice="alice">Thank you for calling ${agent.name}. We are currently outside of business hours. Please call back during our operating hours. Goodbye.</Say><Hangup/>`
          )
        }
      }

      // Create call record
      const { data: call, error: callError } = await db
        .from('calls')
        .insert({
          workspace_id: agent.workspace_id,
          agent_id: agent.id,
          twilio_call_sid: callSid,
          from_number: fromNumber,
          to_number: toNumber,
          direction: 'inbound',
          status: 'ringing',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (callError) {
        console.error('Failed to create call record:', callError)
        return twimlResponse(
          '<Say voice="alice">Sorry, we are experiencing technical difficulties. Please try again later.</Say><Hangup/>'
        )
      }

      // Build TwiML to connect to voice server
      const voiceServerUrl = Deno.env.get('VOICE_SERVER_URL')
      if (!voiceServerUrl) {
        console.error('VOICE_SERVER_URL not configured')
        return twimlResponse(
          '<Say voice="alice">Sorry, the voice service is not configured. Please try again later.</Say><Hangup/>'
        )
      }

      const streamUrl = `${voiceServerUrl}/media?callId=${call.id}&agentId=${agent.id}&workspaceId=${agent.workspace_id}&callSid=${callSid}`

      // Return TwiML: consent announcement + connect to media stream
      return twimlResponse(
        '<Say voice="alice">This call may be recorded for quality purposes.</Say>' +
        `<Connect><Stream url="${streamUrl}" /></Connect>`
      )
    }

    // =====================================================
    // POST /voice/status — Twilio status callback
    // =====================================================
    if (req.method === 'POST' && action === 'status') {
      const rateLimitResult = rateLimit(req, 'voice_status', RATE_LIMITS.WEBHOOK)
      if (rateLimitResult) return rateLimitResult

      const params = await parseTwilioBody(req)

      // Validate Twilio signature
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
      if (twilioAuthToken) {
        const signature = req.headers.get('X-Twilio-Signature') || ''
        const webhookUrl = `${supabaseUrl}/functions/v1/voice/status`
        const isValid = await validateTwilioSignature(twilioAuthToken, signature, webhookUrl, params)
        if (!isValid) {
          console.error('Invalid Twilio signature on status callback')
          return new Response('Forbidden', { status: 403 })
        }
      }

      const callSid = params.CallSid
      const callStatus = params.CallStatus
      const callDuration = params.CallDuration ? parseInt(params.CallDuration) : null
      const recordingUrl = params.RecordingUrl || null
      const recordingSid = params.RecordingSid || null
      const recordingDuration = params.RecordingDuration ? parseInt(params.RecordingDuration) : null

      if (!callSid) {
        return new Response('Missing CallSid', { status: 400 })
      }

      // Map Twilio status to our status enum
      const statusMap: Record<string, string> = {
        'queued': 'ringing',
        'ringing': 'ringing',
        'in-progress': 'in-progress',
        'completed': 'completed',
        'failed': 'failed',
        'busy': 'busy',
        'no-answer': 'no-answer',
        'canceled': 'failed',
      }

      const mappedStatus = statusMap[callStatus] || 'completed'

      const updates: Record<string, unknown> = {
        status: mappedStatus,
      }

      if (callDuration !== null) {
        updates.duration = callDuration
      }
      if (recordingUrl) {
        updates.recording_url = recordingUrl
      }
      if (recordingSid) {
        updates.recording_sid = recordingSid
      }
      if (recordingDuration !== null) {
        updates.recording_duration = recordingDuration
      }
      if (mappedStatus === 'completed' || mappedStatus === 'failed' || mappedStatus === 'busy' || mappedStatus === 'no-answer') {
        updates.ended_at = new Date().toISOString()
      }

      const { error: updateError } = await db
        .from('calls')
        .update(updates)
        .eq('twilio_call_sid', callSid)

      if (updateError) {
        console.error('Failed to update call record:', updateError)
      }

      // Twilio expects a 200 response
      return new Response('<Response/>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // =====================================================
    // GET /voice/calls — List calls (authenticated)
    // GET /voice/calls/:id — Get single call (authenticated)
    // =====================================================
    if (req.method === 'GET' && action === 'calls') {
      // Authenticate
      const authResult = await authenticateRequest(req)
      if (authResult instanceof Response) {
        return authResult
      }
      const { workspaceId } = authResult as AuthResult

      if (!workspaceId) {
        return errorResponse('Workspace required', 400)
      }

      // Single call by ID
      if (callIdParam) {
        const idValidation = UUIDSchema.safeParse(callIdParam)
        if (!idValidation.success) {
          return errorResponse('Invalid call ID format', 400)
        }

        const { data, error } = await db
          .from('calls')
          .select('*, agents(id, name)')
          .eq('id', callIdParam)
          .eq('workspace_id', workspaceId)
          .single()

        if (error || !data) return errorResponse('Call not found', 404)
        return jsonResponse(data)
      }

      // List calls with filters
      const agentId = url.searchParams.get('agentId')
      const status = url.searchParams.get('status')
      const dateFrom = url.searchParams.get('dateFrom')
      const dateTo = url.searchParams.get('dateTo')
      const limitParam = url.searchParams.get('limit')
      const offsetParam = url.searchParams.get('offset')

      const limit = Math.min(Math.max(parseInt(limitParam || '50') || 50, 1), 100)
      const offset = Math.max(parseInt(offsetParam || '0') || 0, 0)

      let query = db
        .from('calls')
        .select('*, agents(id, name)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (agentId && agentId !== 'all') {
        query = query.eq('agent_id', agentId)
      }
      if (status && status !== 'all') {
        query = query.eq('status', status)
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom)
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo)
      }

      const { data, error } = await query

      if (error) return errorResponse(error.message, 500)
      return jsonResponse(data || [])
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    console.error('Voice function error:', err)
    return errorResponse('Internal server error', 500)
  }
})
