// Edge Function: /billing
// Get subscription info, usage, invoices, and manage billing

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'
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

    const { workspaceId, role } = authResult as AuthResult

    if (!workspaceId) {
      return errorResponse('No workspace found', 403)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, serviceRoleKey)

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    switch (req.method) {
      case 'GET': {
        // Get billing overview
        return await getBillingOverview(db, workspaceId)
      }

      case 'POST': {
        const body = await req.json()

        switch (body.action) {
          case 'portal': {
            // Create Stripe billing portal session
            return await createPortalSession(db, workspaceId)
          }

          case 'cancel': {
            // Cancel subscription
            if (role !== 'OWNER') {
              return errorResponse('Only owners can cancel subscriptions', 403)
            }
            return await cancelSubscription(db, workspaceId)
          }

          case 'resume': {
            // Resume canceled subscription
            return await resumeSubscription(db, workspaceId)
          }

          default:
            return errorResponse('Invalid action', 400)
        }
      }

      default:
        return errorResponse('Method not allowed', 405)
    }
  } catch (err) {
    console.error('Billing error:', err)
    return errorResponse('Billing operation failed', 500)
  }
})

// Get complete billing overview
async function getBillingOverview(
  db: ReturnType<typeof createClient>,
  workspaceId: string
) {
  // Get subscription
  const { data: subscription } = await db
    .from('workspace_subscriptions')
    .select(`
      *,
      plan:pricing_plans(*)
    `)
    .eq('workspace_id', workspaceId)
    .single()

  // Get current usage
  const { data: usage } = await db
    .from('workspace_usage')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('period_end', new Date().toISOString())
    .order('period_start', { ascending: false })
    .limit(1)
    .single()

  // Get recent invoices
  const { data: invoices } = await db
    .from('billing_invoices')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get all plans for comparison
  const { data: plans } = await db
    .from('pricing_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  // Calculate usage percentage
  const plan = subscription?.plan
  const conversationLimit = plan?.limits?.conversations_monthly || 1000
  const conversationCount = usage?.conversations_count || 0
  const usagePercentage = conversationLimit === -1
    ? 0
    : Math.round((conversationCount / conversationLimit) * 100)

  return jsonResponse({
    subscription: subscription ? {
      id: subscription.id,
      plan_name: plan?.name,
      plan_slug: plan?.slug,
      status: subscription.status,
      billing_interval: subscription.billing_interval,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_ends_at: subscription.trial_ends_at,
    } : null,
    usage: {
      conversations: {
        count: conversationCount,
        limit: conversationLimit,
        percentage: usagePercentage,
      },
      messages: usage?.messages_count || 0,
      tokens: usage?.ai_tokens_used || 0,
      period_start: usage?.period_start,
      period_end: usage?.period_end,
    },
    limits: plan?.limits || {
      agents: 1,
      conversations_monthly: 1000,
      knowledge_sources: 5,
      team_members: 2,
    },
    invoices: invoices?.map(inv => ({
      id: inv.id,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      period_start: inv.period_start,
      period_end: inv.period_end,
      paid_at: inv.paid_at,
      invoice_url: inv.hosted_invoice_url,
      pdf_url: inv.invoice_pdf_url,
    })) || [],
    plans: plans?.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price_monthly: p.price_monthly,
      price_yearly: p.price_yearly,
      features: p.features,
      limits: p.limits,
      is_featured: p.is_featured,
    })) || [],
  })
}

// Create Stripe billing portal session
async function createPortalSession(
  db: ReturnType<typeof createClient>,
  workspaceId: string
) {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) {
    return errorResponse('Stripe not configured', 500)
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

  const { data: subscription } = await db
    .from('workspace_subscriptions')
    .select('stripe_customer_id')
    .eq('workspace_id', workspaceId)
    .single()

  if (!subscription?.stripe_customer_id) {
    return errorResponse('No billing account found', 404)
  }

  const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${appUrl}/dashboard/billing`,
  })

  return jsonResponse({ portal_url: session.url })
}

// Cancel subscription
async function cancelSubscription(
  db: ReturnType<typeof createClient>,
  workspaceId: string
) {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) {
    return errorResponse('Stripe not configured', 500)
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

  const { data: subscription } = await db
    .from('workspace_subscriptions')
    .select('stripe_subscription_id')
    .eq('workspace_id', workspaceId)
    .single()

  if (!subscription?.stripe_subscription_id) {
    return errorResponse('No active subscription', 404)
  }

  // Cancel at period end (user keeps access until period ends)
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true,
  })

  await db
    .from('workspace_subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('workspace_id', workspaceId)

  return jsonResponse({ success: true, message: 'Subscription will cancel at period end' })
}

// Resume canceled subscription
async function resumeSubscription(
  db: ReturnType<typeof createClient>,
  workspaceId: string
) {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) {
    return errorResponse('Stripe not configured', 500)
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

  const { data: subscription } = await db
    .from('workspace_subscriptions')
    .select('stripe_subscription_id')
    .eq('workspace_id', workspaceId)
    .single()

  if (!subscription?.stripe_subscription_id) {
    return errorResponse('No subscription found', 404)
  }

  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: false,
  })

  await db
    .from('workspace_subscriptions')
    .update({ cancel_at_period_end: false })
    .eq('workspace_id', workspaceId)

  return jsonResponse({ success: true, message: 'Subscription resumed' })
}
