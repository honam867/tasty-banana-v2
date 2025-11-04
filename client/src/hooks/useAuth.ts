'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { STORAGE_KEYS, API_ENDPOINTS } from '@/lib/constants';
import { User, AuthResponse } from '@/types/api';
import apiClient from '@/lib/api';

/**
 * Authentication Hook
 * Manages user authentication state and provides auth operations
 * 
 * Usage:
 * const { user, loading, isAuthenticated, login, logout, register } = useAuth();
 */

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Load user from localStorage on mount
   */
  useEffect(() => {
    const loadUser = () => {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

        if (storedUser && token) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (error) {
            console.error('Failed to parse stored user:', error);
            localStorage.removeItem(STORAGE_KEYS.USER);
          }
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  /**
   * Login user
   */
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
      });

      // Store token and user
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
      if (response.refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      }
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));

      setUser(response.user);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      setLoading(false);
      return false;
    }
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data);

      // Store token and user
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
      if (response.refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      }
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));

      setUser(response.user);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      setLoading(false);
      return false;
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    // Clear storage
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);

    // Clear state
    setUser(null);

    // Redirect to login
    router.push('/login');
  }, [router]);

  /**
   * Refresh user data from API
   */
  const refreshUser = useCallback(async () => {
    if (!user) return;

    try {
      const response = await apiClient.get<User>(API_ENDPOINTS.AUTH.ME);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response));
      setUser(response);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, logout
      logout();
    }
  }, [user, logout]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };
}
