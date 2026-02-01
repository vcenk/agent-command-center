import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  corsHeaders,
  jsonResponse,
  errorResponse,
  authenticateRequest,
  hasMinRole,
  getAdminClient,
} from '../_shared/auth.ts'

interface AgentTool {
  id?: string
  agent_id: string
  name: string
  description: string
  tool_type: string
  parameters: Record<string, unknown>
  config: Record<string, unknown>
  is_enabled?: boolean
  rate_limit?: number
  timeout_seconds?: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the request
    const auth = await authenticateRequest(req)
    if (auth instanceof Response) {
      return auth
    }

    if (!auth.workspaceId) {
      return errorResponse('No workspace found', 400)
    }

    const supabase = getAdminClient()
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const toolId = pathParts[pathParts.length - 1]

    // GET /tools - List all tools for agents in this workspace
    // GET /tools?agent_id=xxx - List tools for specific agent
    if (req.method === 'GET') {
      const agentId = url.searchParams.get('agent_id')

      let query = supabase
        .from('agent_tools')
        .select(`
          *,
          agent:agents!inner(id, name, workspace_id)
        `)
        .eq('agent.workspace_id', auth.workspaceId)
        .order('created_at', { ascending: false })

      if (agentId) {
        query = query.eq('agent_id', agentId)
      }

      const { data: tools, error } = await query

      if (error) {
        console.error('Error fetching tools:', error)
        return errorResponse('Failed to fetch tools', 500)
      }

      return jsonResponse(tools || [])
    }

    // POST /tools - Create a new tool
    if (req.method === 'POST') {
      if (!hasMinRole(auth.role, 'MANAGER')) {
        return errorResponse('Insufficient permissions', 403)
      }

      const body: AgentTool = await req.json()

      // Validate required fields
      if (!body.agent_id || !body.name || !body.description || !body.tool_type) {
        return errorResponse('Missing required fields: agent_id, name, description, tool_type', 400)
      }

      // Verify the agent belongs to this workspace
      const { data: agent } = await supabase
        .from('agents')
        .select('id, workspace_id')
        .eq('id', body.agent_id)
        .single()

      if (!agent || agent.workspace_id !== auth.workspaceId) {
        return errorResponse('Agent not found or access denied', 404)
      }

      // Create the tool
      const { data: tool, error } = await supabase
        .from('agent_tools')
        .insert({
          agent_id: body.agent_id,
          name: body.name,
          description: body.description,
          tool_type: body.tool_type,
          parameters: body.parameters || { type: 'object', properties: {}, required: [] },
          config: body.config || {},
          is_enabled: body.is_enabled ?? true,
          rate_limit: body.rate_limit || 0,
          timeout_seconds: body.timeout_seconds || 30,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating tool:', error)
        if (error.code === '23505') {
          return errorResponse('A tool with this name already exists for this agent', 409)
        }
        return errorResponse('Failed to create tool', 500)
      }

      return jsonResponse(tool, 201)
    }

    // PUT /tools/:id - Update a tool
    if (req.method === 'PUT' && toolId && toolId !== 'tools') {
      if (!hasMinRole(auth.role, 'MANAGER')) {
        return errorResponse('Insufficient permissions', 403)
      }

      const body: Partial<AgentTool> = await req.json()

      // Verify the tool belongs to an agent in this workspace
      const { data: existingTool } = await supabase
        .from('agent_tools')
        .select(`
          id,
          agent:agents!inner(workspace_id)
        `)
        .eq('id', toolId)
        .single()

      if (!existingTool || existingTool.agent?.workspace_id !== auth.workspaceId) {
        return errorResponse('Tool not found or access denied', 404)
      }

      // Update the tool
      const updateData: Record<string, unknown> = {}
      if (body.name !== undefined) updateData.name = body.name
      if (body.description !== undefined) updateData.description = body.description
      if (body.tool_type !== undefined) updateData.tool_type = body.tool_type
      if (body.parameters !== undefined) updateData.parameters = body.parameters
      if (body.config !== undefined) updateData.config = body.config
      if (body.is_enabled !== undefined) updateData.is_enabled = body.is_enabled
      if (body.rate_limit !== undefined) updateData.rate_limit = body.rate_limit
      if (body.timeout_seconds !== undefined) updateData.timeout_seconds = body.timeout_seconds

      const { data: tool, error } = await supabase
        .from('agent_tools')
        .update(updateData)
        .eq('id', toolId)
        .select()
        .single()

      if (error) {
        console.error('Error updating tool:', error)
        return errorResponse('Failed to update tool', 500)
      }

      return jsonResponse(tool)
    }

    // DELETE /tools/:id - Delete a tool
    if (req.method === 'DELETE' && toolId && toolId !== 'tools') {
      if (!hasMinRole(auth.role, 'MANAGER')) {
        return errorResponse('Insufficient permissions', 403)
      }

      // Verify the tool belongs to an agent in this workspace
      const { data: existingTool } = await supabase
        .from('agent_tools')
        .select(`
          id,
          agent:agents!inner(workspace_id)
        `)
        .eq('id', toolId)
        .single()

      if (!existingTool || existingTool.agent?.workspace_id !== auth.workspaceId) {
        return errorResponse('Tool not found or access denied', 404)
      }

      const { error } = await supabase
        .from('agent_tools')
        .delete()
        .eq('id', toolId)

      if (error) {
        console.error('Error deleting tool:', error)
        return errorResponse('Failed to delete tool', 500)
      }

      return jsonResponse({ success: true })
    }

    return errorResponse('Method not allowed', 405)

  } catch (err) {
    console.error('Tools API error:', err)
    return errorResponse(err.message || 'Internal server error', 500)
  }
})
