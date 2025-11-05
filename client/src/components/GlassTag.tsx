'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassTagProps {
  children: ReactNode;
  className?: string;
}

export default function GlassTag({ 
  children, 
  className = '' 
}: GlassTagProps) {
  return (
    <motion.div
      className={`glass-tag inline-block ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={{ scale: 1.05 }}
    >
      {children}
    </motion.div>
  );
}
