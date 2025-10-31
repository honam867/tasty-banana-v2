import express from "express";
import { getOperations } from "../controllers/operations.controller.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

const router = express.Router();

/**
 * @swagger
 * /operations:
 *   get:
 *     summary: List available image generation operations with token costs
 *     tags: [Operations]
 *     security: []
 *     responses:
 *       200:
 *         description: Operations list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get("/", asyncHandler(getOperations));

export default router;
