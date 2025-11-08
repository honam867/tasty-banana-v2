'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { getTokenBalance } from '@/lib/api/tokens';
import { useWebSocketEvent } from '@/hooks/useWebSocket';
import type { TokenBalanceUpdatedEvent } from '@/types/websocket';

interface TokenBalanceContextValue {
  balance: number | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TokenBalanceContext = createContext<TokenBalanceContextValue | null>(null);

export function TokenBalanceProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTokenBalance();
      if (response.success && response.data) {
        setBalance(response.data.balance);
        setUserId(response.data.userId);
      }
    } catch (err: any) {
      console.error('[Token Balance] Fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch token balance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useWebSocketEvent<TokenBalanceUpdatedEvent>('token_balance_updated', (data) => {
    setBalance(data.balance);
  });

  const value = useMemo(
    () => ({
      balance,
      userId,
      loading,
      error,
      refetch: fetchBalance,
    }),
    [balance, userId, loading, error, fetchBalance]
  );

  return (
    <TokenBalanceContext.Provider value={value}>
      {children}
    </TokenBalanceContext.Provider>
  );
}

export function useTokenBalance() {
  const context = useContext(TokenBalanceContext);
  if (!context) {
    throw new Error('useTokenBalance must be used within TokenBalanceProvider');
  }
  return context;
}
