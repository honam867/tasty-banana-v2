/**
 * WebSocket Type Definitions
 * Matches server-side Socket.IO events and data structures
 */

export type WebSocketStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'error';

// Connection Events
export interface AuthenticatedEvent {
  user: {
    id: string;
    email: string;
    role?: string;
  };
  socketId: string;
}

export interface UnauthorizedEvent {
  code: string;
  message: string;
}

export interface UserOnlineEvent {
  userId: string;
}

export interface UserOfflineEvent {
  userId: string;
}

// Image Generation Events
export interface GenerationProgressEvent {
  generationId: string;
  progress: number;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface GenerationCompletedEvent {
  generationId: string;
  result: {
    generationId: string;
    images: Array<{
      imageUrl: string;
      imageId: string;
      mimeType: string;
      sizeBytes: number;
    }>;
    numberOfImages: number;
    metadata: {
      prompt: string;
      aspectRatio: string;
    };
    tokens?: {
      used: number;
      remaining: number;
    };
    processing?: {
      timeMs: number;
      status: string;
    };
    createdAt: string;
  };
  timestamp: string;
}

export interface GenerationFailedEvent {
  generationId: string;
  error: string;
  timestamp: string;
}

// Job Events (generic)
export interface JobProgressEvent {
  jobId: string;
  progress: number;
  status: string;
  timestamp: string;
}

export interface JobCompletedEvent {
  jobId: string;
  result: unknown;
  timestamp: string;
}

export interface JobFailedEvent {
  jobId: string;
  error: string;
  timestamp: string;
}

// Token Events
export interface TokenBalanceUpdatedEvent {
  balance: number;
  change: number;
  reason: string;
  transactionId?: string;
  timestamp: string;
}

// WebSocket Event Names (matching server config)
export const WS_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Authentication
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',
  
  // User presence
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  
  // Image generation
  GENERATION_PROGRESS: 'generation_progress',
  GENERATION_COMPLETED: 'generation_completed',
  GENERATION_FAILED: 'generation_failed',
  
  // Generic jobs
  JOB_PROGRESS: 'job_progress',
  JOB_COMPLETED: 'job_completed',
  JOB_FAILED: 'job_failed',
  
  // Token events
  TOKEN_BALANCE_UPDATED: 'token_balance_updated',
} as const;

export type WebSocketEventName = typeof WS_EVENTS[keyof typeof WS_EVENTS];

// Event handler types
export type WebSocketEventHandler<T = unknown> = (data: T) => void;

// Unsubscribe function
export type UnsubscribeFunction = () => void;
