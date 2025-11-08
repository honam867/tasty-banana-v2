'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, Inbox, ArrowUp } from 'lucide-react';
import { useGenerationsContext } from '@/contexts/GenerationsContext';
import GenerationItem from './GenerationItem';
import type { GenerationItem as GenerationItemType } from '@/lib/api/generations';

interface GenerationsListProps {
  onActiveGenerationChange?: (generationId: string | null) => void;
  scrollToGenerationId?: string | null;
}

/**
 * Generations List Component
 * Displays user's generation history with realtime updates and infinite scroll
 */
export default function GenerationsList({
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
  } = useGenerationsContext();

  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousFirstIdRef = useRef<string | null>(generations[0]?.generationId ?? null);
  const generationRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  // Set up intersection observer for scroll-based active state
  // Activates the generation that crosses the top detection line (20% from viewport top)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || generations.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find which items are currently intersecting with our detection line
        // The LAST one in the list is the one that most recently crossed the line
        const intersectingEntries = entries.filter(entry => entry.isIntersecting);
        
        if (intersectingEntries.length > 0) {
          // Get the last intersecting entry (the one at the top)
          const topEntry = intersectingEntries[intersectingEntries.length - 1];
          const generationId = topEntry.target.getAttribute('data-generation-id');
          
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
        // rootMargin creates the detection line
        // "-20% 0px -80% 0px" means:
        // - Top: move 20% down from top edge (detection line at 20%)
        // - Bottom: move 80% up from bottom edge
        // This creates a thin horizontal band at 20% from top
        rootMargin: '-20% 0px -80% 0px',
        threshold: 0,
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

  // Scroll to generation (from thumbnail click)
  const scrollToGeneration = (generationId: string) => {
    const element = generationRefs.current.get(generationId);
    if (element) {
      // Set active state
      setActiveGenerationId(generationId);
      if (onActiveGenerationChange) {
        onActiveGenerationChange(generationId);
      }
      
      // Scroll to align with detection line (20% from top)
      // Using 'start' brings it to the top, which crosses our 20% detection line
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  // Handle external scroll request
  useEffect(() => {
    if (scrollToGenerationId) {
      scrollToGeneration(scrollToGenerationId);
    }
  }, [scrollToGenerationId]);

  // Scroll to top when a new generation is added
  useEffect(() => {
    const firstId = generations[0]?.generationId ?? null;
    if (firstId && firstId !== previousFirstIdRef.current) {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    previousFirstIdRef.current = firstId;
  }, [generations]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 120);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Separate generations by status
  const activeGenerations = generations.filter(
    (g) => g.status === 'pending' || g.status === 'processing'
  );
  const completedGenerations = generations.filter(
    (g) => g.status === 'completed' || g.status === 'failed'
  );

  const isEmpty = !loading && generations.length === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black/40 backdrop-blur-xl" style={{ contain: 'layout style paint' }}>
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-hide">
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

        {showScrollTop && (
          <button
            type="button"
            onClick={() =>
              scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
            }
            className="fixed bottom-6 right-6 z-20 p-2.5 rounded-full bg-white/10 border border-white/20 text-white shadow-lg backdrop-blur hover:bg-white/20 transition-colors"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
