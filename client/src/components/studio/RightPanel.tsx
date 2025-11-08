'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import GenerationsList from './GenerationsList';
import GenerationThumbnailGallery from './GenerationThumbnailGallery';
import type { GenerationItem } from '@/lib/api/generations';

export default function RightPanel() {
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);
  const [scrollToGenerationId, setScrollToGenerationId] = useState<string | null>(null);

  const handleThumbnailClick = (generationId: string) => {
    setScrollToGenerationId(generationId);
    // Reset after triggering scroll
    setTimeout(() => setScrollToGenerationId(null), 100);
  };

  return (
    <aside className="hidden lg:flex lg:w-[60%] flex-col overflow-hidden">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-row overflow-hidden"
      >
        {/* Main Content Area - 85% */}
        <div className="flex-[85] overflow-hidden">
          <GenerationsList
            onGenerationsChange={setGenerations}
            onActiveGenerationChange={setActiveGenerationId}
            scrollToGenerationId={scrollToGenerationId}
          />
        </div>

        {/* Vertical Gallery Strip - 15% (Right Side) */}
        <div className="flex-[15] border-l border-white/10 min-w-0">
          <GenerationThumbnailGallery
            generations={generations}
            activeGenerationId={activeGenerationId}
            onThumbnailClick={handleThumbnailClick}
          />
        </div>
      </motion.div>
    </aside>
  );
}
