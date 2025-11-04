'use client';

import { useState, useCallback } from 'react';
import { AxiosError, AxiosRequestConfig } from 'axios';
import apiClient from '@/lib/api';
import { RequestState } from '@/types/api';

/**
 * Generic API Hook for Manual API Calls
 * 
 * Usage:
 * const { data, loading, error, execute } = useApi<ResponseType>();
 * 
 * // In handler
 * const handleSubmit = async () => {
 *   const result = await execute('/api/endpoint', { method: 'POST', data: formData });
 * };
 */

interface UseApiOptions extends AxiosRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

export function useApi<T = any>() {
  const [state, setState] = useState<RequestState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  /**
   * Execute API call
   * @param url - API endpoint
   * @param options - Request options (method, data, headers, etc.)
   */
  const execute = useCallback(async (
    url: string,
    options?: UseApiOptions
  ): Promise<T | null> => {
    setState({ data: null, loading: true, error: null });

    try {
      const method = options?.method || 'GET';
      let response: T;

      switch (method) {
        case 'GET':
          response = await apiClient.get<T>(url, options);
          break;
        case 'POST':
          response = await apiClient.post<T>(url, options?.data, options);
          break;
        case 'PUT':
          response = await apiClient.put<T>(url, options?.data, options);
          break;
        case 'PATCH':
          response = await apiClient.patch<T>(url, options?.data, options);
          break;
        case 'DELETE':
          response = await apiClient.delete<T>(url, options);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      setState({ data: response, loading: false, error: null });
      return response;
    } catch (err) {
      const error = err as AxiosError;
      const errorMessage = (error.response?.data as any)?.message || error.message || 'An error occurred';
      
      setState({ data: null, loading: false, error: errorMessage });
      return null;
    }
  }, []);

  /**
   * Reset state to initial values
   */
  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
