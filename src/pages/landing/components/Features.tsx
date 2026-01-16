import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Bot,
  MessageSquare,
  Phone,
  Brain,
  BookOpen,
  Zap,
  Shield,
  BarChart3,
  Globe
} from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Agents',
    description: 'Deploy intelligent agents powered by GPT-4, Claude, and more. Customize behavior with personas and fine-tuned responses.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: MessageSquare,
    title: 'Omnichannel Support',
    description: 'Reach customers everywhere. Web chat, SMS, WhatsApp, and phone calls - all from one unified dashboard.',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: BookOpen,
    title: 'Knowledge Integration',
    description: 'Upload documents, websites, and FAQs. Your AI learns from your content and delivers accurate answers.',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    icon: Brain,
    title: 'Smart Personas',
    description: 'Define unique personalities for each agent. Control tone, style, and behavior to match your brand.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Zap,
    title: 'Custom Actions',
    description: 'Enable agents to book appointments, process orders, and integrate with your existing systems via API.',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption. Role-based access control and audit logging included.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Track performance metrics, conversation quality, and customer satisfaction in real-time.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    icon: Globe,
    title: 'Multi-Language',
    description: 'Support customers globally with automatic language detection and translation in 50+ languages.',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
];

export const Features: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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
    <section id="features" className="py-24 bg-secondary/30">
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
            Features
          </span>
          <h2 className="mt-4 text-4xl font-bold text-foreground">
            Everything You Need to Scale Support
          </h2>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful tools to create, deploy, and manage AI agents that actually understand your customers.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group p-6 bg-background rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
