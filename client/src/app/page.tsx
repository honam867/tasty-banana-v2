'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import HeroSection from '@/components/HeroSection';
import FilmstripScroll from '@/components/FilmstripScroll';
import PromptResult from '@/components/PromptResult';
import BananaIcon from '@/components/BananaIcon';
import GlassButton from '@/components/GlassButton';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="relative overflow-hidden bg-black">
      {/* Hero Section with Carousel */}
      <section className="relative h-screen">
        <HeroSection />
        
        {/* Hero Content Overlay */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-center max-w-5xl"
          >
            {/* Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              <span className="block text-white">Get confident</span>
              <span className="block bg-gradient-to-r from-[var(--banana-gold)] via-orange-400 to-yellow-500 bg-clip-text text-transparent">
                AI images
              </span>
            </h1>
            
            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="text-xl md:text-2xl text-white/70 mb-12 max-w-3xl mx-auto font-light"
            >
              We enhance the prompt for you.
            </motion.p>
            
            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.1 }}
            >
              <GlassButton 
                variant="primary"
                className="border border-white/30 hover:bg-(--banana-gold)/20 text-(--banana-gold) text-lg px-12 py-4"
              >
                Enter the Studio
              </GlassButton>
            </motion.div>
          </motion.div>
        </motion.div>
        
      </section>

      {/* Filmstrip Section */}
      <section className="relative">
        <FilmstripScroll />
      </section>

      {/* Prompt → Result Cinematic Section */}
      <section className="relative bg-black">
        <PromptResult />
      </section>

      {/* Studio Philosophy */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-black via-gray-900 to-black">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-sm uppercase tracking-[0.3em] text-[var(--banana-gold)] mb-8 font-semibold">
            How It Works
          </h2>
          <p className="text-3xl md:text-4xl lg:text-5xl leading-relaxed text-white/90 font-light mb-8">
            Optimized prompts
            <br className="hidden md:block" />
            <span className="text-[var(--banana-gold)]">per model.</span>
          </p>
          <p className="text-xl md:text-2xl text-white/50 leading-relaxed max-w-3xl mx-auto font-light">
            Every AI model has its own language. Banana AI Studio automatically adapts 
            and enhances your prompts to match each model's strengths—ensuring you get 
            the best possible results, every time.
          </p>
        </motion.div>
      </section>

      {/* Call to Action Footer */}
      <section className="relative py-24 px-6 bg-black border-t border-white/10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Glowing Banana Icon */}
          <div className="flex justify-center mb-8">
            <BananaIcon glowing />
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
            Ready for your closeup?
          </h2>
          
          <p className="text-xl md:text-2xl text-white/60 mb-12 font-light">
            Join creators who've elevated their AI art to cinematic heights.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <GlassButton 
              variant="primary"
              className="bg-[var(--banana-gold)]/10 border-2 border-[var(--banana-gold)]/50 hover:bg-[var(--banana-gold)]/20 hover:border-[var(--banana-gold)]/80 text-[var(--banana-gold)] text-lg px-12 py-4 shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transition-all duration-300"
            >
              Start Creating Free
            </GlassButton>
            <GlassButton 
              variant="secondary"
              className="border-2 border-white/30 hover:border-white/60 text-white/80 hover:text-white text-lg px-12 py-4 transition-all duration-300"
            >
              Watch the Reel
            </GlassButton>
          </div>
          
          {/* Footer Links */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-24 pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 text-white/40 text-sm"
          >
            <div>
              <span className="text-white/60">© 2024 Banana AI Studio</span>
            </div>
            <div className="flex gap-8">
              <a href="#" className="hover:text-[var(--banana-gold)] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[var(--banana-gold)] transition-colors">Terms</a>
              <a href="#" className="hover:text-[var(--banana-gold)] transition-colors">Contact</a>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
