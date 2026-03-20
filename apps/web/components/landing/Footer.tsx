'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Twitter, Linkedin, Github, Youtube, Mail } from 'lucide-react';
import { captureLead } from '../../lib/api';
import { toast } from 'sonner';

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Integrations', href: '/dashboard' },
    { label: 'Changelog', href: '/analytics' },
    { label: 'Roadmap', href: '/dashboard' },
  ],
  company: [
    { label: 'About', href: '/dashboard' },
    { label: 'Blog', href: '/analytics' },
    { label: 'Careers', href: 'mailto:careers@leadflow.ai' },
    { label: 'Press', href: 'mailto:press@leadflow.ai' },
    { label: 'Contact', href: 'mailto:hello@leadflow.ai' },
  ],
  resources: [
    { label: 'Documentation', href: '/dashboard' },
    { label: 'Help Center', href: 'mailto:support@leadflow.ai' },
    { label: 'Community', href: 'mailto:hello@leadflow.ai?subject=LeadFlow%20AI%20Community' },
    { label: 'API Reference', href: '/dashboard' },
    { label: 'Status', href: '/analytics' },
  ],
  legal: [
    { label: 'Privacy', href: 'mailto:legal@leadflow.ai?subject=Privacy%20Policy' },
    { label: 'Terms', href: 'mailto:legal@leadflow.ai?subject=Terms%20of%20Service' },
    { label: 'Security', href: 'mailto:security@leadflow.ai' },
    { label: 'Cookies', href: 'mailto:legal@leadflow.ai?subject=Cookie%20Policy' },
    { label: 'GDPR', href: 'mailto:legal@leadflow.ai?subject=GDPR%20Compliance' },
  ],
};

const socialLinks = [
  { icon: Twitter, label: 'Twitter', href: 'https://twitter.com' },
  { icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com' },
  { icon: Github, label: 'GitHub', href: 'https://github.com' },
  { icon: Youtube, label: 'YouTube', href: 'https://youtube.com' },
];

export function Footer() {
  const router = useRouter();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollToSection = (href: string) => {
    if (href.startsWith('#') && href.length > 1) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLinkClick = (href: string) => {
    if (href.startsWith('#')) {
      scrollToSection(href);
      return;
    }

    if (href.startsWith('mailto:')) {
      window.location.href = href;
      return;
    }

    if (href.startsWith('http')) {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }

    router.push(href);
  };

  const handleNewsletterSubmit = async () => {
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await captureLead({
        source: 'web',
        email: newsletterEmail.trim(),
        intentHint: 'Footer newsletter signup',
        metadata: {
          entryPoint: 'footer-newsletter',
          landingPage: 'kimi-agent-premium',
        },
      });
      toast.success('Subscribed to newsletter!');
      setNewsletterEmail('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to subscribe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="relative pt-24 pb-12 border-t border-white/5">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 section-padding">
        <div className="container-wide">
          {/* Main Footer */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12 mb-16">
            {/* Brand */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-2 mb-6 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:shadow-glow transition-shadow duration-300">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">
                  LeadFlow<span className="text-blue-400">AI</span>
                </span>
              </button>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                Autonomous lead-to-revenue platform that captures, nurtures, and converts leads 24/7.
              </p>

              {/* Newsletter */}
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleNewsletterSubmit();
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isSubmitting}
                />
                <button
                  onClick={() => void handleNewsletterSubmit()}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="Subscribe to newsletter"
                >
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Links */}
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                  {category}
                </h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <button
                        onClick={() => handleLinkClick(link.href)}
                        className="text-sm text-muted-foreground hover:text-white transition-colors text-left"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} LeadFlow AI. All rights reserved.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <button
                  key={social.label}
                  onClick={() => window.open(social.href, '_blank', 'noopener,noreferrer')}
                  className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
