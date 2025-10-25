/**
 * Custom error classes for token operations
 * Provides machine-readable error codes and HTTP status mapping
 */

export class TokenError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InsufficientFundsError extends TokenError {
  constructor(required, available) {
    super(
      `Insufficient tokens. Required: ${required}, Available: ${available}`,
      "INSUFFICIENT_FUNDS",
      409
    );
    this.required = required;
    this.available = available;
  }
}

export class AccountNotFoundError extends TokenError {
  constructor(userId) {
    super(`Token account not found for user: ${userId}`, "ACCOUNT_NOT_FOUND", 404);
    this.userId = userId;
  }
}

export class InvalidAmountError extends TokenError {
  constructor(amount) {
    super(
      `Invalid token amount: ${amount}. Must be a positive integer.`,
      "INVALID_AMOUNT",
      400
    );
    this.amount = amount;
  }
}

export class DuplicateIdempotencyKeyError extends TokenError {
  constructor(key) {
    super(
      `Operation already processed with idempotency key: ${key}`,
      "DUPLICATE_IDEMPOTENCY_KEY",
      409
    );
    this.key = key;
  }
}

export class InvalidReasonCodeError extends TokenError {
  constructor(code) {
    super(`Invalid reason code: ${code}`, "INVALID_REASON_CODE", 400);
    this.code = code;
  }
}

export class UserIdRequiredError extends TokenError {
  constructor() {
    super("User ID is required", "USER_ID_REQUIRED", 400);
  }
}

export class ReasonCodeRequiredError extends TokenError {
  constructor() {
    super("Reason code is required", "REASON_CODE_REQUIRED", 400);
  }
}
