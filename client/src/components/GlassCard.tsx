'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function GlassCard({ 
  children, 
  className = '',
  delay = 0
}: GlassCardProps) {
  return (
    <motion.div
      className={`glass-card ${className}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.8,
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={{ 
        y: -5,
        transition: { duration: 0.3 }
      }}
    >
      {children}
    </motion.div>
  );
}
