import express from "express";
import multer from "multer";
import {
  getOperations,
  getTemplates,
  textToImage,
  getGenerationStatus,
  getUserQueue,
  // editSimple,
  // editComplex,
  // compose,
  // styleTransfer,
  // quickAction,
  // textRendering,
} from "../controllers/gemini.controller.js";
import {
  validateTextToImage,
  // validateSimpleEdit,
  // validateComplexEdit,
  // validateComposition,
  // validateStyleTransfer,
  // validateQuickAction,
  // validateTextRendering,
  validateRequestWithCleanup,
} from "../middlewares/validators.js";
import {
  // uploadSingle,
  // uploadMultiple,
  // uploadStyleTransfer,
} from "../middlewares/upload.js";
import { verifyToken } from "../middlewares/tokenHandler.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { GEMINI_LIMITS, GEMINI_ERRORS } from "../utils/constant.js";

const router = express.Router();

/**
 * @swagger
 * /generate/operations:
 *   get:
 *     summary: List available image generation operations with token costs
 *     tags: [Gemini AI]
 *     security: []
 *     responses:
 *       200:
 *         description: Operations list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get("/operations", asyncHandler(getOperations));

/**
 * @swagger
 * /generate/templates:
 *   get:
 *     summary: List available prompt templates
 *     tags: [Gemini AI]
 *     security: []
 *     responses:
 *       200:
 *         description: Templates list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get("/templates", asyncHandler(getTemplates));

/**
 * @swagger
 * /generate/text-to-image:
 *   post:
 *     summary: Generate image(s) from text prompt (100 tokens per image)
 *     tags: [Gemini AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: A serene mountain landscape at sunset
 *               aspectRatio:
 *                 type: string
 *                 example: 16:9
 *                 description: Image aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)
 *               numberOfImages:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 4
 *                 default: 1
 *                 example: 2
 *                 description: Number of images to generate (1-4)
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *                 description: Optional project ID to associate generation
 *     responses:
 *       202:
 *         description: Image generation job queued successfully. Listen to WebSocket for progress updates.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               data:
 *                 jobId: "12345"
 *                 generationId: "550e8400-e29b-41d4-a716-446655440000"
 *                 status: "pending"
 *                 message: "Image generation job queued successfully. Listen to WebSocket for progress updates."
 *                 websocketEvents:
 *                   progress: "generation_progress"
 *                   completed: "generation_completed"
 *                   failed: "generation_failed"
 *                 statusEndpoint: "/api/generate/queue/550e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/text-to-image",
  verifyToken,
  validateTextToImage,
  validateRequestWithCleanup,
  asyncHandler(textToImage)
);

/**
 * @swagger
 * /generate/queue/{generationId}:
 *   get:
 *     summary: Get generation status and progress
 *     tags: [Gemini AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Generation ID
 *     responses:
 *       200:
 *         description: Generation status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Generation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/queue/:generationId",
  verifyToken,
  asyncHandler(getGenerationStatus)
);

/**
 * @swagger
 * /generate/my-queue:
 *   get:
 *     summary: Get user's active generation queue
 *     tags: [Gemini AI]
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
router.get(
  "/my-queue",
  verifyToken,
  asyncHandler(getUserQueue)
);

/**
 * @swagger
 * /generate/edit-simple:
 *   post:
 *     summary: Simple image editing (100 tokens)
 *     tags: [Gemini AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - prompt
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               prompt:
 *                 type: string
 *                 example: Make the sky more blue
 *     responses:
 *       200:
 *         description: Image edited successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
// router.post('/edit-simple',
//   verifyToken,
//   uploadSingle,
//   validateSimpleEdit,
//   validateRequestWithCleanup,
//   asyncHandler(editSimple)
// );

/**
 * @swagger
 * /generate/edit-complex:
 *   post:
 *     summary: Complex image editing with mask (150 tokens)
 *     tags: [Gemini AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - prompt
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               prompt:
 *                 type: string
 *                 example: Replace the car with a bicycle
 *               mask:
 *                 type: string
 *                 example: Generated mask coordinates
 *     responses:
 *       200:
 *         description: Image edited successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
// router.post('/edit-complex',
//   verifyToken,
//   uploadSingle,
//   validateComplexEdit,
//   validateRequestWithCleanup,
//   asyncHandler(editComplex)
// );

/**
 * @swagger
 * /generate/compose:
 *   post:
 *     summary: Multi-image composition (200 tokens)
 *     tags: [Gemini AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *               - prompt
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               prompt:
 *                 type: string
 *                 example: Combine these images into a collage
 *     responses:
 *       200:
 *         description: Images composed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
// router.post('/compose',
//   verifyToken,
//   uploadMultiple,
//   validateComposition,
//   validateRequestWithCleanup,
//   asyncHandler(compose)
// );

/**
 * @swagger
 * /generate/style-transfer:
 *   post:
 *     summary: Transfer style from one image to another (150 tokens)
 *     tags: [Gemini AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - contentImage
 *               - styleImage
 *             properties:
 *               contentImage:
 *                 type: string
 *                 format: binary
 *               styleImage:
 *                 type: string
 *                 format: binary
 *               intensity:
 *                 type: number
 *                 example: 0.8
 *     responses:
 *       200:
 *         description: Style transfer successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
// router.post('/style-transfer',
//   verifyToken,
//   uploadStyleTransfer,
//   validateStyleTransfer,
//   validateRequestWithCleanup,
//   asyncHandler(styleTransfer)
// );

/**
 * @swagger
 * /generate/quick-action:
 *   post:
 *     summary: Quick image actions like enhance, upscale, remove background (100 tokens)
 *     tags: [Gemini AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - action
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               action:
 *                 type: string
 *                 enum: [enhance, upscale, remove_background, fix_blur]
 *                 example: enhance
 *     responses:
 *       200:
 *         description: Quick action applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
// router.post('/quick-action',
//   verifyToken,
//   uploadSingle,
//   validateQuickAction,
//   validateRequestWithCleanup,
//   asyncHandler(quickAction)
// );

/**
 * @swagger
 * /generate/text-rendering:
 *   post:
 *     summary: Generate images with embedded text (100 tokens)
 *     tags: [Gemini AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - style
 *             properties:
 *               text:
 *                 type: string
 *                 example: Hello World
 *               style:
 *                 type: string
 *                 example: Modern minimalist design
 *     responses:
 *       200:
 *         description: Text rendering successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
// router.post('/text-rendering',
//   verifyToken,
//   validateTextRendering,
//   validateRequestWithCleanup,
//   asyncHandler(textRendering)
// );

// Error handling middleware for file upload errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        status: 400,
        message: `File too large. Maximum size is ${
          GEMINI_LIMITS.FILE_SIZE_MAX / (1024 * 1024)
        }MB`,
        code: GEMINI_ERRORS.IMAGE_TOO_LARGE,
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        status: 400,
        message: `Too many files. Maximum ${GEMINI_LIMITS.FILE_COUNT_MAX} files allowed`,
        code: GEMINI_ERRORS.INVALID_FILE_TYPE,
      });
    }
    return res.status(400).json({
      success: false,
      status: 400,
      message: `File upload error: ${error.message}`,
      code: GEMINI_ERRORS.UPLOAD_FAILED,
    });
  }
  next(error);
});

export default router;
