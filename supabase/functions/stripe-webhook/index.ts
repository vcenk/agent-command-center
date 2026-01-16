// Edge Function: /stripe-webhook
// Handles Stripe webhook events for subscription lifecycle

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!stripeKey || !webhookSecret) {
      console.error('Stripe configuration missing')
      return new Response('Webhook configuration error', { status: 500 })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, serviceRoleKey)

    // Verify webhook signature
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response('No signature', { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Invalid signature', { status: 400 })
    }

    console.log(`Processing webhook: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(db, stripe, session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(db, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(db, subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(db, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoiceFailed(db, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('Webhook handler error', { status: 500 })
  }
})

// Handle successful checkout
async function handleCheckoutComplete(
  db: ReturnType<typeof createClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const workspaceId = session.metadata?.workspace_id
  const subscriptionId = session.subscription as string

  if (!workspaceId || !subscriptionId) {
    console.error('Missing workspace_id or subscription in checkout session')
    return
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  await handleSubscriptionUpdate(db, subscription)

  console.log(`Checkout complete for workspace ${workspaceId}`)
}

// Handle subscription updates
async function handleSubscriptionUpdate(
  db: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  const workspaceId = subscription.metadata?.workspace_id
  const customerId = subscription.customer as string

  if (!workspaceId) {
    // Try to find workspace by customer ID
    const { data: existing } = await db
      .from('workspace_subscriptions')
      .select('workspace_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!existing) {
      console.error('Cannot find workspace for subscription')
      return
    }
  }

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    paused: 'paused',
  }

  const status = statusMap[subscription.status] || 'active'

  // Get plan from price ID
  const priceId = subscription.items.data[0]?.price.id
  const { data: plan } = await db
    .from('pricing_plans')
    .select('id')
    .or(`stripe_price_id.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
    .single()

  // Update subscription in database
  const { error } = await db
    .from('workspace_subscriptions')
    .upsert({
      workspace_id: workspaceId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan_id: plan?.id,
      status,
      billing_interval: subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    }, {
      onConflict: 'workspace_id',
    })

  if (error) {
    console.error('Failed to update subscription:', error)
  }

  console.log(`Subscription ${subscription.id} updated: ${status}`)
}

// Handle subscription cancellation
async function handleSubscriptionCanceled(
  db: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string

  const { error } = await db
    .from('workspace_subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: true,
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Failed to cancel subscription:', error)
  }

  console.log(`Subscription canceled for customer ${customerId}`)
}

// Handle paid invoice
async function handleInvoicePaid(
  db: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string

  // Get workspace
  const { data: subscription } = await db
    .from('workspace_subscriptions')
    .select('workspace_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!subscription) {
    console.error('No workspace found for customer')
    return
  }

  // Record invoice
  await db.from('billing_invoices').upsert({
    workspace_id: subscription.workspace_id,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent as string,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'paid',
    description: invoice.description,
    invoice_pdf_url: invoice.invoice_pdf,
    hosted_invoice_url: invoice.hosted_invoice_url,
    period_start: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    period_end: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
    paid_at: new Date().toISOString(),
  }, {
    onConflict: 'stripe_invoice_id',
  })

  // Reset usage for new period
  const periodStart = new Date(invoice.period_start! * 1000).toISOString()
  const periodEnd = new Date(invoice.period_end! * 1000).toISOString()

  await db.from('workspace_usage').upsert({
    workspace_id: subscription.workspace_id,
    period_start: periodStart,
    period_end: periodEnd,
    conversations_count: 0,
    messages_count: 0,
    ai_tokens_used: 0,
  }, {
    onConflict: 'workspace_id,period_start',
  })

  console.log(`Invoice paid: ${invoice.id}`)
}

// Handle failed invoice
async function handleInvoiceFailed(
  db: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string

  // Update subscription status
  await db
    .from('workspace_subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_customer_id', customerId)

  console.log(`Invoice payment failed: ${invoice.id}`)
}
