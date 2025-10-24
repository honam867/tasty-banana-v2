/**
 * WebSocket Authentication Middleware
 * Handles authentication for WebSocket connections using JWT tokens
 */

import jwt from "jsonwebtoken";
import logger from "../../../config/logger.js";
import { config } from "../../../config/env.js";
import { WS_ERROR_CODES, WS_EVENTS } from "../config.js";

/**
 * Verify JWT token from socket handshake
 */
function extractToken(socket) {
  // Try to get token from different sources
  const token =
    socket.handshake.auth?.token || // Socket.IO auth object
    socket.handshake.headers?.authorization?.replace("Bearer ", "") || // HTTP header
    socket.handshake.query?.token; // Query parameter

  return token;
}

/**
 * Authentication middleware for Socket.IO
 * Usage: io.use(authMiddleware)
 */
export const authMiddleware = async (socket, next) => {
  try {
    const token = extractToken(socket);

    if (!token) {
      logger.warn("WebSocket connection without token", {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      
      // Allow connection but mark as unauthenticated
      socket.data.authenticated = false;
      socket.data.user = null;
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Attach user data to socket
    socket.data.authenticated = true;
    socket.data.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role,
      ...decoded,
    };

    logger.info("WebSocket authenticated", {
      socketId: socket.id,
      userId: socket.data.user.id,
    });

    next();
  } catch (error) {
    logger.error("WebSocket authentication failed", {
      socketId: socket.id,
      error: error.message,
    });

    // Send error but allow connection (for graceful handling)
    socket.data.authenticated = false;
    socket.data.authError = {
      code: WS_ERROR_CODES.INVALID_TOKEN,
      message: error.message,
    };

    next();
  }
};

/**
 * Require authentication middleware
 * Use this for event handlers that require authentication
 */
export const requireAuth = (handler) => {
  return async (socket, data, context) => {
    if (!socket.data.authenticated) {
      socket.emit(WS_EVENTS.UNAUTHORIZED, {
        code: WS_ERROR_CODES.UNAUTHORIZED,
        message: "Authentication required",
      });
      
      logger.warn("Unauthorized WebSocket event access", {
        socketId: socket.id,
        event: context.eventName,
      });
      
      return false;
    }

    return handler(socket, data, context);
  };
};

/**
 * Require specific role middleware
 */
export const requireRole = (...allowedRoles) => {
  return (handler) => {
    return async (socket, data, context) => {
      if (!socket.data.authenticated) {
        socket.emit(WS_EVENTS.UNAUTHORIZED, {
          code: WS_ERROR_CODES.UNAUTHORIZED,
          message: "Authentication required",
        });
        return false;
      }

      const userRole = socket.data.user.role;
      if (!allowedRoles.includes(userRole)) {
        socket.emit(WS_EVENTS.UNAUTHORIZED, {
          code: WS_ERROR_CODES.UNAUTHORIZED,
          message: "Insufficient permissions",
        });
        
        logger.warn("Unauthorized role access", {
          socketId: socket.id,
          userId: socket.data.user.id,
          userRole,
          requiredRoles: allowedRoles,
        });
        
        return false;
      }

      return handler(socket, data, context);
    };
  };
};

/**
 * Rate limiting middleware for WebSocket events
 */
export const rateLimitMiddleware = (maxRequests = 10, windowMs = 1000) => {
  const requests = new Map(); // socketId -> { count, resetTime }

  return async (socket, data, context) => {
    const now = Date.now();
    const socketId = socket.id;

    if (!requests.has(socketId)) {
      requests.set(socketId, { count: 1, resetTime: now + windowMs });
      return true;
    }

    const record = requests.get(socketId);

    if (now > record.resetTime) {
      // Reset window
      record.count = 1;
      record.resetTime = now + windowMs;
      return true;
    }

    if (record.count >= maxRequests) {
      socket.emit(WS_EVENTS.ERROR, {
        code: WS_ERROR_CODES.RATE_LIMIT,
        message: "Too many requests, please slow down",
      });
      
      logger.warn("WebSocket rate limit exceeded", {
        socketId,
        userId: socket.data.user?.id,
      });
      
      return false;
    }

    record.count++;
    return true;
  };
};

/**
 * Validation middleware for event payloads
 */
export const validatePayload = (schema) => {
  return async (socket, data, context) => {
    try {
      if (typeof schema === "function") {
        const isValid = schema(data);
        if (!isValid) {
          throw new Error("Invalid payload");
        }
      }
      return true;
    } catch (error) {
      socket.emit(WS_EVENTS.ERROR, {
        code: WS_ERROR_CODES.INVALID_PAYLOAD,
        message: error.message,
      });
      
      logger.warn("Invalid WebSocket payload", {
        socketId: socket.id,
        error: error.message,
      });
      
      return false;
    }
  };
};
