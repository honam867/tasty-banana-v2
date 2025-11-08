'use client';

import { useState, useEffect } from 'react';
import { useTokenBalance } from '@/lib/api/tokens';
import { useWebSocketEvent } from '@/hooks/useWebSocket';
import { Coins, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TokenBalanceUpdatedEvent } from '@/types/websocket';

export default function TokenBalance() {
  const { balance, loading, error, refetch } = useTokenBalance();
  const [displayBalance, setDisplayBalance] = useState<number | null>(balance);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update display balance when hook balance changes
  useEffect(() => {
    setDisplayBalance(balance);
  }, [balance]);

  // Listen for realtime token balance updates via WebSocket
  useWebSocketEvent<TokenBalanceUpdatedEvent>(
    'token_balance_updated',
    (data) => {
      setIsUpdating(true);
      setDisplayBalance(data.balance);
      
      // Trigger animation
      setTimeout(() => {
        setIsUpdating(false);
      }, 500);
    }
  );

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10 animate-pulse">
        <Coins className="w-4 h-4 text-[var(--banana-gold)]" />
        <div className="h-4 w-12 bg-white/10 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <button
        onClick={refetch}
        className="flex items-center space-x-2 px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/30 hover:bg-red-500/20 transition-colors group"
        title="Retry loading balance"
      >
        <RefreshCw className="w-4 h-4 text-red-400 group-hover:rotate-180 transition-transform duration-500" />
        <span className="text-xs text-red-400">Retry</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`
        flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all
        ${
          isUpdating
            ? 'bg-[var(--banana-gold)]/10 border-[var(--banana-gold)]/50'
            : 'bg-white/5 border-white/10 hover:border-[var(--banana-gold)]/30'
        }
      `}
    >
      <Coins
        className={`w-4 h-4 transition-colors ${
          isUpdating ? 'text-[var(--banana-gold)]' : 'text-[var(--banana-gold)]'
        }`}
      />
      <AnimatePresence mode="wait">
        <motion.span
          key={displayBalance}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="text-sm font-semibold text-white"
        >
          {displayBalance?.toLocaleString() ?? 0}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}
