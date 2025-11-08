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
