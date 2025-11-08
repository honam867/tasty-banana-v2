"use client";

import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import AspectRatioSelector from "./AspectRatioSelector";
import NumberOfImagesSelector from "./NumberOfImagesSelector";
import { GENERATION_LIMITS } from "@/lib/constants";
import type { AspectRatio } from "@/types/generation";

const BUTTON_STYLE = {
  disabled: "opacity-50 cursor-not-allowed border-white/10 bg-white/5",
  highlight:
    "border-transparent bg-gradient-to-r from-[var(--banana-gold)] via-amber-400 to-orange-400 text-black shadow-[0_8px_28px_rgba(255,215,0,0.35)] hover:shadow-[0_10px_32px_rgba(255,215,0,0.45)]",
  default:
    "border-[var(--banana-gold)]/50 bg-[var(--banana-gold)]/10 hover:bg-[var(--banana-gold)]/20 hover:border-[var(--banana-gold)]/80 text-[var(--banana-gold)] shadow-[0_0_12px_rgba(255,215,0,0.25)] hover:shadow-[0_0_18px_rgba(255,215,0,0.35)]",
} as const;

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
  highlightOnReady?: boolean;
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
  generateLabel = "Generate",
  extraContent,
  highlightOnReady = false,
}: BottomControlsProps) {
  return (
    <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
      <div className="px-4 py-4 sm:px-6 sm:py-5 max-w-4xl flex flex-wrap items-center gap-2 md:gap-3">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="scale-95 sm:scale-100 origin-left">
            <AspectRatioSelector
              value={aspectRatio}
              onChange={onAspectRatioChange}
              disabled={selectorsDisabled}
            />
          </div>
          <div className="scale-95 sm:scale-100 origin-left">
            <NumberOfImagesSelector
              value={numberOfImages}
              onChange={onNumberOfImagesChange}
              min={minOutputs}
              max={maxOutputs}
              disabled={selectorsDisabled}
              compact
            />
          </div>
        </div>

        {extraContent}

        <button
          onClick={onGenerate}
          disabled={generateDisabled}
          className={`glass-button flex-1 w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white min-w-[140px] border-2 ${
            generateDisabled
              ? BUTTON_STYLE.disabled
              : highlightOnReady
              ? BUTTON_STYLE.highlight
              : BUTTON_STYLE.default
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </span>
          ) : (
            generateLabel
          )}
        </button>
      </div>
    </div>
  );
}
