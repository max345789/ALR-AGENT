 'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    quote: "LeadFlow AI transformed our sales process. We went from manually tracking leads in spreadsheets to a fully automated system that converts 3x more prospects. The ROI was visible within the first month.",
    author: "Sarah Chen",
    role: "VP of Sales",
    company: "TechVenture Inc.",
    avatar: "SC",
    rating: 5,
    metric: { label: "Revenue Increase", value: "340%" },
  },
  {
    id: 2,
    quote: "The AI qualification is incredibly accurate. It saves our team hours every day by prioritizing the right leads. We've seen our conversion rate jump from 12% to 34% since implementing LeadFlow.",
    author: "Michael Rodriguez",
    role: "Chief Revenue Officer",
    company: "GrowthScale",
    avatar: "MR",
    rating: 5,
    metric: { label: "Conversion Rate", value: "34%" },
  },
  {
    id: 3,
    quote: "As a startup, we needed to maximize every lead. LeadFlow AI became our 24/7 sales assistant, nurturing prospects while we focused on building our product. It's like having an extra team member.",
    author: "Emily Watson",
    role: "CEO & Co-Founder",
    company: "StartupXYZ",
    avatar: "EW",
    rating: 5,
    metric: { label: "Time Saved", value: "25hrs/week" },
  },
  {
    id: 4,
    quote: "The analytics dashboard gives us insights we never had before. We can see exactly which channels are performing and optimize our spend in real-time. It's been a game-changer for our marketing team.",
    author: "David Park",
    role: "Head of Marketing",
    company: "DataDriven Co",
    avatar: "DP",
    rating: 5,
    metric: { label: "Lead Quality", value: "+89%" },
  },
  {
    id: 5,
    quote: "We evaluated several lead management solutions, but LeadFlow AI stood out for its ease of use and powerful automation. Setup took less than a day, and we were seeing results within a week.",
    author: "Jennifer Liu",
    role: "Sales Operations Manager",
    company: "Enterprise Solutions",
    avatar: "JL",
    rating: 5,
    metric: { label: "Setup Time", value: "< 1 day" },
  },
];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      let newIndex = prevIndex + newDirection;
      if (newIndex < 0) newIndex = testimonials.length - 1;
      if (newIndex >= testimonials.length) newIndex = 0;
      return newIndex;
    });
  };

  const currentTestimonial = testimonials[currentIndex] ?? testimonials[0]!;

  return (
    <section id="testimonials" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 section-padding">
        <div className="container-wide">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
            >
              Loved by <span className="text-gradient">Revenue Teams</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-muted-foreground"
            >
              See how companies are transforming their lead-to-revenue process.
            </motion.p>
          </div>

          {/* Testimonial Carousel */}
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Quote Icon */}
              <div className="absolute -top-6 left-0 lg:-left-6 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Quote className="w-6 h-6 text-blue-400" />
              </div>

              {/* Main Content */}
              <div className="relative h-[400px] lg:h-[320px] overflow-hidden">
                <AnimatePresence initial={false} custom={direction}>
                  <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                    }}
                    className="absolute inset-0"
                  >
                    <div className="p-8 lg:p-12 rounded-3xl bg-white/[0.02] border border-white/5 h-full">
                      {/* Rating */}
                      <div className="flex gap-1 mb-6">
                        {[...Array(currentTestimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>

                      {/* Quote */}
                      <blockquote className="text-lg lg:text-xl text-white/90 leading-relaxed mb-8">
                        "{currentTestimonial.quote}"
                      </blockquote>

                      {/* Author */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {currentTestimonial.avatar}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{currentTestimonial.author}</p>
                            <p className="text-sm text-muted-foreground">
                              {currentTestimonial.role}, {currentTestimonial.company}
                            </p>
                          </div>
                        </div>

                        {/* Metric */}
                        <div className="hidden sm:block text-right">
                          <p className="text-2xl font-bold text-gradient">{currentTestimonial.metric.value}</p>
                          <p className="text-sm text-muted-foreground">{currentTestimonial.metric.label}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                {/* Dots */}
                <div className="flex gap-2">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setDirection(index > currentIndex ? 1 : -1);
                        setCurrentIndex(index);
                      }}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === currentIndex
                          ? 'w-8 bg-blue-500'
                          : 'bg-white/20 hover:bg-white/40'
                      }`}
                      aria-label={`Go to testimonial ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Arrows */}
                <div className="flex gap-2">
                  <button
                    onClick={() => paginate(-1)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Previous testimonial"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => paginate(1)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Next testimonial"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Company Logos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-16 pt-16 border-t border-white/5"
          >
            <p className="text-center text-sm text-muted-foreground mb-8">
              Trusted by teams at leading companies
            </p>
            <div className="flex flex-wrap justify-center gap-8 lg:gap-16">
              {['Google', 'Microsoft', 'Salesforce', 'HubSpot', 'Stripe'].map((company) => (
                <div
                  key={company}
                  className="text-xl font-bold text-white/20 hover:text-white/40 transition-colors cursor-default"
                >
                  {company}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
