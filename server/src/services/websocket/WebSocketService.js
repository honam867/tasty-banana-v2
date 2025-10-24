/**
 * WebSocket Service
 * Simple WebSocket service for job updates and user presence
 */

import { Server } from "socket.io";
import logger from "../../config/logger.js";
import { WS_CONFIG, WS_EVENTS } from "./config.js";
import connectionManager from "./ConnectionManager.js";
import eventRegistry from "./EventRegistry.js";
import { authMiddleware } from "./middleware/auth.js";
import * as utils from "./utils.js";

class WebSocketService {
  constructor() {
    this.io = null;
    this.server = null;
    this.initialized = false;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer, options = {}) {
    if (this.initialized) {
      logger.warn("WebSocket service already initialized");
      return this.io;
    }

    try {
      // Create Socket.IO server
      this.io = new Server(httpServer, {
        ...WS_CONFIG,
        ...options,
      });

      this.server = httpServer;

      // Apply global middleware
      this.io.use(authMiddleware);

      // Setup connection handlers
      this.io.on(WS_EVENTS.CONNECTION, (socket) => {
        this.handleConnection(socket);
      });

      this.initialized = true;
      logger.info("WebSocket service initialized successfully");

      return this.io;
    } catch (error) {
      logger.error("Failed to initialize WebSocket service:", error);
      throw error;
    }
  }

  /**
   * Handle new connection
   */
  handleConnection(socket) {
    const userId = socket.data.user?.id || null;

    logger.info("New WebSocket connection", {
      socketId: socket.id,
      userId,
      authenticated: socket.data.authenticated,
      ip: socket.handshake.address,
    });

    // Add to connection manager
    connectionManager.addConnection(socket, userId);

    // Emit authenticated event if user is authenticated
    if (socket.data.authenticated) {
      socket.emit(WS_EVENTS.AUTHENTICATED, {
        user: socket.data.user,
        socketId: socket.id,
      });

      // Emit user online event
      this.io.emit(WS_EVENTS.USER_ONLINE, { userId });
    }

    // Setup event listeners
    this.setupEventListeners(socket);

    // Handle disconnection
    socket.on(WS_EVENTS.DISCONNECT, (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on(WS_EVENTS.ERROR, (error) => {
      logger.error("Socket error:", {
        socketId: socket.id,
        userId,
        error: error.message,
      });
    });
  }

  /**
   * Setup event listeners from registry
   */
  setupEventListeners(socket) {
    const eventNames = eventRegistry.getEventNames();

    eventNames.forEach((eventName) => {
      socket.on(eventName, async (data, callback) => {
        try {
          await eventRegistry.execute(eventName, socket, data, {
            eventName,
            callback,
          });

          // Execute callback if provided
          if (typeof callback === "function") {
            callback({ success: true });
          }
        } catch (error) {
          logger.error(`Error handling event ${eventName}:`, {
            socketId: socket.id,
            error: error.message,
          });

          if (typeof callback === "function") {
            callback({ success: false, error: error.message });
          }
        }
      });
    });
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(socket, reason) {
    const userId = socket.data.user?.id;

    logger.info("WebSocket disconnected", {
      socketId: socket.id,
      userId,
      reason,
    });

    connectionManager.removeConnection(socket.id);

    // Check if user is completely offline
    if (userId && !connectionManager.isUserOnline(userId)) {
      this.io.emit(WS_EVENTS.USER_OFFLINE, { userId });
    }
  }



  /**
   * Register event handler
   */
  on(eventName, handler, options) {
    eventRegistry.on(eventName, handler, options);
    
    // If already initialized, setup listener on existing connections
    if (this.initialized && this.io) {
      this.io.sockets.sockets.forEach((socket) => {
        socket.on(eventName, async (data, callback) => {
          try {
            await handler(socket, data, { eventName, callback });
            if (typeof callback === "function") {
              callback({ success: true });
            }
          } catch (error) {
            logger.error(`Error in event handler ${eventName}:`, error);
            if (typeof callback === "function") {
              callback({ success: false, error: error.message });
            }
          }
        });
      });
    }
  }

  /**
   * Register multiple event handlers
   */
  registerHandlers(handlers, options) {
    eventRegistry.registerHandlers(handlers, options);
  }

  /**
   * Use middleware
   */
  use(middleware) {
    if (this.initialized && this.io) {
      this.io.use(middleware);
    } else {
      logger.warn("Cannot add middleware before initialization");
    }
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connection: connectionManager.getStats(),
      events: eventRegistry.getStats(),
      namespaces: this.io
        ? Array.from(this.io._nsps.keys())
        : [],
    };
  }

  /**
   * Export utility functions
   */
  get utils() {
    return utils;
  }

  /**
   * Shutdown WebSocket service
   */
  async shutdown() {
    if (!this.initialized || !this.io) {
      return;
    }

    try {
      // Close all connections
      this.io.close();
      
      // Clear managers
      connectionManager.clear();
      eventRegistry.clear();

      this.initialized = false;
      this.io = null;
      this.server = null;

      logger.info("WebSocket service shut down successfully");
    } catch (error) {
      logger.error("Error during WebSocket shutdown:", error);
      throw error;
    }
  }
}

export default new WebSocketService();
