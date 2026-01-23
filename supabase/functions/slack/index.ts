// Edge Function: /slack
// Handles Slack OAuth callback and notification sending
// Endpoints:
// - GET /slack/callback - OAuth callback (redirects to frontend)
// - POST /slack/notify - Send notification to connected Slack channel
// - POST /slack/test - Send test notification

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

// Notification templates
const NOTIFICATION_TEMPLATES = {
  lead_captured: (data: { name?: string; email?: string; phone?: string; agentName: string }) => ({
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🎯 New Lead Captured!' },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Agent:*\n${data.agentName}` },
          { type: 'mrkdwn', text: `*Name:*\n${data.name || 'Not provided'}` },
          { type: 'mrkdwn', text: `*Email:*\n${data.email || 'Not provided'}` },
          { type: 'mrkdwn', text: `*Phone:*\n${data.phone || 'Not provided'}` },
        ],
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Captured at ${new Date().toLocaleString()}` },
        ],
      },
    ],
  }),

  session_started: (data: { agentName: string; channel: string }) => ({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `💬 New chat session started with *${data.agentName}* via ${data.channel}`,
        },
      },
    ],
  }),

  human_handoff: (data: { agentName: string; reason?: string; sessionId: string }) => ({
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🚨 Human Handoff Requested' },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Agent:*\n${data.agentName}` },
          { type: 'mrkdwn', text: `*Reason:*\n${data.reason || 'User requested human assistance'}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Session' },
            url: `${Deno.env.get('FRONTEND_URL') || ''}/dashboard/sessions/${data.sessionId}`,
            style: 'primary',
          },
        ],
      },
    ],
  }),

  booking_created: (data: {
    agentName: string;
    attendeeName: string;
    attendeeEmail: string;
    startTime: string;
    title: string;
  }) => ({
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📅 New Appointment Booked!' },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Agent:*\n${data.agentName}` },
          { type: 'mrkdwn', text: `*Title:*\n${data.title}` },
          { type: 'mrkdwn', text: `*When:*\n${new Date(data.startTime).toLocaleString()}` },
          { type: 'mrkdwn', text: `*Attendee:*\n${data.attendeeName} (${data.attendeeEmail})` },
        ],
      },
    ],
  }),
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const action = pathParts[1] // /slack/:action

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceRoleKey)

  try {
    // GET /slack/callback - OAuth callback from Slack
    if (req.method === 'GET' && action === 'callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'

      if (error) {
        return htmlRedirect(`${frontendUrl}/dashboard/integrations/slack?error=${encodeURIComponent(error)}`)
      }

      if (!code || !state) {
        return htmlRedirect(`${frontendUrl}/dashboard/integrations/slack?error=missing_params`)
      }

      // Find the integration with this state
      const { data: integration, error: findError } = await db
        .from('workspace_integrations')
        .select('id, workspace_id, config')
        .eq('provider', 'slack')
        .eq('status', 'pending')
        .single()

      // Check if state matches (would need to verify against stored state)
      if (findError || !integration) {
        return htmlRedirect(`${frontendUrl}/dashboard/integrations/slack?error=invalid_state`)
      }

      // Exchange code for token
      const clientId = Deno.env.get('SLACK_CLIENT_ID')!
      const clientSecret = Deno.env.get('SLACK_CLIENT_SECRET')!
      const redirectUri = `${supabaseUrl}/functions/v1/slack/callback`

      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      })

      const tokenData = await tokenResponse.json()

      if (!tokenData.ok) {
        await db
          .from('workspace_integrations')
          .update({
            status: 'error',
            error_message: tokenData.error || 'Token exchange failed',
          })
          .eq('id', integration.id)

        return htmlRedirect(`${frontendUrl}/dashboard/integrations/slack?error=${encodeURIComponent(tokenData.error || 'token_failed')}`)
      }

      // Get list of channels for the user to select from
      const channelsResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel&limit=100', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const channelsData = await channelsResponse.json()

      // Store tokens and team info
      const config = {
        access_token: tokenData.access_token,
        team_id: tokenData.team?.id,
        team_name: tokenData.team?.name,
        bot_user_id: tokenData.bot_user_id,
        app_id: tokenData.app_id,
        authed_user_id: tokenData.authed_user?.id,
        // Store available channels for selection
        available_channels: channelsData.ok ? channelsData.channels?.map((c: any) => ({
          id: c.id,
          name: c.name,
        })) : [],
      }

      // Default settings
      const settings = {
        notify_new_lead: true,
        notify_session_start: false,
        notify_human_handoff: true,
        notify_booking: true,
        channel_id: null, // User must select
        channel_name: null,
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
          payload: { team_name: tokenData.team?.name },
        })

      return htmlRedirect(`${frontendUrl}/dashboard/integrations/slack?success=true`)
    }

    // POST /slack/notify - Send notification (internal, service-role only)
    if (req.method === 'POST' && action === 'notify') {
      const body = await req.json()
      const { workspaceId, notificationType, data } = body

      if (!workspaceId || !notificationType || !data) {
        return errorResponse('Missing required fields: workspaceId, notificationType, data', 400)
      }

      // Get Slack integration for workspace
      const { data: integration, error: intError } = await db
        .from('workspace_integrations')
        .select('id, config, settings')
        .eq('workspace_id', workspaceId)
        .eq('provider', 'slack')
        .eq('status', 'connected')
        .single()

      if (intError || !integration) {
        // Slack not connected, silently skip
        return jsonResponse({ skipped: true, reason: 'Slack not connected' })
      }

      const { config, settings } = integration

      // Check if this notification type is enabled
      const settingKey = `notify_${notificationType.replace('_', '_')}` as keyof typeof settings
      if (!settings[settingKey]) {
        return jsonResponse({ skipped: true, reason: `${notificationType} notifications disabled` })
      }

      // Check if channel is configured
      if (!settings.channel_id) {
        return jsonResponse({ skipped: true, reason: 'No channel selected' })
      }

      // Get notification template
      const templateFn = NOTIFICATION_TEMPLATES[notificationType as keyof typeof NOTIFICATION_TEMPLATES]
      if (!templateFn) {
        return errorResponse(`Unknown notification type: ${notificationType}`, 400)
      }

      const message = templateFn(data)

      // Send to Slack
      const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: settings.channel_id,
          ...message,
        }),
      })

      const slackResult = await slackResponse.json()

      // Log the event
      await db
        .from('integration_events')
        .insert({
          integration_id: integration.id,
          event_type: `notification_${notificationType}`,
          direction: 'outbound',
          status: slackResult.ok ? 'success' : 'failed',
          payload: { notificationType, data },
          response: slackResult,
          error_message: slackResult.ok ? null : slackResult.error,
        })

      if (!slackResult.ok) {
        console.error('Slack API error:', slackResult.error)
        return errorResponse(`Slack error: ${slackResult.error}`, 500)
      }

      return jsonResponse({ success: true, messageTs: slackResult.ts })
    }

    // POST /slack/test - Send test notification
    if (req.method === 'POST' && action === 'test') {
      // Get auth token to verify user
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return errorResponse('Missing authorization', 401)
      }

      const token = authHeader.replace('Bearer ', '')
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })

      const { data: { user }, error: userError } = await userClient.auth.getUser()
      if (userError || !user) {
        return errorResponse('Invalid token', 403)
      }

      // Get user's workspace
      const { data: profile } = await db
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single()

      if (!profile?.workspace_id) {
        return errorResponse('No workspace found', 403)
      }

      // Get Slack integration
      const { data: integration } = await db
        .from('workspace_integrations')
        .select('id, config, settings')
        .eq('workspace_id', profile.workspace_id)
        .eq('provider', 'slack')
        .eq('status', 'connected')
        .single()

      if (!integration) {
        return errorResponse('Slack not connected', 400)
      }

      if (!integration.settings?.channel_id) {
        return errorResponse('No channel selected', 400)
      }

      // Send test message
      const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.config.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: integration.settings.channel_id,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '✅ *Test Notification*\n\nYour Slack integration is working correctly! You will receive notifications here when leads are captured or appointments are booked.',
              },
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `Sent from Agent Command Center at ${new Date().toLocaleString()}` },
              ],
            },
          ],
        }),
      })

      const slackResult = await slackResponse.json()

      // Log the event
      await db
        .from('integration_events')
        .insert({
          integration_id: integration.id,
          event_type: 'test_notification',
          direction: 'outbound',
          status: slackResult.ok ? 'success' : 'failed',
          response: slackResult,
          error_message: slackResult.ok ? null : slackResult.error,
        })

      if (!slackResult.ok) {
        return errorResponse(`Slack error: ${slackResult.error}`, 500)
      }

      return jsonResponse({ success: true })
    }

    // POST /slack/channels - Update selected channel
    if (req.method === 'POST' && action === 'channels') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return errorResponse('Missing authorization', 401)
      }

      const token = authHeader.replace('Bearer ', '')
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })

      const { data: { user }, error: userError } = await userClient.auth.getUser()
      if (userError || !user) {
        return errorResponse('Invalid token', 403)
      }

      const { data: profile } = await db
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single()

      if (!profile?.workspace_id) {
        return errorResponse('No workspace found', 403)
      }

      const body = await req.json()
      const { channelId, channelName } = body

      if (!channelId) {
        return errorResponse('channelId is required', 400)
      }

      const { error: updateError } = await db
        .from('workspace_integrations')
        .update({
          settings: db.rpc('jsonb_set_path', {
            target: 'settings',
            path: ['channel_id'],
            value: channelId,
          }),
        })
        .eq('workspace_id', profile.workspace_id)
        .eq('provider', 'slack')

      // Simpler approach - get and update
      const { data: integration } = await db
        .from('workspace_integrations')
        .select('id, settings')
        .eq('workspace_id', profile.workspace_id)
        .eq('provider', 'slack')
        .single()

      if (integration) {
        await db
          .from('workspace_integrations')
          .update({
            settings: {
              ...integration.settings,
              channel_id: channelId,
              channel_name: channelName,
            },
          })
          .eq('id', integration.id)
      }

      return jsonResponse({ success: true })
    }

    return errorResponse('Not found', 404)
  } catch (err) {
    console.error('Slack function error:', err)
    return errorResponse('Internal server error', 500)
  }
})
