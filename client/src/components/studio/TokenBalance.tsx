'use client';

import { useTokenBalance } from '@/lib/api/tokens';
import { Coins, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TokenBalance() {
  const { balance, loading, error, refetch } = useTokenBalance();

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
      className="flex items-center space-x-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10 hover:border-[var(--banana-gold)]/30 transition-colors"
    >
      <Coins className="w-4 h-4 text-[var(--banana-gold)]" />
      <span className="text-sm font-semibold text-white">
        {balance?.toLocaleString() ?? 0}
      </span>
    </motion.div>
  );
}
