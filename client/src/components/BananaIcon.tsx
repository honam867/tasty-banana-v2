'use client';

import { motion } from 'framer-motion';

interface BananaIconProps {
  className?: string;
  glowing?: boolean;
}

export default function BananaIcon({ className = '', glowing = true }: BananaIconProps) {
  return (
    <motion.div
      className={`relative inline-block ${className}`}
      whileHover={{ scale: 1.1, rotate: 5 }}
      transition={{ duration: 0.3 }}
    >
      {glowing && (
        <motion.div
          className="absolute inset-0 blur-2xl bg-[var(--banana-gold)] opacity-60"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      <div className="relative text-6xl">🍌</div>
    </motion.div>
  );
}
