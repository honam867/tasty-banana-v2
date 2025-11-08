'use client';

import { X } from 'lucide-react';
import GenerationsList from './GenerationsList';

interface MobileGenerationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileGenerationsModal({
  isOpen,
  onClose,
}: MobileGenerationsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 top-16 flex flex-col rounded-t-3xl border border-white/10 bg-gray-900/95 backdrop-blur-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-sm font-semibold text-white">Your Generations</p>
            <p className="text-xs text-white/60">Realtime updates & history</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Close generations"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <GenerationsList />
        </div>
      </div>
    </div>
  );
}
