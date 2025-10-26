import { TokenError } from "../services/tokens/TokenErrors.js";

/**
 * Custom Application Error Class
 */
export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Unified API Response Envelope
 * All endpoints return this format for consistency
 */
export const successResponse = (data, message = null) => {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
};

export const errorResponse = (error, correlationId = null) => {
  return {
    success: false,
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      message: error.message || "An unexpected error occurred",
      ...(error.details && { details: error.details }),
      ...(correlationId && { correlationId }),
    },
  };
};

/**
 * Global error handling middleware
 * Maps domain errors to HTTP status codes and unified response format
 */
export const errorHandler = (err, req, res, next) => {
  // Generate correlation ID if not present
  const correlationId = req.id || req.headers["x-correlation-id"] || generateId();

  // Log error with context
  console.error("Error occurred:", {
    correlationId,
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
    userId: req.user?.id,
  });

  // Token-specific errors
  if (err instanceof TokenError) {
    return res.status(err.statusCode).json(errorResponse(err, correlationId));
  }

  // Application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(errorResponse(err, correlationId));
  }

  // Authentication errors
  if (err.name === "UnauthorizedError" || err.code === "UNAUTHORIZED") {
    return res.status(401).json(
      errorResponse(
        {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
        correlationId
      )
    );
  }

  // Forbidden errors
  if (err.code === "FORBIDDEN") {
    return res.status(403).json(
      errorResponse(
        {
          code: "FORBIDDEN",
          message: "Access denied",
        },
        correlationId
      )
    );
  }

  // Validation errors (express-validator, Joi, etc.)
  if (err.name === "ValidationError" || err.code === "VALIDATION_ERROR") {
    return res.status(400).json(
      errorResponse(
        {
          code: "VALIDATION_ERROR",
          message: err.message || "Validation failed",
          details: err.details || err.errors,
        },
        correlationId
      )
    );
  }

  // Not found errors
  if (err.code === "NOT_FOUND" || err.statusCode === 404) {
    return res.status(404).json(
      errorResponse(
        {
          code: "NOT_FOUND",
          message: err.message || "Resource not found",
        },
        correlationId
      )
    );
  }

  // Rate limit errors
  if (err.code === "RATE_LIMIT_EXCEEDED") {
    return res.status(429).json(
      errorResponse(
        {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests, please try again later",
          details: { retryAfter: err.retryAfter },
        },
        correlationId
      )
    );
  }

  // Database errors
  if (err.name === "SequelizeError" || err.code?.startsWith("23")) {
    // PostgreSQL constraint violation codes start with 23
    return res.status(409).json(
      errorResponse(
        {
          code: "DATABASE_ERROR",
          message: "Database constraint violation",
        },
        correlationId
      )
    );
  }

  // Default to 500 Internal Server Error
  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === "production";
  return res.status(500).json(
    errorResponse(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: isProduction
          ? "An unexpected error occurred"
          : err.message || "Internal server error",
        ...((!isProduction && err.stack) && { stack: err.stack }),
      },
      correlationId
    )
  );
};

/**
 * 404 Not Found handler for undefined routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json(
    errorResponse({
      code: "ROUTE_NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    })
  );
};

/**
 * Async route wrapper to catch promise rejections
 * Usage: router.get('/path', asyncHandler(async (req, res) => {...}))
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Simple ID generator for correlation IDs
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
