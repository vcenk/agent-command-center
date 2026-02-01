// Edge Function: /calendar
// Handles Google Calendar OAuth, availability, and booking
// Endpoints:
// - GET /calendar/callback - OAuth callback (redirects to frontend)
// - GET /calendar/availability - Get available time slots
// - POST /calendar/book - Create a booking
// - DELETE /calendar/bookings/:id - Cancel a booking

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

function htmlRedirect(url: string) {
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=${url}">
        <script>window.location.href = "${url}";</script>
      </head>
      <body>
        <p>Redirecting to <a href="${url}">${url}</a>...</p>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' },
  })
}

// Types for Supabase client and integration
interface SupabaseClient {
  from: (table: string) => {
    select: (columns?: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: unknown; error: unknown }> } };
    update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
    insert: (data: Record<string, unknown>) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } };
    delete: () => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
  };
}

interface IntegrationConfig {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  calendar_id?: string;
  [key: string]: unknown;
}

interface Integration {
  id: string;
  workspace_id: string;
  provider: string;
  status: string;
  config: IntegrationConfig;
  settings: Record<string, unknown>;
}

interface CalendarItem {
  id: string;
  summary: string;
  primary?: boolean;
}

// Refresh Google OAuth token if expired
async function refreshGoogleToken(db: SupabaseClient, integration: Integration): Promise<string | null> {
  const { config } = integration

  // Check if token is still valid
  if (config.expires_at) {
    const expiresAt = new Date(config.expires_at)
    if (expiresAt > new Date(Date.now() + 60000)) {
      // Token valid for at least 1 more minute
      return config.access_token
    }
  }

  // Need to refresh
  if (!config.refresh_token) {
    console.error('No refresh token available')
    return null
  }

  const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!
  const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: config.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json()

  if (!response.ok || data.error) {
    console.error('Token refresh failed:', data.error)
    return null
  }

  // Update stored token
  const newConfig = {
    ...config,
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }

  await db
    .from('workspace_integrations')
    .update({ config: newConfig })
    .eq('id', integration.id)

  return data.access_token
}

