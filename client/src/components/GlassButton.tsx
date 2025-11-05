'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'secondary';
  className?: string;
}

export default function GlassButton({ 
  children, 
  onClick, 
  variant = 'default',
  className = '' 
}: GlassButtonProps) {
  const variants = {
    default: 'glass-button',
    primary: 'glass-button bg-white/15',
    secondary: 'glass-button bg-white/5',
  };

  return (
    <motion.button
      className={`${variants[variant]} ${className} `}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      {children}
    </motion.button>
  );
}
