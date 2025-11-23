import express from "express";
import {
  getUserQueue,
  getMyGenerations,
} from "../controllers/generations.controller.js";
import { verifyToken } from "../middlewares/tokenHandler.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

const router = express.Router();

/**
 * @swagger
 * /generations/my-queue:
 *   get:
 *     summary: Get user's active generation queue
 *     tags: [Generations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Maximum number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: User queue retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get("/my-queue", verifyToken, asyncHandler(getUserQueue));

/**
 * @swagger
 * /generations/my-generations:
 *   get:
 *     summary: Get user's generation queue and history (unified endpoint)
 *     description: Returns queue items (pending/processing), completed generations with images, and optionally failed items. Uses cursor-based pagination for infinite scroll.
 *     tags: [Generations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Maximum number of completed items per page
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for next page (base64 encoded, empty for first page)
 *       - in: query
 *         name: includeFailed
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include failed generations in response
 *     responses:
 *       200:
 *         description: User generations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User generations retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     queue:
 *                       type: array
 *                       description: Active queue items (pending/processing)
 *                       items:
 *                         type: object
 *                         properties:
 *                           generationId:
 *                             type: string
 *                             format: uuid
 *                           status:
 *                             type: string
 *                             enum: [pending, processing]
 *                           progress:
 *                             type: integer
 *                             minimum: 0
 *                             maximum: 100
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           metadata:
 *                             type: object
 *                             properties:
 *                               prompt:
 *                                 type: string
 *                               numberOfImages:
 *                                 type: integer
 *                               aspectRatio:
 *                                 type: string
 *                               projectId:
 *                                 type: string
 *                                 format: uuid
 *                     completed:
 *                       type: array
 *                       description: Completed generations with images
 *                       items:
 *                         type: object
 *                         properties:
 *                           generationId:
 *                             type: string
 *                             format: uuid
 *                           status:
 *                             type: string
 *                             enum: [completed]
 *                           progress:
 *                             type: integer
 *                             example: 100
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                           metadata:
 *                             type: object
 *                           images:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 imageId:
 *                                   type: string
 *                                   format: uuid
 *                                 imageUrl:
 *                                   type: string
 *                                 mimeType:
 *                                   type: string
 *                                 sizeBytes:
 *                                   type: integer
 *                     cursor:
 *                       type: object
 *                       properties:
 *                         next:
 *                           type: string
 *                           description: Cursor for next page (null if no more pages)
 *                         hasMore:
 *                           type: boolean
 *                         queueCount:
 *                           type: integer
 *                         completedCount:
 *                           type: integer
 */
router.get("/my-generations", verifyToken, asyncHandler(getMyGenerations));

export default router;
