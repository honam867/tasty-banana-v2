'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMyGenerations } from '@/lib/api/generations';
import { useWebSocketEvent } from './useWebSocket';
import type { GenerationItem } from '@/lib/api/generations';
import type {
  GenerationProgressEvent,
  GenerationCompletedEvent,
  GenerationFailedEvent,
} from '@/types/websocket';

interface UseGenerationsOptions {
  limit?: number;
  includeFailed?: boolean;
  autoLoad?: boolean;
}

interface UseGenerationsReturn {
  generations: GenerationItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  addOptimisticGeneration: (generation: GenerationItem) => void;
}

/**
 * Hook for managing generations list with realtime WebSocket updates
 * Supports cursor-based pagination and infinite scroll
 */
export function useGenerations(
  options: UseGenerationsOptions = {}
): UseGenerationsReturn {
  const { limit = 20, includeFailed = false, autoLoad = true } = options;

  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Track if we're currently loading to prevent duplicate requests
  const isLoadingRef = useRef(false);

  /**
   * Fetch generations from API
   */
  const fetchGenerations = useCallback(
    async (currentCursor: string | null = null, append: boolean = false) => {
      if (isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setLoading(true);
        setError(null);

        const response = await getMyGenerations(
          currentCursor || undefined,
          limit,
          includeFailed
        );

        if (response.success && response.data) {
          const newGenerations = response.data.results;
          
          setGenerations((prev) =>
            append ? [...prev, ...newGenerations] : newGenerations
          );
          
          setCursor(response.data.cursor.next);
          setHasMore(response.data.cursor.hasMore);
        }
      } catch (err: any) {
        console.error('[useGenerations] Fetch error:', err);
        setError(err.response?.data?.message || 'Failed to load generations');
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [limit, includeFailed]
  );

  /**
   * Load more generations (for infinite scroll)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchGenerations(cursor, true);
  }, [cursor, hasMore, loading, fetchGenerations]);

  /**
   * Refresh generations list (reset to first page)
   */
  const refresh = useCallback(async () => {
    setCursor(null);
    setHasMore(true);
    await fetchGenerations(null, false);
  }, [fetchGenerations]);

  /**
   * Add optimistic generation (when user starts a new generation)
   */
  const addOptimisticGeneration = useCallback((generation: GenerationItem) => {
    setGenerations((prev) => [generation, ...prev]);
  }, []);

  /**
   * Update generation in list by ID
   */
  const updateGeneration = useCallback(
    (generationId: string, updates: Partial<GenerationItem>) => {
      setGenerations((prev) =>
        prev.map((gen) =>
          gen.generationId === generationId ? { ...gen, ...updates } : gen
        )
      );
    },
    []
  );

  /**
   * Move generation from queue to completed (reorder in list)
   */
  const moveToCompleted = useCallback((generationId: string, updates: Partial<GenerationItem>) => {
    setGenerations((prev) => {
      const generation = prev.find((g) => g.generationId === generationId);
      if (!generation) return prev;

      const updatedGen = { ...generation, ...updates };
      const others = prev.filter((g) => g.generationId !== generationId);
      
      // Insert at the top of completed items (after any pending/processing)
      const firstCompletedIndex = others.findIndex(
        (g) => g.status !== 'pending' && g.status !== 'processing'
      );
      
      if (firstCompletedIndex === -1) {
        return [...others, updatedGen];
      }
      
      return [
        ...others.slice(0, firstCompletedIndex),
        updatedGen,
        ...others.slice(firstCompletedIndex),
      ];
    });
  }, []);

  // WebSocket: Generation Progress
  useWebSocketEvent<GenerationProgressEvent>(
    'generation_progress',
    (data) => {
      updateGeneration(data.generationId, {
        status: 'processing',
        progress: data.progress,
      });
    }
  );

  // WebSocket: Generation Completed
  useWebSocketEvent<GenerationCompletedEvent>(
    'generation_completed',
    (data) => {
      const result = data.result;
      
      moveToCompleted(data.generationId, {
        status: 'completed',
        progress: 100,
        completedAt: result.createdAt,
        images: result.images,
        tokensUsed: result.tokens?.used,
        processingTimeMs: result.processing?.timeMs,
      });
    }
  );

  // WebSocket: Generation Failed
  useWebSocketEvent<GenerationFailedEvent>(
    'generation_failed',
    (data) => {
      updateGeneration(data.generationId, {
        status: 'failed',
        error: data.error,
      });
    }
  );

  // Initial load
  useEffect(() => {
    if (autoLoad) {
      fetchGenerations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  return {
    generations,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    addOptimisticGeneration,
  };
}
