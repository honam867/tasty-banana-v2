'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useGenerations } from '@/hooks/useGenerations';
import type { GenerationItem } from '@/lib/api/generations';

interface GenerationsContextValue {
  generations: GenerationItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  addOptimisticGeneration: (generation: GenerationItem) => void;
}

const GenerationsContext = createContext<GenerationsContextValue | null>(null);

export function GenerationsProvider({ children }: { children: ReactNode }) {
  const generationsState = useGenerations({
    limit: 10,
    includeFailed: true,
    autoLoad: true,
  });

  return (
    <GenerationsContext.Provider value={generationsState}>
      {children}
    </GenerationsContext.Provider>
  );
}

export function useGenerationsContext() {
  const context = useContext(GenerationsContext);
  if (!context) {
    throw new Error('useGenerationsContext must be used within GenerationsProvider');
  }
  return context;
}
