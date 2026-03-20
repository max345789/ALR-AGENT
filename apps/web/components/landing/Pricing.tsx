 'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Building2 } from 'lucide-react';
import { Switch } from './ui/switch';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small teams getting started with lead automation.',
    icon: Zap,
    monthlyPrice: 49,
    yearlyPrice: 39,
    features: [
      'Up to 1,000 leads/month',
      'Basic lead capture forms',
      'Email sequences (3 max)',
      'Standard analytics',
      'Email support',
      '1 team member',
    ],
    cta: 'Start Free Trial',
    popular: false,
    color: 'blue',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing teams that need advanced automation and insights.',
    icon: Sparkles,
    monthlyPrice: 149,
    yearlyPrice: 119,
    features: [
      'Up to 10,000 leads/month',
      'Advanced lead capture',
      'Unlimited email sequences',
      'AI lead scoring',
      'Priority support',
      '5 team members',
      'Calendar integration',
      'Custom workflows',
    ],
    cta: 'Start Free Trial',
    popular: true,
    color: 'purple',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with complex requirements.',
    icon: Building2,
    monthlyPrice: 499,
    yearlyPrice: 399,
    features: [
      'Unlimited leads',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'SSO & advanced security',
      'Unlimited team members',
      'Custom AI training',
      'On-premise option',
    ],
    cta: 'Contact Sales',
    popular: false,
    color: 'cyan',
  },
];

const colorMap: Record<string, { bg: string; border: string; button: string; glow: string }> = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    button: 'from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500',
    glow: 'shadow-blue-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    button: 'from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500',
    glow: 'shadow-purple-500/20',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    button: 'from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500',
    glow: 'shadow-cyan-500/20',
  },
};

export function Pricing() {
  const [isYearly, setIsYearly] = useState(true);

  const handlePlanSelect = (planId: string, _planName: string) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@leadflow.ai?subject=LeadFlow%20AI%20Enterprise%20Inquiry';
    } else {
      const element = document.querySelector('#cta');
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="pricing" className="relative py-24 lg:py-32">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 section-padding">
        <div className="container-wide">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6"
            >
              <span className="text-sm font-medium text-green-300">Simple Pricing</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
            >
              Choose Your <span className="text-gradient">Plan</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-8"
            >
              Start free for 14 days. No credit card required.
            </motion.p>

            {/* Billing Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex items-center justify-center gap-4"
            >
              <span className={`text-sm ${!isYearly ? 'text-white' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
              />
              <span className={`text-sm ${isYearly ? 'text-white' : 'text-muted-foreground'}`}>
                Yearly
              </span>
              <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                Save 20%
              </span>
            </motion.div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, index) => {
              const colors = colorMap[plan.color as keyof typeof colorMap]!;
              const Icon = plan.icon;
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative p-6 lg:p-8 rounded-3xl border transition-all duration-300 ${
                    plan.popular
                      ? `bg-white/5 ${colors.border} shadow-lg ${colors.glow} scale-105 z-10`
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className={`px-4 py-1 rounded-full bg-gradient-to-r ${colors.button} text-white text-sm font-medium`}>
                        Most Popular
                      </div>
                    </div>
                  )}

                  {/* Icon & Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 text-${plan.color}-400`} style={{ color: `var(--${plan.color}-400)` }} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-6">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">${price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {isYearly && (
                      <p className="text-sm text-green-400 mt-1">
                        Save ${(plan.monthlyPrice - plan.yearlyPrice) * 12}/year
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Check className={`w-3 h-3 text-${plan.color}-400`} style={{ color: `var(--${plan.color}-400)` }} />
                        </div>
                        <span className="text-sm text-white/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => handlePlanSelect(plan.id, plan.name)}
                    className={`w-full py-3 px-6 rounded-xl bg-gradient-to-r ${colors.button} text-white font-semibold transition-all duration-300 hover:shadow-lg ${colors.glow}`}
                  >
                    {plan.cta}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* FAQ Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center mt-12"
          >
            <p className="text-muted-foreground">
              Have questions?{' '}
              <button
                onClick={() => window.location.assign('mailto:support@leadflow.ai?subject=LeadFlow%20AI%20FAQ')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                View our FAQ
              </button>{' '}
              or{' '}
              <button
                onClick={() => window.location.assign('mailto:support@leadflow.ai?subject=LeadFlow%20AI%20Support')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                chat with us
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
