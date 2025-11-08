'use client';

import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';
import GlassCard from '@/components/GlassCard';

export default function RightPanel() {
  return (
    <aside className="hidden lg:flex lg:w-[60%] flex-col bg-black/40 backdrop-blur-xl p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1"
      >
        <GlassCard className="min-h-full flex flex-col items-center justify-center space-y-4 text-center">
          <div className="p-4 rounded-full bg-[var(--banana-gold)]/10 border border-[var(--banana-gold)]/30">
            <Construction className="w-8 h-8 text-[var(--banana-gold)]" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">
              Currently Building
            </h3>
            <p className="text-sm text-white/60 max-w-xs">
              This panel will display generation previews, history details, and quick actions.
            </p>
          </div>

          <div className="pt-4">
            <span className="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-white/40">
              Coming Soon
            </span>
          </div>
        </GlassCard>
      </motion.div>
    </aside>
  );
}
