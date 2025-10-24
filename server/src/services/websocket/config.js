/**
 * WebSocket Configuration
 * Simple configuration for job updates and user presence
 */

export const WS_EVENTS = {
  // Connection events
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  ERROR: "error",

  // Authentication events
  AUTHENTICATED: "authenticated",
  UNAUTHORIZED: "unauthorized",

  // User presence events
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",

  // Queue/Job events (for real-time updates)
  JOB_PROGRESS: "job_progress",
  JOB_COMPLETED: "job_completed",
  JOB_FAILED: "job_failed",
};

export const WS_ROOMS = {
  USER: (userId) => `user:${userId}`,
};

export const WS_CONFIG = {
  // Socket.IO configuration
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },
  
  // Connection options
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  maxHttpBufferSize: 1e6, // 1 MB
  
  // Compression
  perMessageDeflate: {
    threshold: 1024, // Only compress messages > 1KB
  },
  
  // Transport options
  transports: ["websocket", "polling"],
  
  // Connection state recovery
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: false,
  },
};

export const WS_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_TOKEN: "INVALID_TOKEN",
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  RATE_LIMIT: "RATE_LIMIT",
  SERVER_ERROR: "SERVER_ERROR",
};
