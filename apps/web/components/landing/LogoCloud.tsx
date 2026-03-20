 'use client';

import { motion } from 'framer-motion';

const logos = [
  { name: 'Stripe', icon: 'S' },
  { name: 'Notion', icon: 'N' },
  { name: 'Figma', icon: 'F' },
  { name: 'Slack', icon: 'Sl' },
  { name: 'Vercel', icon: 'V' },
  { name: 'Linear', icon: 'L' },
  { name: 'Raycast', icon: 'R' },
  { name: 'Arc', icon: 'A' },
];

export function LogoCloud() {
  return (
    <section className="relative py-16 lg:py-20 border-y border-white/5">
      <div className="section-padding">
        <div className="container-wide">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center text-sm text-muted-foreground mb-10"
          >
            Trusted by leading companies worldwide
          </motion.p>
          
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-8 lg:gap-12 items-center">
            {logos.map((logo, index) => (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex items-center justify-center"
              >
                <div className="group flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity duration-300">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white group-hover:bg-white/20 transition-colors">
                    {logo.icon}
                  </div>
                  <span className="hidden lg:block text-sm font-medium text-white">{logo.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
