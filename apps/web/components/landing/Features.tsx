 'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Mail, 
  Calendar, 
  BarChart3, 
  Target, 
  Workflow,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const features = [
  {
    id: 'capture',
    icon: Target,
    title: 'Smart Lead Capture',
    description: 'Automatically capture leads from every touchpoint—forms, chat, email, and social—without missing a single opportunity.',
    color: 'blue',
    stats: { label: 'Leads Captured', value: '12,847' },
  },
  {
    id: 'nurture',
    icon: Mail,
    title: 'AI-Powered Nurturing',
    description: 'Personalized email sequences that adapt to each lead\'s behavior, delivering the right message at the perfect time.',
    color: 'purple',
    stats: { label: 'Open Rate', value: '68%' },
  },
  {
    id: 'qualify',
    icon: Bot,
    title: 'Intelligent Qualification',
    description: 'Our AI scores and qualifies leads in real-time, ensuring your sales team focuses on the highest-value opportunities.',
    color: 'cyan',
    stats: { label: 'Qualification Accuracy', value: '94%' },
  },
  {
    id: 'schedule',
    icon: Calendar,
    title: 'Automated Scheduling',
    description: 'Let leads book meetings directly on your calendar. No back-and-forth emails, no scheduling conflicts.',
    color: 'green',
    stats: { label: 'Meetings Booked', value: '2,340' },
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Revenue Analytics',
    description: 'Get deep insights into your pipeline, conversion rates, and revenue attribution—all in real-time.',
    color: 'orange',
    stats: { label: 'Data Points', value: '50M+' },
  },
  {
    id: 'workflow',
    icon: Workflow,
    title: 'Custom Workflows',
    description: 'Build automation workflows that match your unique sales process with our visual drag-and-drop builder.',
    color: 'pink',
    stats: { label: 'Workflows Active', value: '1,200' },
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', glow: 'shadow-blue-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', glow: 'shadow-purple-500/20' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', glow: 'shadow-cyan-500/20' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', glow: 'shadow-green-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', glow: 'shadow-orange-500/20' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', glow: 'shadow-pink-500/20' },
};

export function Features() {
  const router = useRouter();
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const handleLearnMore = (_featureId: string) => {
    const routes: Record<string, string> = {
      capture: '#cta',
      nurture: '/dashboard',
      qualify: '/leads',
      schedule: '#cta',
      analytics: '/analytics',
      workflow: '/dashboard',
    };

    const target = routes[_featureId];
    if (!target) {
      return;
    }

    if (target.startsWith('#')) {
      const element = document.querySelector(target);
      element?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    router.push(target);
  };

  return (
    <section id="features" className="relative py-24 lg:py-32">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 section-padding">
        <div className="container-wide">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Powerful Features</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
            >
              Everything You Need to{' '}
              <span className="text-gradient">Convert Leads</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground"
            >
              A complete lead-to-revenue platform that automates every step of your sales process.
            </motion.p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const colors = colorMap[feature.color as keyof typeof colorMap]!;
              const Icon = feature.icon;
              const isActive = activeFeature === feature.id;
              const isHovered = hoveredFeature === feature.id;

              return (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  onClick={() => setActiveFeature(isActive ? null : feature.id)}
                  onMouseEnter={() => setHoveredFeature(feature.id)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className={`group relative p-6 lg:p-8 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isActive || isHovered
                      ? `bg-white/5 ${colors.border} shadow-lg ${colors.glow}`
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                    {feature.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{feature.stats.label}</p>
                      <p className={`text-lg font-bold ${colors.text}`}>{feature.stats.value}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLearnMore(feature.id);
                      }}
                      className={`inline-flex items-center gap-1 text-sm font-medium transition-all duration-300 ${
                        isActive || isHovered ? colors.text : 'text-muted-foreground'
                      } group/btn`}
                    >
                      Learn more
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                    </button>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-5 mt-5 border-t border-white/10">
                          <p className="text-sm text-muted-foreground">
                            This feature integrates seamlessly with your existing tools and provides 
                            real-time insights through our dashboard. Set up takes less than 5 minutes.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
