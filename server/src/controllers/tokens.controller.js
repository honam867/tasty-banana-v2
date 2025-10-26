import TokenService from "../services/tokens/TokenService.js";
import {
  successResponse,
  errorResponse,
} from "../middlewares/errorHandler.js";
import {
  validatePagination,
  validateAmount,
  validateUserId,
  validateIdempotencyKey,
} from "../middlewares/validators.js";
import {
  TOKEN_TRANSACTION_TYPES,
  TOKEN_ACTOR_TYPES,
  TOKEN_REASON_CODES,
  ROLE,
} from "../utils/constant.js";

/**
 * Get authenticated user's token balance
 * GET /api/tokens/balance
 */
export const getBalance = async (req, res) => {
  const userId = req.user.id;

  const balance = await TokenService.getBalance(userId);

  res.json(
    successResponse({
      balance: balance.balance,
      totalEarned: balance.totalEarned,
      totalSpent: balance.totalSpent,
    })
  );
};

/**
 * Get token transaction history with pagination
 * GET /api/tokens/history
 * Query params: limit, cursor, type, reason
 */
export const getHistory = async (req, res) => {
  const userId = req.user.id;
  const { limit, cursor } = validatePagination(
    req.query.limit,
    req.query.cursor
  );
  const { type, reason } = req.query;

  // Validate type if provided
  if (type && !Object.values(TOKEN_TRANSACTION_TYPES).includes(type)) {
    return res
      .status(400)
      .json(
        errorResponse({
          code: "INVALID_TYPE",
          message: `Type must be '${TOKEN_TRANSACTION_TYPES.CREDIT}' or '${TOKEN_TRANSACTION_TYPES.DEBIT}'`,
        })
      );
  }

  const history = await TokenService.getHistory(userId, {
    limit,
    cursor,
    type,
    reason,
  });

  res.json(
    successResponse({
      transactions: history.items,
      pagination: {
        limit,
        cursor: history.nextCursor,
        hasMore: history.hasMore,
      },
    })
  );
};

/**
 * Admin-only endpoint to add tokens to a user account
 * POST /api/admin/tokens/topup
 * Body: { userId, amount, notes, idempotencyKey (optional) }
 */
export const adminTopUp = async (req, res) => {
  // Check if user is admin
  if (req.user.role !== ROLE.ADMIN) {
    return res.status(403).json(
      errorResponse({
        code: "FORBIDDEN",
        message: "Admin access required",
      })
    );
  }

  const { userId, amount, notes, idempotencyKey } = req.body;

  // Validate inputs
  try {
    validateUserId(userId);
    validateAmount(amount);
    if (idempotencyKey) {
      validateIdempotencyKey(idempotencyKey);
    }
  } catch (validationError) {
    return res.status(400).json(
      errorResponse({
        code: "VALIDATION_ERROR",
        message: validationError.message,
      })
    );
  }

  // Credit tokens
  const result = await TokenService.credit(userId, amount, {
    reasonCode: TOKEN_REASON_CODES.ADMIN_TOPUP,
    idempotencyKey: idempotencyKey || `admin-topup:${userId}:${Date.now()}`,
    actor: {
      type: TOKEN_ACTOR_TYPES.ADMIN,
      id: req.user.id,
    },
    metadata: {
      notes: notes || "",
      adminEmail: req.user.email,
      ip: req.ip,
    },
  });

  res.json(
    successResponse(
      {
        userId,
        newBalance: result.balance,
        amountAdded: amount,
        transactionId: result.transactionId,
        idempotent: result.idempotent || false,
      },
      "Tokens added successfully"
    )
  );
};
