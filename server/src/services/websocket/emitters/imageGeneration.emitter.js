/**
 * Image Generation WebSocket Emitters
 * Provides real-time notifications for image generation progress and completion
 */

import websocketService from "../WebSocketService.js";
import { WS_EVENTS, wsUtils } from "../index.js";
import logger from "../../../config/logger.js";

/**
 * Emit generation progress update to user
 * @param {string} userId - User ID
 * @param {string} generationId - Generation ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Progress message
 * @param {Object} metadata - Additional metadata
 */
export function emitGenerationProgress(userId, generationId, progress, message, metadata = {}) {
  try {
    const io = websocketService.getIO();
    
    if (!io) {
      logger.warn("WebSocket not initialized, cannot send generation progress");
      return false;
    }
    
    wsUtils.emitToUser(io, userId, WS_EVENTS.GENERATION_PROGRESS, {
      generationId,
      progress: Math.min(100, Math.max(0, progress)), // Clamp 0-100
      message,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
    
    logger.debug(`Generation progress sent to user ${userId}: ${generationId} (${progress}%)`);
    return true;
  } catch (error) {
    logger.error("Failed to emit generation progress:", error);
    return false;
  }
}

/**
 * Emit generation completion to user
 * @param {string} userId - User ID
 * @param {string} generationId - Generation ID
 * @param {Object} result - Generation result data
 */
export function emitGenerationCompleted(userId, generationId, result) {
  try {
    const io = websocketService.getIO();
    
    if (!io) {
      logger.warn("WebSocket not initialized, cannot send generation completion");
      return false;
    }
    
    wsUtils.emitToUser(io, userId, WS_EVENTS.GENERATION_COMPLETED, {
      generationId,
      result,
      timestamp: new Date().toISOString(),
    });
    
    logger.info(`Generation completed notification sent to user ${userId}: ${generationId}`);
    return true;
  } catch (error) {
    logger.error("Failed to emit generation completion:", error);
    return false;
  }
}

/**
 * Emit generation failure to user
 * @param {string} userId - User ID
 * @param {string} generationId - Generation ID
 * @param {string|Object} error - Error message or object
 */
export function emitGenerationFailed(userId, generationId, error) {
  try {
    const io = websocketService.getIO();
    
    if (!io) {
      logger.warn("WebSocket not initialized, cannot send generation failure");
      return false;
    }
    
    const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
    
    wsUtils.emitToUser(io, userId, WS_EVENTS.GENERATION_FAILED, {
      generationId,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    
    logger.warn(`Generation failure notification sent to user ${userId}: ${generationId}`);
    return true;
  } catch (error) {
    logger.error("Failed to emit generation failure:", error);
    return false;
  }
}

/**
 * Generic job progress emitter (backward compatible with old events)
 * @param {string} userId - User ID
 * @param {string} jobId - Job ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} status - Job status
 */
export function emitJobProgress(userId, jobId, progress, status) {
  try {
    const io = websocketService.getIO();
    
    if (!io) return false;
    
    wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_PROGRESS, {
      jobId,
      progress,
      status,
      timestamp: new Date().toISOString(),
    });
    
    return true;
  } catch (error) {
    logger.error("Failed to emit job progress:", error);
    return false;
  }
}

/**
 * Generic job completion emitter (backward compatible)
 * @param {string} userId - User ID
 * @param {string} jobId - Job ID
 * @param {Object} result - Job result
 */
export function emitJobCompleted(userId, jobId, result) {
  try {
    const io = websocketService.getIO();
    
    if (!io) return false;
    
    wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_COMPLETED, {
      jobId,
      result,
      timestamp: new Date().toISOString(),
    });
    
    return true;
  } catch (error) {
    logger.error("Failed to emit job completion:", error);
    return false;
  }
}

/**
 * Generic job failure emitter (backward compatible)
 * @param {string} userId - User ID
 * @param {string} jobId - Job ID
 * @param {string|Object} error - Error message or object
 */
export function emitJobFailed(userId, jobId, error) {
  try {
    const io = websocketService.getIO();
    
    if (!io) return false;
    
    const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
    
    wsUtils.emitToUser(io, userId, WS_EVENTS.JOB_FAILED, {
      jobId,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    
    return true;
  } catch (error) {
    logger.error("Failed to emit job failure:", error);
    return false;
  }
}

export default {
  emitGenerationProgress,
  emitGenerationCompleted,
  emitGenerationFailed,
  emitJobProgress,
  emitJobCompleted,
  emitJobFailed,
};
