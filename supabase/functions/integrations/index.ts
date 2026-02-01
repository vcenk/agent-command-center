// Edge Function: /integrations
// Handles integration CRUD operations and OAuth flows
// Supports: Slack, Google Calendar, and future integrations

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
import {
  encryptOAuthConfig,
  decryptOAuthConfig,
} from '../_shared/crypto.ts'
import {
  rateLimit,
  RATE_LIMITS,
} from '../_shared/ratelimit.ts'

// Supported integration providers
const SUPPORTED_PROVIDERS = ['slack', 'google_calendar', 'hubspot', 'zapier'] as const
type Provider = typeof SUPPORTED_PROVIDERS[number]

// OAuth configuration for each provider
const OAUTH_CONFIG = {
  slack: {
    authorizeUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read', 'users:read'],
  },
  google_calendar: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  },
} as const

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req)

    if (authResult instanceof Response) {
      return authResult
    }

    const { user, workspaceId, role } = authResult as AuthResult

    if (!workspaceId) {
      return errorResponse('No workspace found. Please complete onboarding.', 403)
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    // /integrations/:provider/:action
    const provider = pathParts[1] as Provider | undefined
    const action = pathParts[2] as string | undefined

    const db = getAdminClient()

    // Route based on HTTP method and path
    switch (req.method) {
      case 'GET': {
        // GET /integrations - List all integrations for workspace
        if (!provider) {
          const { data, error } = await db
            .from('workspace_integrations')
            .select('id, provider, status, settings, connected_at, error_message, created_at, updated_at')
            .eq('workspace_id', workspaceId)
            .order('provider')

          if (error) {
            return errorResponse(error.message, 500)
          }

          // Add available integrations that aren't connected yet
          const connectedProviders = new Set(data?.map(i => i.provider) || [])
          const availableIntegrations = SUPPORTED_PROVIDERS.map(p => {
            const existing = data?.find(i => i.provider === p)
            return existing || {
              provider: p,
              status: 'disconnected',
              settings: {},
              connected_at: null,
            }
          })

          return jsonResponse(availableIntegrations)
        }

        // GET /integrations/:provider - Get specific integration
        if (!SUPPORTED_PROVIDERS.includes(provider as Provider)) {
          return errorResponse(`Unknown provider: ${provider}`, 400)
        }

        const { data, error } = await db
          .from('workspace_integrations')
          .select('id, provider, status, settings, connected_at, error_message, created_at, updated_at')
          .eq('workspace_id', workspaceId)
          .eq('provider', provider)
          .maybeSingle()

        if (error) {
          return errorResponse(error.message, 500)
        }

        return jsonResponse(data || { provider, status: 'disconnected', settings: {} })
      }

      case 'POST': {
        // POST /integrations/:provider/connect - Start OAuth flow
        if (action === 'connect') {
          // Rate limit OAuth connections
          const rateLimitResult = rateLimit(req, 'oauth_connect', RATE_LIMITS.OAUTH_CONNECT, workspaceId)
          if (rateLimitResult) {
            return rateLimitResult
          }

          if (!hasMinRole(role, 'MANAGER')) {
            return errorResponse('Manager role required to connect integrations', 403)
          }

          if (!provider || !SUPPORTED_PROVIDERS.includes(provider as Provider)) {
            return errorResponse(`Unknown provider: ${provider}`, 400)
          }

          // Get OAuth config
          const oauthConfig = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG]
          if (!oauthConfig) {
            return errorResponse(`OAuth not supported for ${provider}`, 400)
          }

          // Get client credentials from environment
          const clientId = Deno.env.get(`${provider.toUpperCase()}_CLIENT_ID`)
          if (!clientId) {
            return errorResponse(`${provider} integration not configured. Missing client ID.`, 500)
          }

          // Generate state parameter for CSRF protection
          const state = crypto.randomUUID()

          // Store state in database for verification
          await db
            .from('workspace_integrations')
            .upsert({
              workspace_id: workspaceId,
              provider,
              status: 'pending',
              config: { oauth_state: state },
              settings: {},
            }, {
              onConflict: 'workspace_id,provider',
            })

          // Build OAuth authorize URL
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!
          const redirectUri = `${supabaseUrl}/functions/v1/${provider}/callback`

          const authorizeUrl = new URL(oauthConfig.authorizeUrl)
          authorizeUrl.searchParams.set('client_id', clientId)
          authorizeUrl.searchParams.set('redirect_uri', redirectUri)
          authorizeUrl.searchParams.set('scope', oauthConfig.scopes.join(' '))
          authorizeUrl.searchParams.set('state', state)

          // Provider-specific params
          if (provider === 'slack') {
            authorizeUrl.searchParams.set('user_scope', '')
          } else if (provider === 'google_calendar') {
            authorizeUrl.searchParams.set('response_type', 'code')
            authorizeUrl.searchParams.set('access_type', 'offline')
            authorizeUrl.searchParams.set('prompt', 'consent')
          }

          return jsonResponse({ authorizeUrl: authorizeUrl.toString() })
        }

        // POST /integrations/:provider/callback - Handle OAuth callback
        if (action === 'callback') {
          const body = await req.json()
          const { code, state } = body

          if (!code || !state) {
            return errorResponse('Missing code or state parameter', 400)
          }

          // Verify state matches
          const { data: integration } = await db
            .from('workspace_integrations')
            .select('id, config')
            .eq('workspace_id', workspaceId)
            .eq('provider', provider)
            .single()

          if (!integration || integration.config?.oauth_state !== state) {
            return errorResponse('Invalid state parameter', 400)
          }

          // Exchange code for tokens
          const oauthConfig = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG]
          const clientId = Deno.env.get(`${provider.toUpperCase()}_CLIENT_ID`)!
          const clientSecret = Deno.env.get(`${provider.toUpperCase()}_CLIENT_SECRET`)!
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!
          const redirectUri = `${supabaseUrl}/functions/v1/${provider}/callback`

          const tokenResponse = await fetch(oauthConfig.tokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
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

            return errorResponse(tokenData.error_description || 'Failed to connect', 400)
          }

          // Store tokens and mark as connected
          // Build config with tokens
          const rawConfig: Record<string, unknown> = {
            access_token: tokenData.access_token,
          }

          if (tokenData.refresh_token) {
            rawConfig.refresh_token = tokenData.refresh_token
          }
          if (tokenData.expires_in) {
            rawConfig.expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          }

          // Provider-specific data
          if (provider === 'slack' && tokenData.team) {
            rawConfig.team_id = tokenData.team.id
            rawConfig.team_name = tokenData.team.name
            rawConfig.bot_user_id = tokenData.bot_user_id
          }

          // Encrypt sensitive tokens before storing
          const encryptedConfig = await encryptOAuthConfig(rawConfig as {
            access_token?: string;
            refresh_token?: string;
            [key: string]: unknown;
          })

          await db
            .from('workspace_integrations')
            .update({
              status: 'connected',
              config: encryptedConfig,
              connected_at: new Date().toISOString(),
              connected_by: user.id,
              error_message: null,
            })
            .eq('id', integration.id)

          // Log the event
          await db
            .from('integration_events')
            .insert({
              integration_id: integration.id,
              event_type: 'oauth_connected',
              direction: 'inbound',
              status: 'success',
              payload: { provider },
            })

          return jsonResponse({ success: true, provider, status: 'connected' })
        }

        return errorResponse('Unknown action', 400)
      }

      case 'PATCH': {
        // PATCH /integrations/:provider/settings - Update settings
        if (!hasMinRole(role, 'MANAGER')) {
          return errorResponse('Manager role required to update integrations', 403)
        }

        if (!provider) {
          return errorResponse('Provider is required', 400)
        }

        const body = await req.json()
        const { settings } = body

        const { data, error } = await db
          .from('workspace_integrations')
          .update({
            settings,
            updated_at: new Date().toISOString(),
          })
          .eq('workspace_id', workspaceId)
          .eq('provider', provider)
          .select('id, provider, status, settings, updated_at')
          .single()

        if (error) {
          return errorResponse(error.message, 500)
        }

        if (!data) {
          return errorResponse('Integration not found', 404)
        }

        return jsonResponse(data)
      }

      case 'DELETE': {
        // DELETE /integrations/:provider - Disconnect integration
        if (!hasMinRole(role, 'MANAGER')) {
          return errorResponse('Manager role required to disconnect integrations', 403)
        }

        if (!provider) {
          return errorResponse('Provider is required', 400)
        }

        // Get integration to log event
        const { data: integration } = await db
          .from('workspace_integrations')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('provider', provider)
          .single()

        if (integration) {
          // Log disconnection event
          await db
            .from('integration_events')
            .insert({
              integration_id: integration.id,
              event_type: 'disconnected',
              direction: 'outbound',
              status: 'success',
              payload: { disconnected_by: user.id },
            })

          // Reset integration (keep record but clear tokens)
          await db
            .from('workspace_integrations')
            .update({
              status: 'disconnected',
              config: {},
              connected_at: null,
              connected_by: null,
              error_message: null,
            })
            .eq('id', integration.id)
        }

        return jsonResponse({ success: true, provider, status: 'disconnected' })
      }

      default:
        return errorResponse('Method not allowed', 405)
    }
  } catch (err) {
    console.error('Integrations function error:', err)
    return errorResponse('Internal server error', 500)
  }
})
