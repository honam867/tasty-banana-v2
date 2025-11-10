import express from "express";
import multer from "multer";
import { textToImage, imageReference, imageMultipleReference } from "../controllers/gemini.controller.js";
import {
  validateTextToImage,
  validateImageReference,
  validateImageMultipleReference,
  // validateSimpleEdit,
  // validateComplexEdit,
  // validateComposition,
  // validateStyleTransfer,
  // validateQuickAction,
  // validateTextRendering,
  validateRequestWithCleanup,
} from "../middlewares/validators.js";
import {
  uploadSingle,
  uploadMultipleReference,
  // uploadMultiple,
  // uploadStyleTransfer,
} from "../middlewares/upload.js";
import { verifyToken } from "../middlewares/tokenHandler.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { validateModel } from "../middlewares/modelValidator.js";
import { GEMINI_LIMITS, GEMINI_ERRORS } from "../utils/constant.js";

const router = express.Router();

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
 *               promptTemplateId:
 *                 type: string
 *                 format: uuid
 *                 example: 660e8400-e29b-41d4-a716-446655440000
 *                 description: Optional prompt template ID for style enhancement (from /api/prompt-templates)
 *               model:
 *                 type: string
 *                 example: gemini-2.5-flash-image
 *                 description: Optional model selection (defaults to gemini-2.5-flash-image). Future-ready for multiple models.
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
  validateModel,
  validateTextToImage,
  validateRequestWithCleanup,
  asyncHandler(textToImage)
);

/**
 * @swagger
 * /generate/image-reference:
 *   post:
 *     summary: Generate images using a reference image (upload OR referenceImageId)
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
 *               - prompt
 *               - referenceType
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: Professional portrait in a modern office
 *               referenceType:
 *                 type: string
 *                 enum: [subject, face, full_image]
 *                 example: face
 *                 description: "Focus mode: subject (main object), face (facial features), full_image (entire composition)"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Reference image file (optional if referenceImageId provided)
 *               referenceImageId:
 *                 type: string
 *                 format: uuid
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *                 description: UUID of previously uploaded/generated image (optional if image file uploaded)
 *               aspectRatio:
 *                 type: string
 *                 example: "1:1"
 *               numberOfImages:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 4
 *                 default: 1
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               model:
 *                 type: string
 *                 example: gemini-2.5-flash-image
 *                 description: Optional model selection (defaults to gemini-2.5-flash-image). Future-ready for multiple models.
 *     responses:
 *       202:
 *         description: Image reference generation job queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/image-reference",
  verifyToken,
  uploadSingle,
  validateModel,
  validateImageReference,
  validateRequestWithCleanup,
  asyncHandler(imageReference)
);

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

/**
 * @swagger
 * /generate/image-multiple-reference:
 *   post:
 *     summary: Generate image(s) using target + multiple reference images (200 tokens per image)
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
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: Change the model's outfit to a professional business suit with these accessories
 *               targetImage:
 *                 type: string
 *                 format: binary
 *                 description: Target image file (main subject to edit/enhance) - OR provide targetImageId
 *               targetImageId:
 *                 type: string
 *                 format: uuid
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *                 description: UUID of existing target image (alternative to file upload)
 *               referenceImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 1-5 reference image files (accessories, styles, elements) - OR provide referenceImageIds
 *               referenceImageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["660e8400-e29b-41d4-a716-446655440000", "770e8400-e29b-41d4-a716-446655440000"]
 *                 description: Array of UUIDs for existing reference images (alternative to file upload)
 *               promptTemplateId:
 *                 type: string
 *                 format: uuid
 *                 example: 880e8400-e29b-41d4-a716-446655440000
 *                 description: Optional prompt template ID for styling (system prompt + user prompt)
 *               aspectRatio:
 *                 type: string
 *                 example: 1:1
 *                 description: Image aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)
 *               numberOfImages:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 4
 *                 default: 1
 *                 example: 1
 *                 description: Number of images to generate (1-4)
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional project ID to associate generation
 *     responses:
 *       202:
 *         description: Multiple reference generation job queued successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 jobId: "12345"
 *                 generationId: "550e8400-e29b-41d4-a716-446655440000"
 *                 targetImageId: "660e8400-e29b-41d4-a716-446655440000"
 *                 referenceImageIds: ["770e8400-e29b-41d4-a716-446655440000", "880e8400-e29b-41d4-a716-446655440000"]
 *                 status: "pending"
 *                 message: "Multiple reference generation job queued successfully"
 *                 websocketEvents:
 *                   progress: "generation_progress"
 *                   completed: "generation_completed"
 *                   failed: "generation_failed"
 *       400:
 *         description: Validation error or missing images
 */
router.post(
  "/image-multiple-reference",
  verifyToken,
  uploadMultipleReference,
  validateImageMultipleReference,
  validateRequestWithCleanup,
  asyncHandler(imageMultipleReference)
);

export default router;
