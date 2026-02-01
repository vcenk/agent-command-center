// Edge Function: /personas
// Handles all persona CRUD operations with proper authentication

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
  PersonaCreateSchema,
  PersonaUpdateSchema,
  UUIDSchema,
  PERSONA_ALLOWED_UPDATE_FIELDS,
  filterAllowedFields,
  validationErrorResponse,
} from '../_shared/schemas.ts'
import { ZodError } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

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
    const personaId = pathParts[1]

    // Validate persona ID if provided
    if (personaId) {
      const idValidation = UUIDSchema.safeParse(personaId)
      if (!idValidation.success) {
        return errorResponse('Invalid persona ID format', 400)
      }
    }

    const db = getAdminClient()

    switch (req.method) {
      case 'GET': {
        if (personaId) {
          const { data, error } = await db
            .from('personas')
            .select('*')
            .eq('id', personaId)
            .eq('workspace_id', workspaceId)
            .single()

          if (error || !data) return errorResponse('Persona not found', 404)
          return jsonResponse(data)
        } else {
          const { data, error } = await db
            .from('personas')
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

        // Validate input
        const validation = PersonaCreateSchema.safeParse(body)
        if (!validation.success) {
          return validationErrorResponse(validation.error)
        }

        const validatedData = validation.data

        const { data, error } = await db
          .from('personas')
          .insert({
            name: validatedData.name,
            role_title: validatedData.role_title,
            tone: validatedData.tone,
            greeting: validatedData.greeting,
            style_notes: validatedData.style_notes,
            fallback_message: validatedData.fallback_message,
            escalation_policy: validatedData.escalation_policy,
            guardrails: validatedData.guardrails,
            workspace_id: workspaceId,
          })
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

        if (!personaId) return errorResponse('Persona ID required', 400)

        const body = await req.json()

        // Validate input
        const validation = PersonaUpdateSchema.safeParse(body)
        if (!validation.success) {
          return validationErrorResponse(validation.error)
        }

        // Filter to only allowed fields
        const filteredData = filterAllowedFields(
          validation.data,
          PERSONA_ALLOWED_UPDATE_FIELDS
        )

        if (Object.keys(filteredData).length === 0) {
          return errorResponse('No valid fields to update', 400)
        }

        const { data, error } = await db
          .from('personas')
          .update({
            ...filteredData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', personaId)
          .eq('workspace_id', workspaceId)
          .select()
          .single()

        if (error) return errorResponse(error.message, 500)
        if (!data) return errorResponse('Persona not found', 404)
        return jsonResponse(data)
      }

      case 'DELETE': {
        if (!hasMinRole(role, 'MANAGER')) {
          return errorResponse('Manager role required', 403)
        }

        if (!personaId) return errorResponse('Persona ID required', 400)

        const { error } = await db
          .from('personas')
          .delete()
          .eq('id', personaId)
          .eq('workspace_id', workspaceId)

        if (error) return errorResponse(error.message, 500)
        return jsonResponse({ success: true })
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
