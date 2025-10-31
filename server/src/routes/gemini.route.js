import express from "express";
import multer from "multer";
import { textToImage } from "../controllers/gemini.controller.js";
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
import // uploadSingle,
// uploadMultiple,
// uploadStyleTransfer,
"../middlewares/upload.js";
import { verifyToken } from "../middlewares/tokenHandler.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
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
