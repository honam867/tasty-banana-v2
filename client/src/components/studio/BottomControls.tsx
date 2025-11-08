'use client';

import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import AspectRatioSelector from './AspectRatioSelector';
import NumberOfImagesSelector from './NumberOfImagesSelector';
import { GENERATION_LIMITS } from '@/lib/constants';
import type { AspectRatio } from '@/types/generation';

interface BottomControlsProps {
  aspectRatio: AspectRatio;
  onAspectRatioChange: (value: AspectRatio) => void;
  numberOfImages: number;
  onNumberOfImagesChange: (value: number) => void;
  minOutputs?: number;
  maxOutputs?: number;
  selectorsDisabled?: boolean;
  generateDisabled: boolean;
  onGenerate: () => void;
  isGenerating?: boolean;
  generateLabel?: string;
  extraContent?: ReactNode;
}

export default function BottomControls({
  aspectRatio,
  onAspectRatioChange,
  numberOfImages,
  onNumberOfImagesChange,
  minOutputs = GENERATION_LIMITS.MIN_OUTPUTS,
  maxOutputs = GENERATION_LIMITS.MAX_OUTPUTS_UI,
  selectorsDisabled = false,
  generateDisabled,
  onGenerate,
  isGenerating = false,
  generateLabel = 'Generate',
  extraContent,
}: BottomControlsProps) {
  return (
    <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
      <div className="px-4 py-2 max-w-4xl">
        <div className="flex items-center gap-3 flex-wrap">
          <AspectRatioSelector
            value={aspectRatio}
            onChange={onAspectRatioChange}
            disabled={selectorsDisabled}
          />
          <NumberOfImagesSelector
            value={numberOfImages}
            onChange={onNumberOfImagesChange}
            min={minOutputs}
            max={maxOutputs}
            disabled={selectorsDisabled}
          />

          {extraContent}

          <button
            onClick={onGenerate}
            disabled={generateDisabled}
            className={`glass-button flex-1 px-8 py-3 font-semibold text-white min-w-[160px] border-2
              ${
                generateDisabled
                  ? 'opacity-50 cursor-not-allowed border-white/10 bg-white/5'
                  : 'border-[var(--banana-gold)]/50 bg-[var(--banana-gold)]/10 hover:bg-[var(--banana-gold)]/20 hover:border-[var(--banana-gold)]/80 text-[var(--banana-gold)] shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)]'
              }
            `}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </span>
            ) : (
              generateLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
