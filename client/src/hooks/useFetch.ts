'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError, AxiosRequestConfig } from 'axios';
import apiClient from '@/lib/api';
import { RequestState } from '@/types/api';

/**
 * Data Fetching Hook (SWR-like pattern)
 * Automatically fetches data on mount and provides refetch functionality
 * 
 * Usage:
 * const { data, loading, error, refetch } = useFetch<ResponseType>('/api/endpoint');
 * 
 * // With options
 * const { data, loading, error } = useFetch('/api/endpoint', {
 *   enabled: isReady,
 *   params: { page: 1 }
 * });
 */

interface UseFetchOptions extends AxiosRequestConfig {
  enabled?: boolean; // Only fetch if true (default: true)
  refetchOnMount?: boolean; // Refetch when component remounts (default: false)
}

export function useFetch<T = any>(
  url: string | null,
  options?: UseFetchOptions
) {
  const { enabled = true, refetchOnMount = false, ...axiosConfig } = options || {};

  const [state, setState] = useState<RequestState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  /**
   * Fetch data from API
   */
  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiClient.get<T>(url, axiosConfig);
      setState({ data: response, loading: false, error: null });
    } catch (err) {
      const error = err as AxiosError;
      const errorMessage = (error.response?.data as any)?.message || error.message || 'An error occurred';
      
      setState({ data: null, loading: false, error: errorMessage });
    }
  }, [url, enabled, axiosConfig]);

  /**
   * Manual refetch
   */
  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  /**
   * Auto-fetch on mount and when dependencies change
   */
  useEffect(() => {
    if (enabled && url) {
      fetchData();
    }
  }, [fetchData, enabled, url]);

  /**
   * Refetch on remount if enabled
   */
  useEffect(() => {
    if (refetchOnMount && enabled && url) {
      return () => {
        fetchData();
      };
    }
  }, [refetchOnMount, enabled, url, fetchData]);

  return {
    ...state,
    refetch,
  };
}
