'use client';

import { motion } from 'framer-motion';
import { Clock, Construction } from 'lucide-react';
import GlassCard from '@/components/GlassCard';

export default function HistoryPage() {
  return (
    <>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-black/20 backdrop-blur-sm px-6 py-4 h-14 flex items-center">
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5 text-[var(--banana-gold)]" />
          <h1 className="text-lg font-semibold text-white">Generation History</h1>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="text-center py-12 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/30">
                <Construction className="w-8 h-8 text-orange-400" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">
                  History - Building
                </h2>
                <p className="text-white/60">
                  View and manage your generation history
                </p>
              </div>

              <div className="pt-4">
                <span className="inline-block px-6 py-3 bg-orange-500/10 border border-orange-500/30 rounded-full text-sm text-orange-400 font-medium">
                  Coming Soon
                </span>
              </div>

              <div className="max-w-md mx-auto pt-6">
                <p className="text-sm text-white/40">
                  Track all your AI generations, download results, and revisit previous creations. 
                  This feature is currently under development.
                </p>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </>
  );
}
