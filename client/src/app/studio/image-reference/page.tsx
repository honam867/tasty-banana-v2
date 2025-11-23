'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';
import TabNavigation from '@/components/studio/TabNavigation';
import StudioSubTabs from '@/components/studio/image-reference/StudioSubTabs';
import SingleReferenceForm from '@/components/studio/image-reference/SingleReferenceForm';
import MultipleReferenceForm from '@/components/studio/image-reference/MultipleReferenceForm';
import GlassCard from '@/components/GlassCard';

const SUB_TABS = [
  { id: 'single', label: 'Single Reference' },
  { id: 'multiple', label: 'Multiple Reference' },
  { id: 'elements', label: 'Elements', disabled: true },
];

export default function ImageReferencePage() {
  const [subTab, setSubTab] = useState<string>('single');

  return (
    <>
      <TabNavigation />
      <StudioSubTabs tabs={SUB_TABS} activeId={subTab} onChange={setSubTab} />
      {subTab === 'single' ? (
        <SingleReferenceForm />
      ) : subTab === 'multiple' ? (
        <MultipleReferenceForm />
      ) : (
        <ElementsPlaceholder />
      )}
    </>
  );
}

function ElementsPlaceholder() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GlassCard className="text-center py-12 space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 mx-auto">
              <ImageIcon className="w-8 h-8 text-purple-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Elements Mode</h2>
              <p className="text-white/60">
                Compose reference collages and balance multiple inputs. Feature coming soon.
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
