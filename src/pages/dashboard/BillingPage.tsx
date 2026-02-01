import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { secureApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  Check,
  AlertTriangle,
  ExternalLink,
  Receipt,
  Zap,
  Users,
  Bot,
  MessageSquare,
  BookOpen,
  Crown,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BillingData {
  subscription: {
    id: string;
    plan_name: string;
    plan_slug: string;
    status: string;
    billing_interval: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    trial_ends_at: string | null;
  } | null;
  usage: {
    conversations: { count: number; limit: number; percentage: number };
    messages: number;
    tokens: number;
    period_start: string;
    period_end: string;
  };
  limits: {
    agents: number;
    conversations_monthly: number;
    knowledge_sources: number;
    team_members: number;
  };
  invoices: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    period_start: string;
    period_end: string;
    paid_at: string;
    invoice_url: string;
    pdf_url: string;
  }>;
  plans: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    price_monthly: number;
    price_yearly: number;
    features: string[];
    limits: Record<string, number>;
    is_featured: boolean;
  }>;
}

const BillingPage: React.FC = () => {
  const { toast } = useToast();
  const { isAuthenticated, workspace } = useAuth();
  const queryClient = useQueryClient();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { data: billing, isLoading } = useQuery({
    queryKey: ['billing', workspace?.id],
    queryFn: () => secureApi.get<BillingData>('/billing'),
    enabled: isAuthenticated && !!workspace?.id,
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ planSlug, interval }: { planSlug: string; interval: string }) =>
      secureApi.post<{ type: string; checkout_url?: string }>('/stripe-checkout', { plan_slug: planSlug, billing_interval: interval }),
    onSuccess: (data) => {
      if (data.type === 'checkout' && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data.type === 'contact_sales') {
        toast({ title: 'Contact Sales', description: 'Please reach out to our sales team for Enterprise plans.' });
      }
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to start checkout', variant: 'destructive' });
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => secureApi.post<{ portal_url?: string }>('/billing', { action: 'portal' }),
    onSuccess: (data) => {
      if (data.portal_url) {
        window.open(data.portal_url, '_blank');
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => secureApi.post<{ success: boolean }>('/billing', { action: 'cancel' }),
    onSuccess: () => {
      toast({ title: 'Subscription Canceled', description: 'Your subscription will end at the current period.' });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      setCancelDialogOpen(false);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => secureApi.post<{ success: boolean }>('/billing', { action: 'resume' }),
    onSuccess: () => {
      toast({ title: 'Subscription Resumed', description: 'Your subscription is now active.' });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const subscription = billing?.subscription;
  const usage = billing?.usage;
  const plans = billing?.plans || [];

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      trialing: { variant: 'secondary', label: 'Trial' },
      past_due: { variant: 'destructive', label: 'Past Due' },
      canceled: { variant: 'outline', label: 'Canceled' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing & Usage</h1>
        <p className="text-muted-foreground">Manage your subscription and monitor usage</p>
      </div>

      {/* Current Plan Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Subscription Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{subscription.plan_name}</span>
                  {getStatusBadge(subscription.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {subscription.billing_interval === 'yearly' ? 'Yearly' : 'Monthly'} billing
                </p>
                {subscription.cancel_at_period_end && (
                  <div className="flex items-center gap-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    Cancels {formatDate(subscription.current_period_end)}
                  </div>
                )}
                {subscription.trial_ends_at && subscription.status === 'trialing' && (
                  <p className="text-sm text-muted-foreground">
                    Trial ends {formatDate(subscription.trial_ends_at)}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No active subscription</p>
                <p className="text-sm text-muted-foreground">Choose a plan below</p>
              </div>
            )}
          </CardContent>
          {subscription && (
            <CardFooter className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Manage
              </Button>
              {subscription.cancel_at_period_end ? (
                <Button
                  size="sm"
                  onClick={() => resumeMutation.mutate()}
                  disabled={resumeMutation.isPending}
                >
                  Resume
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  Cancel
                </Button>
              )}
            </CardFooter>
          )}
        </Card>

        {/* Usage Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">{usage?.conversations.count.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">
                  / {usage?.conversations.limit === -1 ? '∞' : usage?.conversations.limit.toLocaleString()}
                </span>
              </div>
              <Progress value={usage?.conversations.percentage || 0} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Resets {usage?.period_end ? formatDate(usage.period_end) : 'monthly'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Limits Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Plan Limits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Bot className="h-3 w-3" /> Agents
                </span>
                <span>{billing?.limits.agents === -1 ? 'Unlimited' : billing?.limits.agents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Knowledge Sources
                </span>
                <span>{billing?.limits.knowledge_sources === -1 ? 'Unlimited' : billing?.limits.knowledge_sources}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Team Members
                </span>
                <span>{billing?.limits.team_members === -1 ? 'Unlimited' : billing?.limits.team_members}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Plans */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Available Plans</h2>
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <Button
              variant={billingInterval === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBillingInterval('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={billingInterval === 'yearly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBillingInterval('yearly')}
            >
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs">Save 20%</Badge>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const price = billingInterval === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const isCurrentPlan = subscription?.plan_slug === plan.slug;
            const isEnterprise = plan.slug === 'enterprise';

            return (
              <Card
                key={plan.id}
                className={`relative ${plan.is_featured ? 'border-primary shadow-lg' : ''}`}
              >
                {plan.is_featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {isEnterprise ? (
                      <span className="text-3xl font-bold">Custom</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">{formatPrice(price)}</span>
                        <span className="text-muted-foreground">
                          /{billingInterval === 'yearly' ? 'year' : 'month'}
                        </span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? 'outline' : plan.is_featured ? 'default' : 'outline'}
                    disabled={isCurrentPlan || checkoutMutation.isPending}
                    onClick={() => checkoutMutation.mutate({ planSlug: plan.slug, interval: billingInterval })}
                  >
                    {isCurrentPlan ? 'Current Plan' : isEnterprise ? 'Contact Sales' : 'Upgrade'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      {billing?.invoices && billing.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Billing History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {billing.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(invoice.amount)} • {invoice.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {invoice.invoice_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.invoice_url} target="_blank" rel="noopener noreferrer">
                          View <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                    {invoice.pdf_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                          PDF
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of the current billing period.
              You can resume anytime before then.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingPage;
