'use client';

import { motion } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';
import TabNavigation from '@/components/studio/TabNavigation';
import GlassCard from '@/components/GlassCard';

export default function ImageReferencePage() {
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30">
                <ImageIcon className="w-8 h-8 text-purple-400" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white">
                  Image Reference
                </h1>
                <p className="text-white/60 text-lg">
                  Generate images using reference images
                </p>
              </div>

              <div className="pt-4">
                <span className="inline-block px-6 py-3 bg-purple-500/10 border border-purple-500/30 rounded-full text-sm text-purple-400 font-medium">
                  Interface Coming Soon
                </span>
              </div>

              <div className="max-w-md mx-auto pt-6">
                <p className="text-sm text-white/40">
                  Upload reference images and generate new variations with AI. 
                  Perfect for maintaining consistent style and composition.
                </p>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </>
  );
}
