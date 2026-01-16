// Edge Function: /analytics
// Aggregates conversation data for dashboard analytics

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  authenticateRequest,
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, serviceRoleKey)

    const url = new URL(req.url)
    const period = url.searchParams.get('period') || '30d' // 7d, 30d, 90d

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Fetch all analytics data in parallel
    const [
      sessionsResult,
      leadsResult,
      agentsResult,
      previousSessionsResult,
    ] = await Promise.all([
      // Current period sessions
      db
        .from('chat_sessions')
        .select('id, agent_id, channel, status, messages, started_at, ended_at, lead_captured')
        .eq('workspace_id', workspaceId)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false }),

      // Current period leads
      db
        .from('leads')
        .select('id, channel, source, created_at')
        .eq('workspace_id', workspaceId)
        .gte('created_at', startDate.toISOString()),

      // All agents
      db
        .from('agents')
        .select('id, name, status')
        .eq('workspace_id', workspaceId),

      // Previous period sessions (for comparison)
      db
        .from('chat_sessions')
        .select('id')
        .eq('workspace_id', workspaceId)
        .gte('started_at', new Date(startDate.getTime() - (now.getTime() - startDate.getTime())).toISOString())
        .lt('started_at', startDate.toISOString()),
    ])

    const sessions = sessionsResult.data || []
    const leads = leadsResult.data || []
    const agents = agentsResult.data || []
    const previousSessions = previousSessionsResult.data || []

    // Calculate metrics
    const totalConversations = sessions.length
    const previousConversations = previousSessions.length
    const conversationGrowth = previousConversations > 0
      ? Math.round(((totalConversations - previousConversations) / previousConversations) * 100)
      : 100

    const totalLeads = leads.length
    const leadsFromChat = leads.filter(l => l.source?.includes('chat')).length
    const conversionRate = totalConversations > 0
      ? Math.round((leadsFromChat / totalConversations) * 100)
      : 0

    // Average session duration (for ended sessions)
    const endedSessions = sessions.filter(s => s.ended_at)
    const avgDuration = endedSessions.length > 0
      ? Math.round(
          endedSessions.reduce((acc, s) => {
            const duration = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()
            return acc + duration
          }, 0) / endedSessions.length / 1000 / 60 // minutes
        )
      : 0

    // Messages per conversation
    const totalMessages = sessions.reduce((acc, s) => {
      const msgs = Array.isArray(s.messages) ? s.messages.length : 0
      return acc + msgs
    }, 0)
    const avgMessagesPerSession = totalConversations > 0
      ? Math.round(totalMessages / totalConversations * 10) / 10
      : 0

    // Channel breakdown
    const channelBreakdown = sessions.reduce((acc: Record<string, number>, s) => {
      acc[s.channel || 'web'] = (acc[s.channel || 'web'] || 0) + 1
      return acc
    }, {})

    // Agent performance
    const agentPerformance = agents.map(agent => {
      const agentSessions = sessions.filter(s => s.agent_id === agent.id)
      const agentLeads = agentSessions.filter(s => s.lead_captured).length
      return {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        conversations: agentSessions.length,
        leads_captured: agentLeads,
        conversion_rate: agentSessions.length > 0
          ? Math.round((agentLeads / agentSessions.length) * 100)
          : 0,
      }
    }).sort((a, b) => b.conversations - a.conversations)

    // Daily trend data
    const dailyData: Record<string, { conversations: number; leads: number }> = {}
    const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))

    for (let i = 0; i < daysInPeriod; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      dailyData[dateStr] = { conversations: 0, leads: 0 }
    }

    sessions.forEach(s => {
      const dateStr = new Date(s.started_at).toISOString().split('T')[0]
      if (dailyData[dateStr]) {
        dailyData[dateStr].conversations++
      }
    })

    leads.forEach(l => {
      const dateStr = new Date(l.created_at).toISOString().split('T')[0]
      if (dailyData[dateStr]) {
        dailyData[dateStr].leads++
      }
    })

    const trendData = Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data,
    }))

    // Recent conversations
    const recentConversations = sessions.slice(0, 10).map(s => ({
      id: s.id,
      agent_id: s.agent_id,
      agent_name: agents.find(a => a.id === s.agent_id)?.name || 'Unknown',
      channel: s.channel,
      status: s.status,
      message_count: Array.isArray(s.messages) ? s.messages.length : 0,
      lead_captured: s.lead_captured,
      started_at: s.started_at,
    }))

    return jsonResponse({
      overview: {
        total_conversations: totalConversations,
        conversation_growth: conversationGrowth,
        total_leads: totalLeads,
        conversion_rate: conversionRate,
        avg_duration_minutes: avgDuration,
        avg_messages_per_session: avgMessagesPerSession,
        active_agents: agents.filter(a => a.status === 'live').length,
        total_messages: totalMessages,
      },
      channel_breakdown: Object.entries(channelBreakdown).map(([channel, count]) => ({
        channel,
        count,
        percentage: Math.round((count as number / totalConversations) * 100),
      })),
      agent_performance: agentPerformance,
      trend_data: trendData,
      recent_conversations: recentConversations,
      period,
    })

  } catch (err) {
    console.error('Analytics error:', err)
    return errorResponse('Failed to fetch analytics', 500)
  }
})
