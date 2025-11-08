"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  Clock,
  Coins,
  Image as ImageIcon,
} from "lucide-react";
import ImageGallery from "./ImageGallery";
import type { GenerationItem as GenerationItemType } from "@/lib/api/generations";

interface GenerationItemProps {
  generation: GenerationItemType;
  isActive?: boolean;
}

/**
 * Individual Generation Item Component
 * Displays a single generation with images, status, and metadata
 */
function GenerationItem({ generation, isActive = false }: GenerationItemProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const {
    status,
    progress,
    metadata,
    images,
    tokensUsed,
    error,
    processingTimeMs,
  } = generation;

  const isPending = status === "pending";
  const isProcessing = status === "processing";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isActive_status = isPending || isProcessing;

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    processing: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    completed: "bg-green-500/10 text-green-400 border-green-500/30",
    failed: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const formatTime = (ms?: number) => {
    if (!ms) return "";
    const seconds = Math.round(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          border-b border-white/5 p-4 transition-all 
          ${
            isActive
              ? "bg-[var(--banana-gold)]/5 border-l-4 border-l-[var(--banana-gold)]"
              : ""
          }
          ${isActive_status ? "bg-white/[0.02]" : ""}
        `}
      >
        {/* Header */}
        <div className="mb-3">
          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`
                inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border
                ${statusColors[status]}
              `}
            >
              {isPending && <Clock className="w-3 h-3" />}
              {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
              {isFailed && <AlertCircle className="w-3 h-3" />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>

            {tokensUsed !== undefined && (
              <span className="inline-flex items-center gap-1 text-xs text-white/50">
                <Coins className="w-3 h-3" />
                {tokensUsed}
              </span>
            )}

            {processingTimeMs && (
              <span className="text-xs text-white/40">
                {formatTime(processingTimeMs)}
              </span>
            )}
          </div>

          {/* Prompt */}
          <p className="text-sm text-white/90 line-clamp-2 mb-1">
            {metadata.prompt}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span>{metadata.aspectRatio}</span>
            <span>•</span>
            <span>
              {metadata.numberOfImages} image
              {metadata.numberOfImages > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Progress Bar (for active generations) */}
        {isActive_status && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">
                {isProcessing ? "Generating..." : "Queued"}
              </span>
              <span className="text-white/70 font-medium">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${
                  isProcessing ? "bg-blue-500" : "bg-yellow-500"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {isFailed && error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Image Grid (for completed) - 2 columns vertical layout */}
        {isCompleted && images && images.length > 0 && (
          <div className="mt-3 scrollbar-hide">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {images.map((img, index) => (
                <button
                  key={img.imageId}
                  onClick={() => handleImageClick(index)}
                  className="relative rounded-lg max-h-[380px] overflow-hidden border border-white/10 hover:border-(--banana-gold)/50 transition-colors group"
                >
                  <img
                    src={img.imageUrl}
                    alt={`Generated image ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform will-change-transform"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Placeholder for pending/processing (show expected images) */}
        {isActive_status && (
          <div className="mt-3 max-h-[400px] overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {Array.from({ length: metadata.numberOfImages }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="relative aspect-square max-h-[180px] rounded-lg bg-white/5 border border-white/10 animate-pulse flex items-center justify-center"
                  >
                    <ImageIcon className="w-8 h-8 text-white/20" />
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Lightbox */}
      {images && images.length > 0 && (
        <ImageGallery
          images={images}
          prompt={metadata.prompt}
          isOpen={lightboxOpen}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

// Memoize with custom comparison
export default memo(GenerationItem, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.generation.generationId === nextProps.generation.generationId &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.generation.status === nextProps.generation.status &&
    prevProps.generation.progress === nextProps.generation.progress &&
    prevProps.generation.images?.length === nextProps.generation.images?.length
  );
});
