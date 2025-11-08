'use client';

import { useEffect, useRef, memo } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { GenerationItem } from '@/lib/api/generations';

interface GenerationThumbnailGalleryProps {
  generations: GenerationItem[];
  activeGenerationId: string | null;
  onThumbnailClick: (generationId: string) => void;
}

/**
 * Vertical Thumbnail Gallery Component
 * Displays a vertical scrollable strip of generation thumbnails (first image of each)
 * Shows on the right side (20% width) of the right panel
 */
function GenerationThumbnailGallery({
  generations,
  activeGenerationId,
  onThumbnailClick,
}: GenerationThumbnailGalleryProps) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active thumbnail only if it's out of view
  useEffect(() => {
    if (activeGenerationId && activeThumbRef.current && galleryRef.current) {
      const thumbElement = activeThumbRef.current;
      const galleryElement = galleryRef.current;
      
      const thumbRect = thumbElement.getBoundingClientRect();
      const galleryRect = galleryElement.getBoundingClientRect();
      
      // Check if thumbnail is out of view
      const isAboveView = thumbRect.top < galleryRect.top;
      const isBelowView = thumbRect.bottom > galleryRect.bottom;
      
      // Only scroll if out of view (don't center, just bring into view)
      if (isAboveView || isBelowView) {
        thumbElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',  // Scroll minimum amount to show item
        });
      }
    }
  }, [activeGenerationId]);

  // Show all loaded generations (including pending/processing/failed)
  const generationsToShow = generations;

  if (generationsToShow.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-black/60 px-2 py-4">
        <p className="text-xs text-white/40 text-center">No generations yet</p>
      </div>
    );
  }

  return (
    <div
      ref={galleryRef}
      className="h-full overflow-y-auto overflow-x-hidden bg-black/60 scrollbar-hide"
    >
      <div className="flex flex-col gap-3 p-3 w-full">
        {generationsToShow.map((generation) => {
          const isActive = generation.generationId === activeGenerationId;
          const firstImage = generation.images?.[0];
          const isFailed = generation.status === 'failed';
          const isPending = generation.status === 'pending' || generation.status === 'processing';

          return (
            <button
              key={generation.generationId}
              ref={isActive ? activeThumbRef : null}
              onClick={() => onThumbnailClick(generation.generationId)}
              className={`
                w-full aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200
                hover:scale-[1.02] active:scale-95
                ${
                  isActive
                    ? 'border-[var(--banana-gold)] shadow-lg shadow-[var(--banana-gold)]/20'
                    : 'border-white/10 hover:border-white/30'
                }
              `}
              title={generation.metadata.prompt}
            >
              {firstImage ? (
                <img
                  src={firstImage.imageUrl}
                  alt={generation.metadata.prompt}
                  className="w-full h-full object-cover will-change-transform"
                  loading="lazy"
                  decoding="async"
                  width={100}
                  height={100}
                />
              ) : isFailed ? (
                <div className="w-full h-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
              ) : isPending ? (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(GenerationThumbnailGallery);
