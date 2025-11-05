"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { STORAGE_KEYS, API_ENDPOINTS } from "@/lib/constants";
import { User, AuthResponse, RegisterResponse } from "@/types/api";
import apiClient from "@/lib/api";
import websocketService from "@/lib/websocket";

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
  login: (
    email: string,
    password: string,
    remember?: boolean
  ) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
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
      if (typeof window !== "undefined") {
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

        if (storedUser && token) {
          try {
            setUser(JSON.parse(storedUser));
            
            // Reconnect WebSocket if user was authenticated
            websocketService.connect(token);
          } catch (error) {
            console.error("Failed to parse stored user:", error);
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
  const login = useCallback(
    async (
      email: string,
      password: string,
      remember: boolean = false
    ): Promise<boolean> => {
      setLoading(true);
      try {
        const response = await apiClient.post<any>(API_ENDPOINTS.AUTH.LOGIN, {
          email,
          password,
          remember,
        });

        // Server response format: { success: true, user: {...}, token: "..." }
        if (response.success && response.token && response.user) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
          localStorage.setItem(
            STORAGE_KEYS.USER,
            JSON.stringify(response.user)
          );
          setUser(response.user);
          
          // Connect WebSocket with token
          websocketService.connect(response.token);
          
          setLoading(false);
          return true;
        }

        setLoading(false);
        return false;
      } catch (error) {
        console.error("Login failed:", error);
        setLoading(false);
        return false;
      }
    },
    []
  );

  /**
   * Register new user
   */
  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    setLoading(true);
    console.log("❤️ ~ useAuth ~ response:", API_ENDPOINTS.AUTH.REGISTER);

    try {
      const response = await apiClient.post<RegisterResponse>(
        API_ENDPOINTS.AUTH.REGISTER,
        data
      );

      // Server response format: { success: true, data: { user: {...}, token: "..." } }
      // Note: Registration returns success but user should login after
      if (response.success) {
        setLoading(false);
        return true;
      }

      setLoading(false);
      return false;
    } catch (error) {
      console.error("Registration failed:", error);
      setLoading(false);
      return false;
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    // Disconnect WebSocket
    websocketService.disconnect();
    
    // Clear storage
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);

    // Clear state
    setUser(null);

    // Redirect to login
    router.push("/login");
  }, [router]);

  /**
   * Refresh user data (currently not implemented on server)
   */
  const refreshUser = useCallback(async () => {
    // TODO: Implement when server adds /me endpoint
    console.log("Refresh user not implemented yet");
  }, []);

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
