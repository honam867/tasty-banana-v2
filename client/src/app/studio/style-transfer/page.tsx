'use client';

import { motion } from 'framer-motion';
import { Wand2 } from 'lucide-react';
import TabNavigation from '@/components/studio/TabNavigation';
import GlassCard from '@/components/GlassCard';

export default function StyleTransferPage() {
  return (
    <>
      {/* Tab Navigation */}
      <TabNavigation />

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="text-center py-12 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30">
                <Wand2 className="w-8 h-8 text-blue-400" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white">
                  Style Transfer
                </h1>
                <p className="text-white/60 text-lg">
                  Apply artistic styles to your images
                </p>
              </div>

              <div className="pt-4">
                <span className="inline-block px-6 py-3 bg-blue-500/10 border border-blue-500/30 rounded-full text-sm text-blue-400 font-medium">
                  Interface Coming Soon
                </span>
              </div>

              <div className="max-w-md mx-auto pt-6">
                <p className="text-sm text-white/40">
                  Transfer artistic styles from one image to another. 
                  Create unique visual effects with AI-powered style transfer.
                </p>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </>
  );
}
