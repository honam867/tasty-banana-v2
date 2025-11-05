/**
 * WebSocket Service
 * Singleton service for managing Socket.IO connection
 */

import { io, Socket } from 'socket.io-client';
import type { 
  WebSocketEventHandler, 
  UnsubscribeFunction,
  WebSocketStatus 
} from '@/types/websocket';

class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private statusCallbacks: Set<(status: WebSocketStatus) => void> = new Set();
  private currentStatus: WebSocketStatus = 'disconnected';

  constructor() {
    // Use environment variable or fallback to localhost
    this.url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:8090';
  }

  /**
   * Connect to WebSocket server with JWT token
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    if (!token) {
      console.error('[WebSocket] Cannot connect without token');
      this.setStatus('error');
      return;
    }

    this.token = token;
    this.setStatus('connecting');

    try {
      // Create Socket.IO client
      this.socket = io(this.url, {
        auth: {
          token: this.token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.setupEventHandlers();
      console.log('[WebSocket] Connecting to', this.url);
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.setStatus('error');
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (!this.socket) {
      return;
    }

    console.log('[WebSocket] Disconnecting...');
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.token = null;
    this.reconnectAttempts = 0;
    this.setStatus('disconnected');
  }

  /**
   * Subscribe to a WebSocket event
   */
  on<T = unknown>(
    event: string, 
    handler: WebSocketEventHandler<T>
  ): UnsubscribeFunction {
    if (!this.socket) {
      console.warn(`[WebSocket] Cannot subscribe to "${event}" - not connected`);
      return () => {};
    }

    this.socket.on(event, handler);

    // Return unsubscribe function
    return () => {
      if (this.socket) {
        this.socket.off(event, handler);
      }
    };
  }

  /**
   * Emit an event to the server
   */
  emit(event: string, data?: unknown): void {
    if (!this.socket?.connected) {
      console.warn(`[WebSocket] Cannot emit "${event}" - not connected`);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.currentStatus;
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: WebSocketStatus) => void): UnsubscribeFunction {
    this.statusCallbacks.add(callback);
    
    // Immediately call with current status
    callback(this.currentStatus);

    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Set connection status and notify subscribers
   */
  private setStatus(status: WebSocketStatus): void {
    if (this.currentStatus === status) {
      return;
    }

    console.log(`[WebSocket] Status: ${this.currentStatus} → ${status}`);
    this.currentStatus = status;
    
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[WebSocket] Error in status callback:', error);
      }
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected', this.socket?.id);
      this.reconnectAttempts = 0;
      this.setStatus('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.setStatus('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] Max reconnection attempts reached');
        this.setStatus('error');
      } else {
        this.setStatus('connecting');
      }
    });

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
      this.setStatus('error');
    });

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('[WebSocket] Authenticated:', data.user?.email);
    });

    this.socket.on('unauthorized', (data) => {
      console.error('[WebSocket] Unauthorized:', data.message);
      this.setStatus('error');
    });

    // Reconnection events
    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`[WebSocket] Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`);
      this.setStatus('connecting');
    });

    this.socket.io.on('reconnect', (attempt) => {
      console.log(`[WebSocket] Reconnected after ${attempt} attempts`);
      this.reconnectAttempts = 0;
      this.setStatus('connected');
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('[WebSocket] Reconnection failed');
      this.setStatus('error');
    });
  }
}

// Export singleton instance
export default new WebSocketService();
