import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Bot, MessageSquare, Zap, Shield } from 'lucide-react';

export const Hero: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const floatingElementsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // GSAP floating animation for background elements
    if (floatingElementsRef.current) {
      const elements = floatingElementsRef.current.querySelectorAll('.floating-element');
      elements.forEach((el, i) => {
        gsap.to(el, {
          y: -20 + Math.random() * 40,
          x: -10 + Math.random() * 20,
          rotation: -5 + Math.random() * 10,
          duration: 3 + Math.random() * 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.2,
        });
      });
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background pt-16">
      {/* Floating Background Elements */}
      <div ref={floatingElementsRef} className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="floating-element absolute top-20 left-[10%] w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="floating-element absolute top-40 right-[15%] w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="floating-element absolute bottom-20 left-[20%] w-64 h-64 bg-success/10 rounded-full blur-3xl" />

        {/* Floating Icons */}
        <motion.div
          className="floating-element absolute top-[20%] left-[15%]"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <div className="p-4 bg-white rounded-2xl shadow-lg border border-border/50">
            <Bot className="w-8 h-8 text-primary" />
          </div>
        </motion.div>

        <motion.div
          className="floating-element absolute top-[30%] right-[10%]"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <div className="p-4 bg-white rounded-2xl shadow-lg border border-border/50">
            <MessageSquare className="w-8 h-8 text-success" />
          </div>
        </motion.div>

        <motion.div
          className="floating-element absolute bottom-[30%] left-[8%]"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
        >
          <div className="p-4 bg-white rounded-2xl shadow-lg border border-border/50">
            <Zap className="w-8 h-8 text-warning" />
          </div>
        </motion.div>

        <motion.div
          className="floating-element absolute bottom-[25%] right-[15%]"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.6, duration: 0.5 }}
        >
          <div className="p-4 bg-white rounded-2xl shadow-lg border border-border/50">
            <Shield className="w-8 h-8 text-primary" />
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          ref={containerRef}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Badge */}
          <motion.div variants={itemVariants}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Now with GPT-4 & Claude Support
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-tight"
          >
            Build AI Agents That
            <br />
            <span className="text-gradient">Understand Your Business</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-xl text-muted-foreground max-w-3xl mx-auto"
          >
            Deploy intelligent AI agents across web chat, phone, and SMS.
            Connect your knowledge base, customize personalities, and scale
            customer support effortlessly.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-shadow"
              onClick={() => navigate('/login')}
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-6 text-lg"
            >
              <Play className="mr-2 w-5 h-5" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Social Proof */}
          <motion.div variants={itemVariants} className="pt-8">
            <p className="text-sm text-muted-foreground mb-4">Trusted by innovative teams</p>
            <div className="flex items-center justify-center gap-8 opacity-60">
              {['TechCorp', 'StartupX', 'Enterprise Co', 'Agency Pro', 'Scale Labs'].map((company) => (
                <span key={company} className="text-lg font-semibold text-muted-foreground">
                  {company}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
