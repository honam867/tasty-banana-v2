'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassIconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  href?: string;
}

export default function GlassIconButton({ 
  children, 
  onClick,
  className = '',
  href
}: GlassIconButtonProps) {
  const Component = href ? motion.a : motion.button;
  const props = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : { onClick };

  return (
    <Component
      className={`glass-icon inline-flex items-center justify-center ${className}`}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