// Generate time slots for a given date based on settings
function generateTimeSlots(
  date: string,
  settings: {
    business_hours_start: string;
    business_hours_end: string;
    slot_duration_minutes: number;
    buffer_minutes: number;
  },
  busySlots: { start: Date; end: Date }[]
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = []
  const [startHour, startMin] = settings.business_hours_start.split(':').map(Number)
  const [endHour, endMin] = settings.business_hours_end.split(':').map(Number)
  const duration = settings.slot_duration_minutes
  const buffer = settings.buffer_minutes

  // Create Date objects for the day
  const dayStart = new Date(`${date}T${settings.business_hours_start}:00`)
  const dayEnd = new Date(`${date}T${settings.business_hours_end}:00`)

  // Skip if the date is in the past
  const now = new Date()
  if (dayEnd < now) return slots

  let current = new Date(dayStart)
  if (current < now) {
    // Start from the next available slot after now
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes()
    const slotsToSkip = Math.ceil((minutesSinceMidnight - startHour * 60 - startMin) / (duration + buffer))
    current = new Date(dayStart.getTime() + slotsToSkip * (duration + buffer) * 60000)
  }

  while (current.getTime() + duration * 60000 <= dayEnd.getTime()) {
    const slotEnd = new Date(current.getTime() + duration * 60000)

    // Check if slot overlaps with any busy period
    const isBusy = busySlots.some(busy => {
      const busyStart = new Date(busy.start)
      const busyEnd = new Date(busy.end)
      return current < busyEnd && slotEnd > busyStart
    })

    if (!isBusy) {
      slots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString(),
      })
    }

    // Move to next slot (duration + buffer)
    current = new Date(current.getTime() + (duration + buffer) * 60000)
  }

  return slots
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const action = pathParts[1] // /calendar/:action

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceRoleKey)

  try {
    // GET /calendar/callback - OAuth callback from Google
    if (req.method === 'GET' && action === 'callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'

      if (error) {
        return htmlRedirect(`${frontendUrl}/dashboard/integrations/calendar?error=${encodeURIComponent(error)}`)
      }

      if (!code) {
        return htmlRedirect(`${frontendUrl}/dashboard/integrations/calendar?error=missing_code`)
      }

      // Find the integration in pending state
      const { data: integration, error: findError } = await db
        .from('workspace_integrations')
        .select('id, workspace_id, config')
        .eq('provider', 'google_calendar')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (findError || !integration) {
        return htmlRedirect(`${frontendUrl}/dashboard/integrations/calendar?error=invalid_state`)
      }

      // Exchange code for tokens
      const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!
      const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!
      const redirectUri = `${supabaseUrl}/functions/v1/calendar/callback`

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })

      const tokenData = await tokenResponse.json()

      if (!tokenResponse.ok || tokenData.error) {
        await db
          .from('workspace_integrations')
          .update({
            status: 'error',
            error_message: tokenData.error_description || tokenData.error || 'Token exchange failed',
          })
          .eq('id', integration.id)

        return htmlRedirect(`${frontendUrl}/dashboard/integrations/calendar?error=${encodeURIComponent(tokenData.error || 'token_failed')}`)
      }

      // Get user's calendar list
      const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const calendarsData = await calendarsResponse.json()

      // Store tokens and calendar info
      const config = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        available_calendars: calendarsData.items?.map((c: CalendarItem) => ({
          id: c.id,
          summary: c.summary,
          primary: c.primary,
        })) || [],
      }

      // Default settings
      const settings = {
        calendar_id: calendarsData.items?.find((c: CalendarItem) => c.primary)?.id || 'primary',
        calendar_name: calendarsData.items?.find((c: CalendarItem) => c.primary)?.summary || 'Primary',
        business_hours_start: '09:00',
        business_hours_end: '17:00',
        slot_duration_minutes: 30,
        buffer_minutes: 15,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      }

      await db
        .from('workspace_integrations')
        .update({
          status: 'connected',
          config,
          settings,
          connected_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', integration.id)

      // Log event
      await db
        .from('integration_events')
        .insert({
          integration_id: integration.id,
          event_type: 'oauth_connected',
          direction: 'inbound',
          status: 'success',
        })

      return htmlRedirect(`${frontendUrl}/dashboard/integrations/calendar?success=true`)
    }

    // GET /calendar/availability - Get available time slots
    if (req.method === 'GET' && action === 'availability') {
      const workspaceId = url.searchParams.get('workspaceId')
      const agentId = url.searchParams.get('agentId')
      const date = url.searchParams.get('date') // YYYY-MM-DD

      if (!workspaceId || !date) {
        return errorResponse('workspaceId and date are required', 400)
      }

      // Get Google Calendar integration
      const { data: integration, error: intError } = await db
        .from('workspace_integrations')
        .select('id, config, settings')
        .eq('workspace_id', workspaceId)
        .eq('provider', 'google_calendar')
        .eq('status', 'connected')
        .single()

      if (intError || !integration) {
        // No calendar connected - return mock slots for demo
        const mockSettings = {
          business_hours_start: '09:00',
          business_hours_end: '17:00',
          slot_duration_minutes: 30,
          buffer_minutes: 15,
        }
        const slots = generateTimeSlots(date, mockSettings, [])
        return jsonResponse({ slots, source: 'mock' })
      }

      // Refresh token if needed
      const accessToken = await refreshGoogleToken(db, integration)
      if (!accessToken) {
        return errorResponse('Failed to authenticate with Google Calendar', 401)
      }

      const { settings } = integration
      const calendarId = settings.calendar_id || 'primary'

      // Get busy times from Google Calendar
      const timeMin = new Date(`${date}T00:00:00`).toISOString()
      const timeMax = new Date(`${date}T23:59:59`).toISOString()

      const freeBusyResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeMin,
          timeMax,
          items: [{ id: calendarId }],
        }),
      })

      const freeBusyData = await freeBusyResponse.json()

      if (!freeBusyResponse.ok) {
        console.error('Google Calendar error:', freeBusyData)
        return errorResponse('Failed to fetch availability', 500)
      }

      const busySlots = freeBusyData.calendars?.[calendarId]?.busy || []

      // Also check existing bookings in our database
      const { data: existingBookings } = await db
        .from('calendar_bookings')
        .select('start_time, end_time')
        .eq('workspace_id', workspaceId)
        .gte('start_time', timeMin)
        .lte('start_time', timeMax)
        .in('status', ['pending', 'confirmed'])

      const allBusySlots = [
        ...busySlots.map((b: { start: string; end: string }) => ({ start: new Date(b.start), end: new Date(b.end) })),
        ...(existingBookings || []).map((b: { start_time: string; end_time: string }) => ({
          start: new Date(b.start_time),
          end: new Date(b.end_time),
        })),
      ]

      // Generate available slots
      const slots = generateTimeSlots(date, settings, allBusySlots)

      return jsonResponse({ slots, source: 'google' })
    }

    // POST /calendar/book - Create a booking
    if (req.method === 'POST' && action === 'book') {
      const body = await req.json()
      const {
        workspaceId,
        agentId,
        sessionId,
        startTime,
        endTime,
        title,
        description,
        attendeeName,
        attendeeEmail,
        attendeePhone,
      } = body

      if (!workspaceId || !agentId || !sessionId || !startTime || !attendeeEmail) {
        return errorResponse('Missing required fields', 400)
      }

      // Calculate end time if not provided (default 30 min)
      const start = new Date(startTime)
      const end = endTime ? new Date(endTime) : new Date(start.getTime() + 30 * 60000)

      // Get agent info for the booking title
      const { data: agent } = await db
        .from('agents')
        .select('name')
        .eq('id', agentId)
        .single()

      const bookingTitle = title || `Meeting with ${attendeeName || attendeeEmail}`
      const bookingDescription = description ||
        `Booked via ${agent?.name || 'AI Agent'}\n\nContact: ${attendeeEmail}${attendeePhone ? `\nPhone: ${attendeePhone}` : ''}`

      // Check for Google Calendar integration
      const { data: integration } = await db
        .from('workspace_integrations')
        .select('id, config, settings')
        .eq('workspace_id', workspaceId)
        .eq('provider', 'google_calendar')
        .eq('status', 'connected')
        .single()

      let externalEventId = null
      let externalCalendarId = null

      if (integration) {
        // Refresh token if needed
        const accessToken = await refreshGoogleToken(db, integration)

        if (accessToken) {
          const calendarId = integration.settings?.calendar_id || 'primary'

          // Create Google Calendar event
          const eventResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                summary: bookingTitle,
                description: bookingDescription,
                start: {
                  dateTime: start.toISOString(),
                  timeZone: integration.settings?.timezone || 'UTC',
                },
                end: {
                  dateTime: end.toISOString(),
                  timeZone: integration.settings?.timezone || 'UTC',
                },
                attendees: [{ email: attendeeEmail }],
                reminders: {
                  useDefault: false,
                  overrides: [
                    { method: 'email', minutes: 60 },
                    { method: 'popup', minutes: 15 },
                  ],
                },
              }),
            }
          )

          const eventData = await eventResponse.json()

          if (eventResponse.ok) {
            externalEventId = eventData.id
            externalCalendarId = calendarId
          } else {
            console.error('Failed to create Google Calendar event:', eventData)
          }

          // Log the event
          await db
            .from('integration_events')
            .insert({
              integration_id: integration.id,
              event_type: 'booking_created',
              direction: 'outbound',
              status: eventResponse.ok ? 'success' : 'failed',
              payload: { startTime, attendeeEmail },
              response: eventData,
            })
        }
      }

      // Find or create lead
      let leadId = null
      const { data: existingLead } = await db
        .from('leads')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle()

      if (existingLead) {
        leadId = existingLead.id
      } else if (attendeeEmail) {
        const { data: newLead } = await db
          .from('leads')
          .insert({
            workspace_id: workspaceId,
            agent_id: agentId,
            session_id: sessionId,
            email: attendeeEmail,
            phone: attendeePhone,
            source: 'calendar_booking',
          })
          .select('id')
          .single()

        leadId = newLead?.id
      }

      // Create booking record
      const { data: booking, error: bookingError } = await db
        .from('calendar_bookings')
        .insert({
          workspace_id: workspaceId,
          agent_id: agentId,
          session_id: sessionId,
          lead_id: leadId,
          title: bookingTitle,
          description: bookingDescription,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          attendee_name: attendeeName,
          attendee_email: attendeeEmail,
          attendee_phone: attendeePhone,
          external_event_id: externalEventId,
          external_calendar_id: externalCalendarId,
          status: 'confirmed',
        })
        .select()
        .single()

      if (bookingError) {
        console.error('Failed to create booking:', bookingError)
        return errorResponse('Failed to create booking', 500)
      }

      // Trigger Slack notification (fire and forget)
      try {
        const slackUrl = `${supabaseUrl}/functions/v1/slack/notify`
        fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            notificationType: 'booking_created',
            data: {
              agentName: agent?.name || 'AI Agent',
              attendeeName: attendeeName || 'Guest',
              attendeeEmail,
              startTime: start.toISOString(),
              title: bookingTitle,
            },
          }),
        }).catch(console.error)
      } catch (e) {
        console.error('Failed to send Slack notification:', e)
      }

      return jsonResponse({
        success: true,
        booking: {
          id: booking.id,
          title: booking.title,
          startTime: booking.start_time,
          endTime: booking.end_time,
          attendeeEmail: booking.attendee_email,
          calendarEventCreated: !!externalEventId,
        },
      }, 201)
    }

    // DELETE /calendar/bookings/:id - Cancel a booking
    if (req.method === 'DELETE' && action === 'bookings') {
      const bookingId = pathParts[2]

      if (!bookingId) {
        return errorResponse('Booking ID is required', 400)
      }

      // Get the booking
      const { data: booking, error: fetchError } = await db
        .from('calendar_bookings')
        .select('*, workspace_integrations!inner(id, config, settings)')
        .eq('id', bookingId)
        .single()

      if (fetchError || !booking) {
        return errorResponse('Booking not found', 404)
      }

      // Cancel in Google Calendar if connected
      if (booking.external_event_id && booking.external_calendar_id) {
        const integration = await db
          .from('workspace_integrations')
          .select('id, config, settings')
          .eq('workspace_id', booking.workspace_id)
          .eq('provider', 'google_calendar')
          .eq('status', 'connected')
          .single()

        if (integration.data) {
          const accessToken = await refreshGoogleToken(db, integration.data)

          if (accessToken) {
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(booking.external_calendar_id)}/events/${booking.external_event_id}`,
              {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            )
          }
        }
      }

      // Update booking status
      await db
        .from('calendar_bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', bookingId)

      return jsonResponse({ success: true })
    }

    return errorResponse('Not found', 404)
  } catch (err) {
    console.error('Calendar function error:', err)
    return errorResponse('Internal server error', 500)
  }
})
