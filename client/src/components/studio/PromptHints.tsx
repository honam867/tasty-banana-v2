'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { getHintsByType } from '@/lib/api/textToImage';
import type { Hint } from '@/types/generation';

interface PromptHintsProps {
  type: string;
  onHintClick: (hintText: string) => void;
  visible?: boolean;
  maxDisplay?: number;
}

export default function PromptHints({
  type,
  onHintClick,
  visible = true,
  maxDisplay = 4,
}: PromptHintsProps) {
  const [hints, setHints] = useState<Hint[]>([]);
  const [displayedHints, setDisplayedHints] = useState<Hint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch hints on mount and when type changes
  useEffect(() => {
    fetchHints();
  }, [type]);

  // Randomize displayed hints when hints array changes
  useEffect(() => {
    if (hints.length > 0) {
      randomizeDisplayedHints();
    }
  }, [hints]);

  const fetchHints = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getHintsByType(type);
      
      if (response.success && response.data) {
        setHints(response.data.filter(h => h.isActive));
      }
    } catch (err: any) {
      console.error('[PromptHints] Fetch error:', err);
      setError('Failed to load hints');
    } finally {
      setLoading(false);
    }
  };

  const randomizeDisplayedHints = () => {
    if (hints.length === 0) return;

    // Shuffle and take maxDisplay hints
    const shuffled = [...hints].sort(() => Math.random() - 0.5);
    setDisplayedHints(shuffled.slice(0, Math.min(maxDisplay, hints.length)));
  };

  const handleRefresh = () => {
    randomizeDisplayedHints();
  };

  if (!visible) return null;

  if (loading && hints.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Loading hints...</span>
      </div>
    );
  }

  if (error || displayedHints.length === 0) {
    return null; // Silently fail if no hints available
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-400">Hints:</span>
      
      {displayedHints.map((hint) => (
        <button
          key={hint.id}
          onClick={() => onHintClick(hint.name)}
          className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors duration-200 border border-gray-700 hover:border-gray-600"
          type="button"
        >
          {hint.name}
        </button>
      ))}

      <button
        onClick={handleRefresh}
        className="p-1.5 text-gray-400 hover:text-white transition-colors duration-200"
        title="Refresh hints"
        type="button"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
}
