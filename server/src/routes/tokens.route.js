import express from "express";
import TokenService from "../services/tokens/TokenService.js";
import {
  successResponse,
  errorResponse,
  asyncHandler,
} from "../middleware/errorHandler.js";
import {
  validatePagination,
  validateAmount,
  validateUserId,
  validateIdempotencyKey,
} from "../middleware/validators.js";
import { verifyToken } from "../middlewares/tokenHandler.js";

const router = express.Router();

/**
 * GET /api/tokens/balance
 * Get authenticated user's token balance
 */
router.get(
  "/balance",
  verifyToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const balance = await TokenService.getBalance(userId);

    res.json(
      successResponse({
        balance: balance.balance,
        totalEarned: balance.totalEarned,
        totalSpent: balance.totalSpent,
      })
    );
  })
);

/**
 * GET /api/tokens/history
 * Get token transaction history with pagination
 * Query params: limit, cursor, type, reason
 */
router.get(
  "/history",
  verifyToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit, cursor } = validatePagination(
      req.query.limit,
      req.query.cursor
    );
    const { type, reason } = req.query;

    // Validate type if provided
    if (type && !["credit", "debit"].includes(type)) {
      return res
        .status(400)
        .json(
          errorResponse({
            code: "INVALID_TYPE",
            message: "Type must be 'credit' or 'debit'",
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
  })
);

/**
 * POST /api/admin/tokens/topup
 * Admin-only endpoint to add tokens to a user account
 * Body: { userId, amount, notes, idempotencyKey (optional) }
 */
router.post(
  "/admin/topup",
  verifyToken,
  asyncHandler(async (req, res) => {
    // Check if user is admin
    if (req.user.role !== "admin") {
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
      reasonCode: "admin_topup",
      idempotencyKey: idempotencyKey || `admin-topup:${userId}:${Date.now()}`,
      actor: {
        type: "admin",
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
  })
);

export default router;
