'use client';

import { motion } from 'framer-motion';

interface GlassInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  type?: string;
}

export default function GlassInput({ 
  placeholder = 'Enter text...',
  value,
  onChange,
  className = '',
  type = 'text'
}: GlassInputProps) {
  return (
    <motion.input
      type={type}
      className={`glass-input w-full ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }}
    />
  );
}
