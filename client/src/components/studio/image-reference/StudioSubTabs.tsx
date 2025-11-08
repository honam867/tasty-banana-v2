'use client';

import { motion } from 'framer-motion';

interface SubTab {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface StudioSubTabsProps {
  tabs: SubTab[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function StudioSubTabs({
  tabs,
  activeId,
  onChange,
}: StudioSubTabsProps) {
  return (
    <div className="flex items-center gap-2 border-b border-white/10 px-4 h-14 bg-black/30 backdrop-blur-md">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all ${
              isActive
                ? 'text-black bg-white shadow-lg'
                : tab.disabled
                ? 'text-white/30 border border-white/5 cursor-not-allowed'
                : 'text-white/70 hover:text-white border border-transparent hover:border-white/20'
            }`}
          >
            {tab.label}
            {isActive && (
              <motion.span
                layoutId="studio-subtab-indicator"
                className="absolute inset-0 rounded-full border border-black/5"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            {tab.disabled && (
              <span className="ml-2 text-[11px] uppercase tracking-wider text-white/40">
                Soon
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
