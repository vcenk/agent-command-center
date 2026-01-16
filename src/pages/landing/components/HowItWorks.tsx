import React, { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Upload, Settings, Rocket, BarChart } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload Your Knowledge',
    description: 'Import documents, website content, FAQs, and training materials. Our AI processes and indexes everything automatically.',
  },
  {
    number: '02',
    icon: Settings,
    title: 'Configure Your Agent',
    description: 'Define your agent\'s persona, tone, and behavior. Set up custom actions and integrations with your existing tools.',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Deploy Everywhere',
    description: 'Launch your AI agent across web chat, phone, SMS, and WhatsApp with just a few clicks. No coding required.',
  },
  {
    number: '04',
    icon: BarChart,
    title: 'Monitor & Optimize',
    description: 'Track conversations, measure performance, and continuously improve your agent based on real customer interactions.',
  },
];

export const HowItWorks: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  useEffect(() => {
    if (lineRef.current && isInView) {
      gsap.fromTo(
        lineRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 1.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top center',
            end: 'bottom center',
            scrub: 1,
          },
        }
      );
    }
  }, [isInView]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section id="how-it-works" className="py-24 bg-background" ref={sectionRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="mt-4 text-4xl font-bold text-foreground">
            From Setup to Scale in Minutes
          </h2>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Get your AI agent up and running faster than you ever thought possible.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="relative"
        >
          {/* Connection Line */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
            <div
              ref={lineRef}
              className="w-full h-full bg-gradient-to-b from-primary via-primary/50 to-transparent origin-top"
            />
          </div>

          <div className="space-y-12 lg:space-y-0">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className={`relative lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center ${
                  index % 2 === 1 ? 'lg:text-right' : ''
                }`}
              >
                {/* Content */}
                <div className={`${index % 2 === 1 ? 'lg:col-start-2' : ''} mb-8 lg:mb-16`}>
                  <div className={`flex items-start gap-4 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <step.icon className="w-7 h-7 text-primary" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-5xl font-bold text-primary/20">{step.number}</span>
                      </div>
                      <h3 className="text-2xl font-semibold text-foreground mb-3">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline Dot (Desktop) */}
                <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2, duration: 0.3 }}
                    className="w-4 h-4 rounded-full bg-primary ring-4 ring-background"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
