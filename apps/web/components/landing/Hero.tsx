'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles, TrendingUp, Users, Zap } from 'lucide-react';
import { captureLead } from '../../lib/api';
import type { DashboardResponse } from '../../lib/types';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';

export function Hero() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dashboard = null as unknown as DashboardResponse | null;
  const health = { status: 'preview' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await captureLead({
        source: 'web',
        email,
        intentHint: 'LeadFlow AI landing page trial signup',
        metadata: {
          entryPoint: 'hero-form',
          landingPage: 'kimi-agent-premium'
        }
      });

      toast.success('Lead captured. Redirecting to your new lead.');
      setEmail('');
      router.push(`/leads/${response.lead.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to capture your lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewStats = dashboard
    ? [
        { label: 'Leads Captured', value: dashboard.summary.totalLeads.toLocaleString(), change: `${dashboard.summary.qualifiedLeads} qualified` },
        { label: 'Conversion Rate', value: `${dashboard.summary.conversionRate.toFixed(1)}%`, change: `${dashboard.summary.bookedLeads} booked` },
        { label: 'Open Follow-ups', value: dashboard.summary.openFollowUps.toLocaleString(), change: `${dashboard.summary.wonLeads} won` },
      ]
    : [
        { label: 'Leads Captured', value: '12,847', change: '+23% this month' },
        { label: 'Conversion Rate', value: '34.2%', change: '+8% this month' },
        { label: 'Open Follow-ups', value: '89', change: 'Live queue' },
      ];

  const pipelineRows = dashboard
    ? Object.entries(dashboard.byStatus)
        .filter(([, value]) => value > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([stage, count], index) => ({
          stage,
          count,
          width: `${Math.max(20, 100 - index * 16)}%`,
          color: ['bg-blue-500', 'bg-purple-500', 'bg-cyan-500', 'bg-green-500'][index % 4]
        }))
    : [
        { stage: 'New Leads', count: 234, width: '100%', color: 'bg-blue-500' },
        { stage: 'Qualified', count: 189, width: '80%', color: 'bg-purple-500' },
        { stage: 'Opportunity', count: 124, width: '55%', color: 'bg-cyan-500' },
        { stage: 'Closed Won', count: 89, width: '40%', color: 'bg-green-500' },
      ];

  const activityRows: Array<{ action: string; source: string; time: string }> = dashboard?.recentLeads?.length
    ? dashboard.recentLeads.slice(0, 3).map((lead) => ({
        action: `${[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Lead'} captured`,
        source: lead.source,
        time: 'recently'
      }))
    : [
        { action: 'New lead captured', source: 'Website', time: '2m ago' },
        { action: 'Email sequence started', source: 'Auto-nurture', time: '5m ago' },
        { action: 'Meeting booked', source: 'Calendar', time: '12m ago' },
      ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          aria-hidden="true"
          className="absolute -top-40 left-[-8%] h-[38rem] w-[38rem] rounded-full blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(215, 177, 141, 0.42) 0%, rgba(215, 177, 141, 0.18) 30%, rgba(215, 177, 141, 0) 72%)'
          }}
          animate={{ x: [0, 48, -18, 0], y: [0, 28, -8, 0], scale: [1, 1.08, 1.02, 1] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute -bottom-44 right-[-10%] h-[44rem] w-[44rem] rounded-full blur-[140px]"
          style={{
            background:
              'radial-gradient(circle, rgba(140, 203, 187, 0.34) 0%, rgba(140, 203, 187, 0.14) 32%, rgba(140, 203, 187, 0) 74%)'
          }}
          animate={{ x: [0, -56, 20, 0], y: [0, -24, 12, 0], scale: [1, 1.1, 1.04, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute left-1/2 top-1/3 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-[130px]"
          style={{
            background:
              'radial-gradient(circle, rgba(167, 177, 239, 0.30) 0%, rgba(167, 177, 239, 0.12) 30%, rgba(167, 177, 239, 0) 72%)'
          }}
          animate={{ x: [0, 26, -18, 0], y: [0, 18, -12, 0], scale: [1, 1.06, 1.02, 1] }}
          transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.38),rgba(255,255,255,0)_58%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(246,231,217,0.64)_0%,rgba(246,238,230,0.42)_22%,rgba(239,247,242,0.28)_56%,rgba(237,242,251,0.36)_100%)] mix-blend-soft-light" />
      </div>

      {/* Content */}
      <div className="relative z-10 section-padding py-20 lg:py-32">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column - Text */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">AI-Powered Revenue Automation</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] mb-6"
              >
                Turn Leads Into{' '}
                <span className="text-gradient">Revenue</span>{' '}
                on Autopilot
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8"
              >
                LeadFlow AI autonomously captures, nurtures, and converts leads 24/7. 
                Scale your revenue without scaling your team.
              </motion.p>

              {/* Email Form */}
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto lg:mx-0 mb-8"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email"
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  className="btn-primary whitespace-nowrap"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Start Free Trial
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.form>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="inline-flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors group">
                      <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </span>
                      Watch Demo
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl bg-card border-white/10">
                    <DialogTitle className="sr-only">Demo preview</DialogTitle>
                    <DialogDescription className="sr-only">
                      Preview placeholder for the LeadFlow AI product demo.
                    </DialogDescription>
                    <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                          <Play className="w-8 h-8 text-blue-400 ml-1" />
                        </div>
                        <p className="text-muted-foreground">Demo video coming soon</p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-6 mt-10 pt-10 border-t border-white/5"
              >
                <span className="sr-only">{health?.status ?? 'loading'}</span>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-muted-foreground">
                    <span className="text-white font-semibold">2,500+</span> Companies
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-muted-foreground">
                    <span className="text-white font-semibold">340%</span> ROI Average
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-muted-foreground">
                    <span className="text-white font-semibold">24/7</span> Automation
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                {/* Main Dashboard Card */}
                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-card/50 backdrop-blur-sm">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-xs text-muted-foreground">LeadFlow AI Dashboard</span>
                    </div>
                  </div>
                  
                  {/* Dashboard Content */}
                  <div className="p-6 space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4">
                      {previewStats.map((stat, i) => {
                        const tone = i === 1 ? 'text-green-400' : i === 2 ? 'text-purple-400' : 'text-blue-400';

                        return (
                          <div key={stat.label} className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                            <p className="text-xl font-bold text-white">{stat.value}</p>
                            <p className={`text-xs mt-1 ${tone}`}>{stat.change}</p>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Pipeline */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-white">Lead Pipeline</span>
                        <span className="text-xs text-muted-foreground">Real-time</span>
                      </div>
                      <div className="space-y-3">
                        {pipelineRows.map((item, i) => (
                          <div key={item.stage} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-20">{item.stage}</span>
                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: item.width }}
                                transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                                className={`h-full ${item.color} rounded-full`}
                              />
                            </div>
                            <span className="text-xs text-white w-8 text-right">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Recent Activity */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-sm font-medium text-white mb-3 block">Recent Activity</span>
                      <div className="space-y-2">
                        {activityRows.map((activity) => (
                          <div key={`${activity.action}-${activity.time}`} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-400" />
                              <span className="text-white">{activity.action}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{activity.source}</span>
                              <span className="text-xs text-muted-foreground">{activity.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className="absolute -right-4 top-1/4 p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-white/10 shadow-xl"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Deal Closed</p>
                      <p className="text-sm font-semibold text-white">+$12,500</p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                  className="absolute -left-4 bottom-1/4 p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-white/10 shadow-xl"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">AI Score</p>
                      <p className="text-sm font-semibold text-white">94/100</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
