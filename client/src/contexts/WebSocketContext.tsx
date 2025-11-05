'use client';

/**
 * WebSocket Context
 * Provides global WebSocket connection state to the application
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import websocketService from '@/lib/websocket';
import type { WebSocketStatus } from '@/types/websocket';

interface WebSocketContextValue {
  status: WebSocketStatus;
  isConnected: boolean;
  error: string | null;
  connect: (token: string) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = websocketService.onStatusChange((newStatus) => {
      setStatus(newStatus);
      
      if (newStatus === 'error') {
        setError('WebSocket connection error. Retrying...');
      } else if (newStatus === 'connected') {
        setError(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const connect = useCallback((token: string) => {
    setError(null);
    websocketService.connect(token);
  }, []);

  const disconnect = useCallback(() => {
    setError(null);
    websocketService.disconnect();
  }, []);

  const value: WebSocketContextValue = {
    status,
    isConnected: status === 'connected',
    error,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  
  return context;
}
