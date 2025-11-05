"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function PromptResult() {
  const [displayText, setDisplayText] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  const prompts = [
    "a cinematic portrait of a lone astronaut floating in golden nebula",
    "ethereal forest with sunbeams breaking through morning mist",
    "futuristic city skyline at sunset, warm orange and gold tones",
  ];

  const fullPrompt = prompts[currentPromptIndex];

  useEffect(() => {
    let index = 0;
    setDisplayText("");
    setShowResult(false);

    const typingInterval = setInterval(() => {
      if (index < fullPrompt.length) {
        setDisplayText(fullPrompt.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => {
          setShowResult(true);
          // After showing result, move to next prompt
          setTimeout(() => {
            setCurrentPromptIndex((prev) => (prev + 1) % prompts.length);
          }, 3000);
        }, 500);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [currentPromptIndex, fullPrompt]);

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center py-32 px-6 max-w-7xl mx-auto">
      {/* Left side - Prompt typing */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: false }}
        transition={{ duration: 0.8 }}
        className="relative order-2 lg:order-1"
      >
        <div className="glass-card p-8 lg:p-12 min-h-[300px] flex flex-col justify-center">
          <div className="text-[var(--banana-gold)] text-sm uppercase tracking-wider mb-4 font-semibold">
            Your Prompt
          </div>
          <div className="text-2xl lg:text-3xl leading-relaxed text-white/90 font-light">
            {displayText}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-1 h-8 bg-[var(--banana-gold)] ml-1"
            />
          </div>
          <div className="mt-6 text-white/40 text-sm">
            Enhanced automatically by Banana AI Studio
          </div>
        </div>
      </motion.div>

      {/* Right side - Result with flash effect */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: false }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative order-1 lg:order-2"
      >
        <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            {showResult ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0"
              >
                {/* Flash effect */}
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 bg-(--banana-gold) z-10"
                />

                {/* Generated Result Image */}
                <Image
                  src="/images/hero-slide-1.jpg"
                  alt="Generated AI result"
                  fill
                  className="object-cover"
                  priority
                />

                {/* Glow effect */}
                <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(255,215,0,0.2)] pointer-events-none" />
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-2 border-(--banana-gold) border-t-transparent rounded-full"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
