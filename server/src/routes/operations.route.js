import express from "express";
import { 
  getOperations, 
  getOperationById,
  createOperation, 
  updateOperation, 
  deleteOperation 
} from "../controllers/operations.controller.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { verifyToken } from "../middlewares/tokenHandler.js";
import { body } from "express-validator";
import { validateRequestWithCleanup } from "../middlewares/validators.js";

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

/**
 * @swagger
 * /operations/{id}:
 *   get:
 *     summary: Get single operation by ID
 *     tags: [Operations]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Operation retrieved successfully
 *       404:
 *         description: Operation not found
 */
router.get("/:id", asyncHandler(getOperationById));

/**
 * @swagger
 * /operations:
 *   post:
 *     summary: Create new operation (Admin only)
 *     tags: [Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - tokensPerOperation
 *             properties:
 *               name:
 *                 type: string
 *                 example: image_upscale
 *               tokensPerOperation:
 *                 type: integer
 *                 example: 200
 *               description:
 *                 type: string
 *                 example: Upscale image resolution using AI
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Operation created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Operation already exists
 */
router.post(
  "/",
  verifyToken,
  [
    body("name").notEmpty().withMessage("Operation name is required"),
    body("tokensPerOperation").isInt({ min: 0 }).withMessage("Valid tokens per operation is required"),
    body("description").optional(),
    body("isActive").optional().isBoolean(),
  ],
  validateRequestWithCleanup,
  asyncHandler(createOperation)
);

/**
 * @swagger
 * /operations/{id}:
 *   put:
 *     summary: Update operation (Admin only)
 *     tags: [Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               tokensPerOperation:
 *                 type: integer
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Operation updated successfully
 *       404:
 *         description: Operation not found
 *       401:
 *         description: Unauthorized
 */
router.put(
  "/:id",
  verifyToken,
  [
    body("name").optional(),
    body("tokensPerOperation").optional().isInt({ min: 0 }),
    body("description").optional(),
    body("isActive").optional().isBoolean(),
  ],
  validateRequestWithCleanup,
  asyncHandler(updateOperation)
);

/**
 * @swagger
 * /operations/{id}:
 *   delete:
 *     summary: Delete operation (Admin only)
 *     tags: [Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Operation deleted successfully
 *       404:
 *         description: Operation not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", verifyToken, asyncHandler(deleteOperation));

export default router;
