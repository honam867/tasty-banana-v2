/**
 * Request validation utilities
 * Provides reusable validation functions for token operations
 */

/**
 * Validate token amount
 */
export const validateAmount = (amount) => {
  if (!Number.isInteger(amount)) {
    throw new Error("Amount must be an integer");
  }
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }
  if (amount > 1000000) {
    throw new Error("Amount exceeds maximum limit");
  }
  return amount;
};

/**
 * Validate reason code
 */
const VALID_REASON_CODES = [
  "signup_bonus",
  "admin_topup",
  "text_to_image",
  "image_edit_simple",
  "image_edit_complex",
  "multi_image_composition",
  "style_transfer",
  "conversational_edit",
  "text_rendering",
  "custom_prompt",
  "refund",
  "adjustment",
];

export const validateReasonCode = (code) => {
  if (!code || typeof code !== "string") {
    throw new Error("Reason code is required");
  }
  if (!VALID_REASON_CODES.includes(code)) {
    throw new Error(`Invalid reason code: ${code}`);
  }
  return code;
};

/**
 * Validate idempotency key format
 */
export const validateIdempotencyKey = (key) => {
  if (!key) return null;

  if (typeof key !== "string") {
    throw new Error("Idempotency key must be a string");
  }
  if (key.length < 1 || key.length > 128) {
    throw new Error("Idempotency key must be 1-128 characters");
  }
  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    throw new Error("Idempotency key contains invalid characters");
  }
  return key;
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (limit, cursor) => {
  let validLimit = 20; // default
  if (limit !== undefined) {
    const parsed = parseInt(limit, 10);
    if (isNaN(parsed) || parsed < 1) {
      throw new Error("Limit must be a positive integer");
    }
    validLimit = Math.min(parsed, 100); // cap at 100
  }

  let validCursor = null;
  if (cursor !== undefined && cursor !== null) {
    if (typeof cursor !== "string") {
      throw new Error("Cursor must be a string");
    }
    validCursor = cursor;
  }

  return { limit: validLimit, cursor: validCursor };
};

/**
 * Validate user ID format (UUID)
 */
export const validateUserId = (userId) => {
  if (!userId) {
    throw new Error("User ID is required");
  }
  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error("Invalid user ID format");
  }
  return userId;
};

/**
 * Validate metadata object size
 */
export const validateMetadata = (metadata) => {
  if (!metadata) return {};

  if (typeof metadata !== "object") {
    throw new Error("Metadata must be an object");
  }

  const jsonString = JSON.stringify(metadata);
  if (jsonString.length > 10000) {
    // 10KB limit
    throw new Error("Metadata exceeds size limit");
  }

  return metadata;
};
