 'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MousePointerClick, 
  Brain, 
  MessageSquare, 
  Handshake,
  Check,
  ArrowRight
} from 'lucide-react';

const steps = [
  {
    id: 1,
    icon: MousePointerClick,
    title: 'Capture',
    subtitle: 'Every Touchpoint',
    description: 'Leads are automatically captured from your website, ads, social media, and any other channel—no code required.',
    color: 'blue',
    features: ['Form tracking', 'Chatbot integration', 'Social listening', 'API webhooks'],
  },
  {
    id: 2,
    icon: Brain,
    title: 'Qualify',
    subtitle: 'With AI Precision',
    description: 'Our AI analyzes each lead\'s behavior, firmographics, and engagement to score and prioritize opportunities.',
    color: 'purple',
    features: ['Behavioral scoring', 'Firmographic analysis', 'Intent detection', 'Priority ranking'],
  },
  {
    id: 3,
    icon: MessageSquare,
    title: 'Nurture',
    subtitle: 'Automatically',
    description: 'Personalized email sequences, SMS, and chat messages that adapt to each lead\'s journey and preferences.',
    color: 'cyan',
    features: ['Dynamic sequences', 'Multi-channel', 'A/B testing', 'Smart timing'],
  },
  {
    id: 4,
    icon: Handshake,
    title: 'Convert',
    subtitle: 'Into Revenue',
    description: 'Book meetings, send proposals, and close deals—all automated with human oversight when needed.',
    color: 'green',
    features: ['Calendar booking', 'Proposal automation', 'E-signature', 'Revenue tracking'],
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  blue: { 
    bg: 'bg-blue-500/10', 
    text: 'text-blue-400', 
    border: 'border-blue-500/20',
    gradient: 'from-blue-500 to-blue-600'
  },
  purple: { 
    bg: 'bg-purple-500/10', 
    text: 'text-purple-400', 
    border: 'border-purple-500/20',
    gradient: 'from-purple-500 to-purple-600'
  },
  cyan: { 
    bg: 'bg-cyan-500/10', 
    text: 'text-cyan-400', 
    border: 'border-cyan-500/20',
    gradient: 'from-cyan-500 to-cyan-600'
  },
  green: { 
    bg: 'bg-green-500/10', 
    text: 'text-green-400', 
    border: 'border-green-500/20',
    gradient: 'from-green-500 to-green-600'
  },
};

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(1);

  const handleStartTrial = () => {
    const element = document.querySelector('#cta');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="how-it-works" className="relative py-24 lg:py-32">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 section-padding">
        <div className="container-wide">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
            >
              How It <span className="text-gradient">Works</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-muted-foreground"
            >
              Four simple steps to transform your lead generation and revenue operations.
            </motion.p>
          </div>

          {/* Steps */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left - Step Navigation */}
            <div className="space-y-4">
              {steps.map((step, index) => {
                const colors = colorMap[step.color as keyof typeof colorMap]!;
                const Icon = step.icon;
                const isActive = activeStep === step.id;

                return (
                  <motion.button
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    onClick={() => setActiveStep(step.id)}
                    className={`w-full text-left p-5 lg:p-6 rounded-2xl border transition-all duration-300 ${
                      isActive
                        ? `bg-white/5 ${colors.border}`
                        : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Step Number */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${isActive ? colors.bg : 'bg-white/5'} flex items-center justify-center transition-colors`}>
                        <span className={`text-sm font-bold ${isActive ? colors.text : 'text-muted-foreground'}`}>
                          {step.id}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <Icon className={`w-5 h-5 ${isActive ? colors.text : 'text-muted-foreground'}`} />
                          <h3 className={`text-lg font-semibold ${isActive ? 'text-white' : 'text-muted-foreground'}`}>
                            {step.title}
                          </h3>
                        </div>
                        <p className={`text-sm ${isActive ? 'text-white/70' : 'text-muted-foreground/50'}`}>
                          {step.subtitle}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ArrowRight className={`w-5 h-5 transition-all duration-300 ${
                        isActive ? `${colors.text} translate-x-0 opacity-100` : 'text-muted-foreground -translate-x-2 opacity-0'
                      }`} />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Right - Step Details */}
            <div className="lg:sticky lg:top-32">
              {steps.map((step) => {
                const colors = colorMap[step.color as keyof typeof colorMap]!;
                const isActive = activeStep === step.id;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: isActive ? 1 : 0,
                      y: isActive ? 0 : 20,
                      display: isActive ? 'block' : 'none'
                    }}
                    transition={{ duration: 0.4 }}
                    className="p-8 lg:p-10 rounded-3xl bg-white/[0.02] border border-white/5"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center`}>
                        <step.icon className={`w-7 h-7 ${colors.text}`} />
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Step {step.id}</span>
                        <h3 className="text-2xl font-bold text-white">{step.title}</h3>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground leading-relaxed mb-8">
                      {step.description}
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                      {step.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full ${colors.bg} flex items-center justify-center`}>
                            <Check className={`w-3 h-3 ${colors.text}`} />
                          </div>
                          <span className="text-sm text-white/80">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={handleStartTrial}
                      className={`w-full py-3 px-6 rounded-xl bg-gradient-to-r ${colors.gradient} text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
                    >
                      Start Free Trial
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
