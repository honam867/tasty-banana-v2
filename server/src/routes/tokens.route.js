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
 * @swagger
 * /tokens/balance:
 *   get:
 *     summary: Get user token balance
 *     tags: [Tokens]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: integer
 *                       example: 1000
 *                     userId:
 *                       type: string
 *                       example: user-id-123
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/balance", verifyToken, asyncHandler(getBalance));

/**
 * @swagger
 * /tokens/history:
 *   get:
 *     summary: Get token transaction history
 *     tags: [Tokens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of records to return
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Pagination cursor
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [credit, debit]
 *         description: Transaction type filter
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *         description: Transaction reason filter
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     nextCursor:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/history", verifyToken, asyncHandler(getHistory));

/**
 * @swagger
 * /tokens/admin/topup:
 *   post:
 *     summary: Admin top-up user tokens
 *     tags: [Tokens]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *                 example: user-id-123
 *               amount:
 *                 type: integer
 *                 example: 500
 *               notes:
 *                 type: string
 *                 example: Monthly bonus
 *               idempotencyKey:
 *                 type: string
 *                 example: unique-key-123
 *     responses:
 *       200:
 *         description: Top-up successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/admin/topup", verifyToken, asyncHandler(adminTopUp));

export default router;
