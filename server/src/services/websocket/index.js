/**
 * WebSocket Service - Main Export
 * Centralized export for all WebSocket-related functionality
 */

import websocketService from "./WebSocketService.js";
import connectionManager from "./ConnectionManager.js";
import eventRegistry from "./EventRegistry.js";

// Export configuration and constants
export * from "./config.js";

// Export middleware
export * from "./middleware/auth.js";

// Export utilities
export * as wsUtils from "./utils.js";

// Export managers
export { connectionManager, eventRegistry };

// Export main service as default
export default websocketService;
