/**
 * Event Registry
 * Manages WebSocket event handlers in a modular and extensible way
 */

import logger from "../../config/logger.js";

class EventRegistry {
  constructor() {
    this.handlers = new Map(); // eventName -> Array of handler functions
    this.middleware = []; // Array of middleware functions
  }

  /**
   * Register a new event handler
   */
  on(eventName, handler, options = {}) {
    if (typeof handler !== "function") {
      throw new Error("Handler must be a function");
    }

    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }

    const handlerInfo = {
      handler,
      options: {
        priority: options.priority || 0,
        namespace: options.namespace || "default",
        description: options.description || "",
      },
    };

    this.handlers.get(eventName).push(handlerInfo);

    // Sort handlers by priority (higher priority first)
    this.handlers.get(eventName).sort((a, b) => b.options.priority - a.options.priority);

    logger.debug(`Event handler registered: ${eventName}`, {
      namespace: options.namespace,
      priority: options.priority,
    });
  }

  /**
   * Register multiple event handlers at once
   */
  registerHandlers(handlers, options = {}) {
    Object.entries(handlers).forEach(([eventName, handler]) => {
      this.on(eventName, handler, options);
    });
  }

  /**
   * Remove an event handler
   */
  off(eventName, handler) {
    if (!this.handlers.has(eventName)) return false;

    const handlers = this.handlers.get(eventName);
    const index = handlers.findIndex((h) => h.handler === handler);

    if (index !== -1) {
      handlers.splice(index, 1);
      logger.debug(`Event handler removed: ${eventName}`);
      return true;
    }

    return false;
  }

  /**
   * Add middleware to be executed before event handlers
   */
  use(middleware) {
    if (typeof middleware !== "function") {
      throw new Error("Middleware must be a function");
    }
    this.middleware.push(middleware);
  }

  /**
   * Execute handlers for a specific event
   */
  async execute(eventName, socket, data, context = {}) {
    try {
      // Execute middleware first
      for (const mw of this.middleware) {
        const result = await mw(socket, data, context);
        if (result === false) {
          logger.debug(`Middleware blocked event: ${eventName}`, { socketId: socket.id });
          return false;
        }
      }

      // Get handlers for this event
      const handlers = this.handlers.get(eventName) || [];

      if (handlers.length === 0) {
        logger.debug(`No handlers found for event: ${eventName}`);
        return true;
      }

      // Execute all handlers
      for (const { handler, options } of handlers) {
        try {
          await handler(socket, data, context);
        } catch (error) {
          logger.error(`Error in handler for event ${eventName}:`, {
            error: error.message,
            namespace: options.namespace,
            socketId: socket.id,
          });
          // Continue executing other handlers even if one fails
        }
      }

      return true;
    } catch (error) {
      logger.error(`Error executing event ${eventName}:`, {
        error: error.message,
        socketId: socket.id,
      });
      return false;
    }
  }

  /**
   * Get all registered event names
   */
  getEventNames() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handlers for a specific event
   */
  getHandlers(eventName) {
    return this.handlers.get(eventName) || [];
  }

  /**
   * Check if an event has handlers
   */
  hasHandlers(eventName) {
    return this.handlers.has(eventName) && this.handlers.get(eventName).length > 0;
  }

  /**
   * Clear all handlers (useful for testing or shutdown)
   */
  clear() {
    this.handlers.clear();
    this.middleware = [];
    logger.info("Event registry cleared");
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalEvents: this.handlers.size,
      totalHandlers: Array.from(this.handlers.values()).reduce(
        (sum, handlers) => sum + handlers.length,
        0
      ),
      totalMiddleware: this.middleware.length,
      events: Array.from(this.handlers.entries()).map(([name, handlers]) => ({
        name,
        handlerCount: handlers.length,
      })),
    };
  }
}

export default new EventRegistry();
