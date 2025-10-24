/**
 * WebSocket Utility Functions
 * Simple helpers for job updates and user presence
 */

import logger from "../../config/logger.js";
import connectionManager from "./ConnectionManager.js";
import { WS_ROOMS } from "./config.js";

/**
 * Emit event to a specific user (all their connected sockets)
 */
export function emitToUser(io, userId, eventName, data) {
  try {
    const roomName = WS_ROOMS.USER(userId);
    io.to(roomName).emit(eventName, data);
    
    logger.debug(`Event emitted to user: ${userId}`, { eventName });
    return true;
  } catch (error) {
    logger.error(`Failed to emit to user ${userId}:`, error);
    return false;
  }
}

/**
 * Check if user is online
 */
export function isUserOnline(userId) {
  return connectionManager.isUserOnline(userId);
}

/**
 * Get online users count
 */
export function getOnlineUsersCount() {
  return connectionManager.getStats().totalUsers;
}

/**
 * Get all online users
 */
export function getOnlineUsers() {
  return connectionManager.getOnlineUsers();
}
