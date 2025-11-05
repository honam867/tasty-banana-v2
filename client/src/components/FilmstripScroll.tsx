'use client';

import { motion } from 'framer-motion';

interface FilmstripScrollProps {
  images?: string[];
}

export default function FilmstripScroll({ images = [] }: FilmstripScrollProps) {
  const placeholders = [
    'Portrait 1', 'Landscape 1', 'Abstract 1', 'Portrait 2',
    'Landscape 2', 'Abstract 2', 'Portrait 3', 'Landscape 3',
  ];
  
  const displayItems = images.length > 0 ? images : placeholders;
  const duplicatedItems = [...displayItems, ...displayItems, ...displayItems];

  return (
    <div className="relative w-full overflow-hidden py-16 bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Light leak overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--banana-gold-glow)] blur-[150px] opacity-20" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[150px] opacity-20" />
      </div>
      
      <motion.div
        className="flex gap-6"
        animate={{
          x: [0, -1920],
        }}
        transition={{
          x: {
            duration: 40,
            repeat: Infinity,
            ease: "linear",
          },
        }}
      >
        {duplicatedItems.map((item, index) => (
          <motion.div
            key={index}
            className="relative flex-shrink-0 w-80 h-52 group cursor-pointer"
            whileHover={{ scale: 1.05, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            {/* Film frame */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden border border-white/10">
              <div className="absolute inset-0 flex items-center justify-center text-white/20 text-lg font-medium">
                {item}
              </div>
              
              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--banana-gold)]/0 via-[var(--banana-gold)]/0 to-[var(--banana-gold)]/0 group-hover:from-[var(--banana-gold)]/10 group-hover:via-[var(--banana-gold)]/5 transition-all duration-500" />
            </div>
            
            {/* Film sprocket holes */}
            <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-around py-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-white/10 rounded-sm" />
              ))}
            </div>
            <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-around py-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-white/10 rounded-sm" />
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Edge fade */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent pointer-events-none" />
    </div>
  );
}
