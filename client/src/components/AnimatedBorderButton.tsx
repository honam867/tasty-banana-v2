'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedBorderButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function AnimatedBorderButton({ 
  children, 
  onClick,
  className = '' 
}: AnimatedBorderButtonProps) {
  return (
    <motion.div
      className="relative inline-block"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 1.1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Outer container for border animation */}
      <div className="relative p-[3px] rounded-full">
        {/* Rotating gold gradient behind */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, rgba(255,215,0,0) 0%, rgba(255,215,0,0) 70%, var(--banana-gold) 85%, rgba(255,215,0,0) 100%)',
            animation: 'spin 3s linear infinite',
          }}
        />
        
        {/* Button with solid background */}
        <motion.button
          className={`relative rounded-full px-12 py-4 text-lg font-medium ${className} bg-[var(--banana-gold)]/15 backdrop-blur-xl text-[var(--banana-gold)] hover:bg-[var(--banana-gold)]/25 transition-all duration-300 border-[3px] border-white/30`}
          onClick={onClick}
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
          }}
        >
          {children}
        </motion.button>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </motion.div>
  );
}
