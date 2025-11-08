import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api';

/**
 * Token Balance API Response
 */
export interface TokenBalanceResponse {
  success: boolean;
  data: {
    balance: number;
    userId: string;
  };
}

/**
 * Get user's token balance
 * GET /api/tokens/balance
 */
export async function getTokenBalance(): Promise<TokenBalanceResponse> {
  return apiClient.get<TokenBalanceResponse>('/api/tokens/balance');
}

/**
 * Custom hook for token balance with loading and error states
 * Includes auto-refresh capability
 */
export function useTokenBalance() {
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

  // Fetch on mount
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    userId,
    loading,
    error,
    refetch: fetchBalance,
  };
}
