import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Check, Sparkles } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for small businesses getting started with AI support.',
    monthlyPrice: 49,
    yearlyPrice: 39,
    features: [
      '1 AI Agent',
      '1,000 conversations/month',
      'Web chat channel',
      'Basic knowledge base',
      'Email support',
      '7-day conversation history',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    description: 'For growing teams that need more power and flexibility.',
    monthlyPrice: 149,
    yearlyPrice: 119,
    features: [
      '5 AI Agents',
      '10,000 conversations/month',
      'All channels (web, SMS, phone)',
      'Advanced knowledge base',
      'Custom personas',
      'Priority support',
      '90-day conversation history',
      'API access',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with advanced requirements.',
    monthlyPrice: null,
    yearlyPrice: null,
    features: [
      'Unlimited AI Agents',
      'Unlimited conversations',
      'All channels + custom integrations',
      'Dedicated knowledge base',
      'Custom LLM selection',
      'Dedicated success manager',
      'Unlimited history & analytics',
      'Custom SLA & support',
      'SSO & advanced security',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(true);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section id="pricing" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="mt-4 text-4xl font-bold text-foreground">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <span className={`text-sm ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Yearly
            </span>
            {isYearly && (
              <span className="ml-2 text-xs bg-success/10 text-success px-2 py-1 rounded-full">
                Save 20%
              </span>
            )}
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className={`relative p-8 rounded-2xl border ${
                plan.popular
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background border-border hover:border-primary/30'
              } transition-all duration-300`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                    <Sparkles className="w-4 h-4" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className={`text-xl font-semibold mb-2 ${plan.popular ? 'text-background' : 'text-foreground'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm ${plan.popular ? 'text-background/70' : 'text-muted-foreground'}`}>
                  {plan.description}
                </p>
              </div>

              <div className="text-center mb-6">
                {plan.monthlyPrice ? (
                  <>
                    <span className={`text-5xl font-bold ${plan.popular ? 'text-background' : 'text-foreground'}`}>
                      ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <span className={`${plan.popular ? 'text-background/70' : 'text-muted-foreground'}`}>
                      /month
                    </span>
                  </>
                ) : (
                  <span className={`text-3xl font-bold ${plan.popular ? 'text-background' : 'text-foreground'}`}>
                    Custom
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 flex-shrink-0 ${
                      plan.popular ? 'text-primary' : 'text-success'
                    }`} />
                    <span className={`text-sm ${plan.popular ? 'text-background/90' : 'text-muted-foreground'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : ''
                }`}
                variant={plan.popular ? 'default' : 'outline'}
                onClick={() => navigate('/login')}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
