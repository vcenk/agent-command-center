// Edge Function: /stripe-checkout
// Creates Stripe checkout sessions for subscription upgrades

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

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // Authenticate request
    const authResult = await authenticateRequest(req)
    if (authResult instanceof Response) return authResult

    const { user, workspaceId } = authResult as AuthResult

    if (!workspaceId) {
      return errorResponse('No workspace found', 403)
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return errorResponse('Stripe not configured', 500)
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()
    const { plan_slug, billing_interval = 'monthly' } = body

    if (!plan_slug) {
      return errorResponse('plan_slug is required', 400)
    }

    // Get pricing plan
    const { data: plan, error: planError } = await db
      .from('pricing_plans')
      .select('*')
      .eq('slug', plan_slug)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return errorResponse('Plan not found', 404)
    }

    // Enterprise plan requires sales contact
    if (plan.slug === 'enterprise') {
      return jsonResponse({
        type: 'contact_sales',
        message: 'Please contact sales for Enterprise plans',
      })
    }

    // Get or create Stripe customer
    let { data: subscription } = await db
      .from('workspace_subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .single()

    let stripeCustomerId = subscription?.stripe_customer_id

    if (!stripeCustomerId) {
      // Get workspace details
      const { data: workspace } = await db
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .single()

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
        name: workspace?.name || undefined,
      })

      stripeCustomerId = customer.id

      // Store customer ID
      await db
        .from('workspace_subscriptions')
        .upsert({
          workspace_id: workspaceId,
          plan_id: plan.id,
          stripe_customer_id: stripeCustomerId,
          status: 'trialing',
        })
    }

    // Determine price ID
    const priceId = billing_interval === 'yearly'
      ? plan.stripe_price_id_yearly
      : plan.stripe_price_id

    if (!priceId) {
      return errorResponse('Stripe price not configured for this plan', 500)
    }

    // Create checkout session
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          plan_id: plan.id,
        },
        trial_period_days: subscription ? undefined : 14, // 14-day trial for new subscriptions
      },
      metadata: {
        workspace_id: workspaceId,
        plan_slug: plan.slug,
      },
    })

    return jsonResponse({
      type: 'checkout',
      checkout_url: session.url,
      session_id: session.id,
    })

  } catch (err) {
    console.error('Checkout error:', err)
    return errorResponse('Failed to create checkout session', 500)
  }
})
