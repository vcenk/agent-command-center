import React, { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { gsap } from 'gsap';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    quote: "Agent Command has transformed our customer support. We've reduced response times by 80% while maintaining high satisfaction scores.",
    author: 'Sarah Chen',
    role: 'VP of Customer Success',
    company: 'TechStart Inc.',
    rating: 5,
    avatar: 'SC',
  },
  {
    quote: "The ability to customize AI personas made all the difference. Our agents now truly represent our brand voice across all channels.",
    author: 'Michael Torres',
    role: 'Director of Operations',
    company: 'Scale Solutions',
    rating: 5,
    avatar: 'MT',
  },
  {
    quote: "We went from zero to handling 10,000 conversations per month in just two weeks. The knowledge base integration is incredibly powerful.",
    author: 'Emily Watson',
    role: 'CEO',
    company: 'GrowthLabs',
    rating: 5,
    avatar: 'EW',
  },
  {
    quote: "Finally, an AI platform that actually understands our industry. The custom actions feature lets us automate complex workflows.",
    author: 'David Kim',
    role: 'CTO',
    company: 'FinServe Pro',
    rating: 5,
    avatar: 'DK',
  },
  {
    quote: "The analytics dashboard gives us insights we never had before. We can now optimize our support strategy based on real data.",
    author: 'Lisa Anderson',
    role: 'Head of Support',
    company: 'Enterprise Co',
    rating: 5,
    avatar: 'LA',
  },
  {
    quote: "Seamless integration with our existing tools. The API is well-documented and their support team is incredibly responsive.",
    author: 'James Wilson',
    role: 'Lead Developer',
    company: 'DevShop Agency',
    rating: 5,
    avatar: 'JW',
  },
];

export const Testimonials: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  useEffect(() => {
    if (carouselRef.current && isInView) {
      // GSAP infinite scroll animation
      const cards = carouselRef.current.querySelectorAll('.testimonial-card');
      const totalWidth = Array.from(cards).reduce((acc, card) => acc + (card as HTMLElement).offsetWidth + 24, 0);

      gsap.to(carouselRef.current, {
        x: -totalWidth / 2,
        duration: 40,
        ease: 'none',
        repeat: -1,
      });
    }
  }, [isInView]);

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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <section id="testimonials" className="py-24 bg-background overflow-hidden" ref={sectionRef}>
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
            Testimonials
          </span>
          <h2 className="mt-4 text-4xl font-bold text-foreground">
            Loved by Teams Everywhere
          </h2>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            See what our customers have to say about transforming their support with AI.
          </p>
        </motion.div>
      </div>

      {/* Testimonials Carousel */}
      <div className="relative">
        {/* Gradient Overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <div ref={carouselRef} className="flex gap-6 py-4" style={{ width: 'fit-content' }}>
            {/* Duplicate testimonials for infinite scroll */}
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <motion.div
                key={`${testimonial.author}-${index}`}
                variants={itemVariants}
                className="testimonial-card flex-shrink-0 w-[400px] p-6 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-colors"
              >
                {/* Quote Icon */}
                <Quote className="w-8 h-8 text-primary/20 mb-4" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-foreground mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {testimonial.avatar}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { value: '10,000+', label: 'Active Agents' },
            { value: '50M+', label: 'Conversations Handled' },
            { value: '98%', label: 'Customer Satisfaction' },
            { value: '24/7', label: 'Availability' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-4xl font-bold text-foreground">{stat.value}</p>
              <p className="text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
