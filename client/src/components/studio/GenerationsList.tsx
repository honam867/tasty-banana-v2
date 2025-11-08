'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, Inbox } from 'lucide-react';
import { useGenerations } from '@/hooks/useGenerations';
import GenerationItem from './GenerationItem';
import type { GenerationItem as GenerationItemType } from '@/lib/api/generations';



interface GenerationsListProps {
  onGenerationsChange?: (generations: GenerationItemType[]) => void;
  onActiveGenerationChange?: (generationId: string | null) => void;
  scrollToGenerationId?: string | null;
}

/**
 * Generations List Component
 * Displays user's generation history with realtime updates and infinite scroll
 */
export default function GenerationsList({
  onGenerationsChange,
  onActiveGenerationChange,
  scrollToGenerationId,
}: GenerationsListProps = {}) {
  const {
    generations,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useGenerations({ limit: 20, includeFailed: true });

  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const generationRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Notify parent of generations changes
  useEffect(() => {
    if (onGenerationsChange) {
      onGenerationsChange(generations);
    }
  }, [generations, onGenerationsChange]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Load more when user scrolls to 80% from bottom
        if (entry.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      {
        root: container,
        threshold: 0.1,
      }
    );

    // Create sentinel element at bottom
    const sentinel = document.getElementById('infinite-scroll-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadMore]);

  // Set up intersection observer for viewport tracking (active generation)
  // Activates the generation item closest to viewport center
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || generations.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry closest to viewport center
        let closestEntry: IntersectionObserverEntry | undefined;
        let minDistance = Infinity;
        
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          
          const rect = entry.boundingClientRect;
          const containerRect = entry.rootBounds;
          if (!containerRect) return;
          
          // Calculate distance from viewport center
          const viewportCenter = containerRect.height / 2;
          const elementCenter = rect.top + rect.height / 2;
          const distance = Math.abs(elementCenter - viewportCenter);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestEntry = entry;
          }
        });
        
        // Activate the closest item to center
        if (closestEntry) {
          const generationId = closestEntry.target.getAttribute('data-generation-id');
          if (generationId && generationId !== activeGenerationId) {
            setActiveGenerationId(generationId);
            if (onActiveGenerationChange) {
              onActiveGenerationChange(generationId);
            }
          }
        }
      },
      {
        root: container,
        threshold: 0.5,  // Trigger when item is 50% visible
      }
    );

    // Observe all generation elements
    generationRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [generations.length, activeGenerationId, onActiveGenerationChange]);

  // Scroll to generation (from external trigger or internal click)
  const scrollToGeneration = (generationId: string) => {
    const element = generationRefs.current.get(generationId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      setActiveGenerationId(generationId);
    }
  };

  // Handle external scroll request
  useEffect(() => {
    if (scrollToGenerationId) {
      scrollToGeneration(scrollToGenerationId);
    }
  }, [scrollToGenerationId]);

  // Separate generations by status
  const activeGenerations = generations.filter(
    (g) => g.status === 'pending' || g.status === 'processing'
  );
  const completedGenerations = generations.filter(
    (g) => g.status === 'completed' || g.status === 'failed'
  );

  const isEmpty = !loading && generations.length === 0;

  return (
    <div
      ref={scrollContainerRef}
      className="flex flex-col h-full overflow-hidden bg-black/40 backdrop-blur-xl"
      style={{ contain: 'layout style paint' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Generations</h2>
            <p className="text-xs text-white/50 mt-0.5">
              {generations.length} generation{generations.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 text-white/70 group-hover:text-white transition-colors ${
                loading ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Error State */}
        {error && (
          <div className="p-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={refresh}
                className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full p-8 text-center"
          >
            <div className="p-4 rounded-full bg-white/5 border border-white/10 mb-4">
              <Inbox className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-base font-medium text-white/80 mb-2">
              No Generations Yet
            </h3>
            <p className="text-sm text-white/50 max-w-xs">
              Start creating! Your generated images will appear here in real-time.
            </p>
          </motion.div>
        )}

        {/* Active Generations (Queue) */}
        {activeGenerations.length > 0 && (
          <div className="border-b border-white/10">
            <div className="px-4 py-2 bg-white/[0.02]">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                Active ({activeGenerations.length})
              </h3>
            </div>
            {activeGenerations.map((generation) => (
              <div
                key={generation.generationId}
                data-generation-id={generation.generationId}
                ref={(el) => {
                  if (el) {
                    generationRefs.current.set(generation.generationId, el);
                  }
                }}
              >
                <GenerationItem
                  generation={generation}
                  isActive={activeGenerationId === generation.generationId}
                />
              </div>
            ))}
          </div>
        )}

        {/* Completed Generations */}
        {completedGenerations.length > 0 && (
          <div>
            {activeGenerations.length > 0 && (
              <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5">
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  History
                </h3>
              </div>
            )}
            {completedGenerations.map((generation) => (
              <div
                key={generation.generationId}
                data-generation-id={generation.generationId}
                ref={(el) => {
                  if (el) {
                    generationRefs.current.set(generation.generationId, el);
                  }
                }}
              >
                <GenerationItem
                  generation={generation}
                  isActive={activeGenerationId === generation.generationId}
                />
              </div>
            ))}
          </div>
        )}

        {/* Loading More Indicator */}
        {loading && generations.length > 0 && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
          </div>
        )}

        {/* Initial Loading State */}
        {loading && generations.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
              <p className="text-sm text-white/50">Loading generations...</p>
            </div>
          </div>
        )}

        {/* Infinite Scroll Sentinel */}
        {hasMore && !loading && generations.length > 0 && (
          <div id="infinite-scroll-sentinel" className="h-20" />
        )}

        {/* End of List Indicator */}
        {!hasMore && generations.length > 0 && (
          <div className="p-4 text-center">
            <p className="text-xs text-white/40">No more generations</p>
          </div>
        )}
      </div>
    </div>
  );
}
