import express from "express";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { verifyToken } from "../middlewares/tokenHandler.js";
import {
  getBalance,
  getHistory,
  adminTopUp,
} from "../controllers/tokens.controller.js";

const router = express.Router();

/**
 * GET /api/tokens/balance
 * Get authenticated user's token balance
 */
router.get("/balance", verifyToken, asyncHandler(getBalance));

/**
 * GET /api/tokens/history
 * Get token transaction history with pagination
 * Query params: limit, cursor, type, reason
 */
router.get("/history", verifyToken, asyncHandler(getHistory));

/**
 * POST /api/admin/tokens/topup
 * Admin-only endpoint to add tokens to a user account
 * Body: { userId, amount, notes, idempotencyKey (optional) }
 */
router.post("/admin/topup", verifyToken, asyncHandler(adminTopUp));

export default router;
