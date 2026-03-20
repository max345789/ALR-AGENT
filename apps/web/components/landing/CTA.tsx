 'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Loader2, Sparkles, Shield, Clock, Zap } from 'lucide-react';
import { captureLead } from '../../lib/api';
import { toast } from 'sonner';

export function CTA() {
  const [formData, setFormData] = useState({
    email: '',
    company: '',
    name: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsSubmitting(true);
    try {
      await captureLead({
        source: 'web',
        firstName: formData.name.trim(),
        company: formData.company.trim() || undefined,
        email: formData.email.trim(),
        intentHint: 'Landing page CTA signup',
        metadata: {
          entryPoint: 'cta-form',
          landingPage: 'kimi-agent-premium',
        },
      });

      setIsSuccess(true);
      toast.success('Welcome to LeadFlow AI!', {
        description: 'Your lead has been captured successfully.',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to capture your lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <section id="cta" className="relative py-24 lg:py-32">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 section-padding">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-8 lg:p-12 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-sm"
            >
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left - Content */}
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-300">Start Your Free Trial</span>
                  </div>

                  <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                    Ready to 10x Your{' '}
                    <span className="text-gradient">Revenue?</span>
                  </h2>

                  <p className="text-muted-foreground mb-8">
                    Join 2,500+ companies using LeadFlow AI to automate their lead-to-revenue process. 
                    Start your 14-day free trial today.
                  </p>

                  {/* Benefits */}
                  <div className="space-y-4">
                    {[
                      { icon: Zap, text: 'Setup in under 5 minutes' },
                      { icon: Shield, text: 'No credit card required' },
                      { icon: Clock, text: '14-day free trial' },
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <benefit.icon className="w-4 h-4 text-green-400" />
                        </div>
                        <span className="text-sm text-white/80">{benefit.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right - Form */}
                <div>
                  {isSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">You&apos;re all set!</h3>
                      <p className="text-muted-foreground">
                        Check your email for next steps to get started.
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                          Work Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john@company.com"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div>
                        <label htmlFor="company" className="block text-sm font-medium text-white mb-2">
                          Company Name
                        </label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          placeholder="Acme Inc."
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          disabled={isSubmitting}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold flex items-center justify-center gap-2 hover:from-blue-400 hover:to-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Creating your account...
                          </>
                        ) : (
                          <>
                            Start Free Trial
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>

                      <p className="text-xs text-center text-muted-foreground">
                        By signing up, you agree to our{' '}
                        <button
                          type="button"
                          onClick={() => window.location.href = 'mailto:legal@leadflow.ai?subject=LeadFlow%20AI%20Terms%20of%20Service'}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Terms of Service
                        </button>{' '}
                        and{' '}
                        <button
                          type="button"
                          onClick={() => window.location.href = 'mailto:legal@leadflow.ai?subject=LeadFlow%20AI%20Privacy%20Policy'}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Privacy Policy
                        </button>
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
