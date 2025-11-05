'use client';

/**
 * WebSocket Hooks
 * Custom hooks for WebSocket event subscriptions and status
 */

import { useEffect, useRef } from 'react';
import websocketService from '@/lib/websocket';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import type { WebSocketEventHandler } from '@/types/websocket';

/**
 * Hook to access WebSocket connection status and controls
 */
export function useWebSocket() {
  return useWebSocketContext();
}

/**
 * Hook to subscribe to a specific WebSocket event
 * Automatically handles cleanup on unmount
 * 
 * @example
 * useWebSocketEvent('generation_progress', (data) => {
 *   console.log('Progress:', data.progress);
 * });
 */
export function useWebSocketEvent<T = unknown>(
  event: string,
  handler: WebSocketEventHandler<T>,
  deps: React.DependencyList = []
) {
  const handlerRef = useRef(handler);

  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const wrappedHandler = (data: T) => {
      handlerRef.current(data);
    };

    const unsubscribe = websocketService.on<T>(event, wrappedHandler);

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

/**
 * Hook to check if WebSocket is connected
 */
export function useWebSocketStatus() {
  const { status, isConnected, error } = useWebSocketContext();
  
  return {
    status,
    isConnected,
    error,
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected',
    hasError: status === 'error',
  };
}

/**
 * Hook to emit WebSocket events
 * Returns a memoized emit function
 */
export function useWebSocketEmit() {
  const { isConnected } = useWebSocketContext();

  return {
    emit: (event: string, data?: unknown) => {
      if (!isConnected) {
        console.warn(`[useWebSocketEmit] Cannot emit "${event}" - not connected`);
        return false;
      }
      websocketService.emit(event, data);
      return true;
    },
    isConnected,
  };
}
