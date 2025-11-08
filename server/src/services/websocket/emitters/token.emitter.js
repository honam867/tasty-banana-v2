/**
 * Token Balance WebSocket Emitters
 * Provides real-time notifications for token balance updates
 */

import websocketService from "../WebSocketService.js";
import { WS_EVENTS, wsUtils } from "../index.js";
import logger from "../../../config/logger.js";

/**
 * Emit token balance update to user
 * @param {string} userId - User ID
 * @param {number} balance - New balance amount
 * @param {number} change - Amount changed (positive for credit, negative for debit)
 * @param {string} reason - Reason for change (e.g., 'spend_generation', 'purchase')
 * @param {Object} metadata - Additional metadata
 */
export function emitTokenBalanceUpdated(userId, balance, change, reason, metadata = {}) {
  try {
    const io = websocketService.getIO();
    
    if (!io) {
      logger.warn("WebSocket not initialized, cannot send token balance update");
      return false;
    }
    
    wsUtils.emitToUser(io, userId, WS_EVENTS.TOKEN_BALANCE_UPDATED, {
      balance,
      change,
      reason,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
    
    logger.debug(`Token balance update sent to user ${userId}: ${balance} (change: ${change})`);
    return true;
  } catch (error) {
    logger.error("Failed to emit token balance update:", error);
    return false;
  }
}

export default {
  emitTokenBalanceUpdated,
};
