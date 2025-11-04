import TokenService from "../services/tokens/TokenService.js";
import { successResponse, errorResponse } from "../middlewares/errorHandler.js";
import { validatePagination } from "../middlewares/validators.js";
import { TOKEN_TRANSACTION_TYPES } from "../utils/constant.js";

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
    return res.status(400).json(
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
 * Note: Admin token operations have been moved to /api/admin/users/:userId/tokens/*
 * See: controllers/admin/users.controller.js
 * - creditTokens() - Credit tokens to user
 * - debitTokens() - Debit tokens from user
 */
