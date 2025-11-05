"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";

interface HeroCarouselProps {
  images?: string[];
}

export default function HeroCarousel({ images }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Use provided images or fallback to default
  const heroImages = images || ["/images/hero-slide-1.jpg"];

  useEffect(() => {
    if (heroImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % heroImages.length);
      }, 4000);

      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {/* Hero Image with zoom effect */}
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{
              duration: 8,
              ease: "easeInOut",
              times: [0, 0.5, 1],
              repeat: Infinity,
              repeatType: "loop",
            }}
          >
            <Image
              src={heroImages[currentIndex]}
              alt="Hero background"
              fill
              className="object-cover"
              priority
            />
          </motion.div>

          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />

          {/* Film grain overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/60 pointer-events-none" />
    </div>
  );
}
