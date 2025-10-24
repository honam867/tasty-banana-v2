/**
 * Connection Manager
 * Manages active WebSocket connections, user sessions, and connection metadata
 */

import logger from "../../config/logger.js";
import { WS_ROOMS } from "./config.js";

class ConnectionManager {
  constructor() {
    this.connections = new Map(); // socketId -> { socket, userId, metadata }
    this.userSockets = new Map(); // userId -> Set of socketIds
  }

  /**
   * Add a new connection
   */
  addConnection(socket, userId = null, metadata = {}) {
    const connectionData = {
      socket,
      userId,
      metadata: {
        ...metadata,
        connectedAt: new Date(),
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers["user-agent"],
      },
    };

    this.connections.set(socket.id, connectionData);

    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(socket.id);

      // Join user-specific room
      socket.join(WS_ROOMS.USER(userId));
    }

    logger.info(`Connection added: ${socket.id}`, {
      userId,
      totalConnections: this.connections.size,
    });
  }

  /**
   * Remove a connection
   */
  removeConnection(socketId) {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    const { userId } = connection;

    this.connections.delete(socketId);

    if (userId) {
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socketId);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }

    logger.info(`Connection removed: ${socketId}`, {
      userId,
      totalConnections: this.connections.size,
    });
  }

  /**
   * Associate a socket with a user after authentication
   */
  associateUser(socketId, userId) {
    const connection = this.connections.get(socketId);
    if (!connection) return false;

    // Remove from old user if exists
    if (connection.userId) {
      const oldUserSockets = this.userSockets.get(connection.userId);
      if (oldUserSockets) {
        oldUserSockets.delete(socketId);
        if (oldUserSockets.size === 0) {
          this.userSockets.delete(connection.userId);
        }
      }
    }

    // Associate with new user
    connection.userId = userId;
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);

    // Join user-specific room
    connection.socket.join(WS_ROOMS.USER(userId));

    logger.info(`User associated with socket: ${socketId}`, { userId });
    return true;
  }

  /**
   * Get connection by socket ID
   */
  getConnection(socketId) {
    return this.connections.get(socketId);
  }

  /**
   * Get all socket IDs for a user
   */
  getUserSockets(userId) {
    return Array.from(this.userSockets.get(userId) || []);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Get all online user IDs
   */
  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Get total connection count
   */
  getConnectionCount() {
    return this.connections.size;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      totalUsers: this.userSockets.size,
      authenticatedConnections: Array.from(this.connections.values()).filter(
        (c) => c.userId
      ).length,
      anonymousConnections: Array.from(this.connections.values()).filter(
        (c) => !c.userId
      ).length,
    };
  }

  /**
   * Clear all connections (for shutdown)
   */
  clear() {
    this.connections.clear();
    this.userSockets.clear();
    logger.info("Connection manager cleared");
  }
}

export default new ConnectionManager();
