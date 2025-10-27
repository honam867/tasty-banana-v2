/**
 * Example WebSocket Event Handlers
 * Simple examples for job updates and user presence
 * 
 * IMPORTANT: These are examples only - not used unless you register them!
 */

import logger from "../../../config/logger.js";
import websocketService, { WS_EVENTS, wsUtils } from "../index.js";

/**
 * Example: Real-time job progress update
 * This would typically be called from your queue worker
 * 
 * Usage in your queue worker:
 * import websocketService, { wsUtils } from './services/websocket/index.js';
 * const io = websocketService.getIO();
 * wsUtils.emitToUser(io, userId, 'job_progress', { jobId, progress: 50 });
 */
export function notifyJobProgress(userId, jobId, progress, status) {
  const io = websocketService.getIO();
  
  if (!io) {
    logger.warn("WebSocket not initialized, cannot send job progress");
    return;
  }
  
  wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_PROGRESS, {
    jobId,
    progress,
    status,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Example: Notify job completion
 */
export function notifyJobCompleted(userId, jobId, result) {
  const io = websocketService.getIO();
  
  if (!io) return;
  
  wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_COMPLETED, {
    jobId,
    result,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Example: Notify job failure
 */
export function notifyJobFailed(userId, jobId, error) {
  const io = websocketService.getIO();
  
  if (!io) return;
  
  wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_FAILED, {
    jobId,
    error,
    timestamp: new Date().toISOString(),
  });
}


