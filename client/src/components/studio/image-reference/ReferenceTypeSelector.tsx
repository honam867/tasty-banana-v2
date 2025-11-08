'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Smile, LayoutDashboard } from 'lucide-react';
import type { ReferenceType } from '@/types/generation';

interface ReferenceTypeOption {
  id: ReferenceType;
  label: string;
  description: string;
  icon: typeof User;
}

const OPTIONS: ReferenceTypeOption[] = [
  {
    id: 'subject',
    label: 'Subject',
    description: 'Keep the primary subject look while changing background or context.',
    icon: User,
  },
  {
    id: 'face',
    label: 'Face',
    description: 'Preserve facial identity for portraits or character consistency.',
    icon: Smile,
  },
  {
    id: 'full_image',
    label: 'Full Image',
    description: 'Use overall composition, lighting, and style from the reference.',
    icon: LayoutDashboard,
  },
];

interface ReferenceTypeSelectorProps {
  value: ReferenceType;
  onChange: (value: ReferenceType) => void;
  disabled?: boolean;
}

export default function ReferenceTypeSelector({
  value,
  onChange,
  disabled = false,
}: ReferenceTypeSelectorProps) {
  const activeOption = useMemo(
    () => OPTIONS.find((option) => option.id === value),
    [value]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/70">Reference Type</p>
          <p className="text-xs text-white/40">
            {activeOption?.description || 'Choose how the reference should influence results.'}
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.id)}
              className={`relative flex flex-col items-start gap-2 p-4 rounded-2xl border transition-all text-left ${
                isActive
                  ? 'border-[var(--banana-gold)]/70 bg-[var(--banana-gold)]/10 shadow-lg'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isActive && (
                <motion.span
                  layoutId="reference-type-indicator"
                  className="absolute inset-0 rounded-2xl border border-[var(--banana-gold)]/30 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                />
              )}
              <div className="flex items-center gap-2">
                <span
                  className={`p-2 rounded-full ${
                    isActive ? 'bg-[var(--banana-gold)]/20' : 'bg-black/30'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[var(--banana-gold)]' : 'text-white/70'
                    }`}
                  />
                </span>
                <span className="text-sm font-semibold text-white">{option.label}</span>
              </div>
              <p className="text-xs text-white/60 line-clamp-2 md:line-clamp-3" title={option.description}>{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
