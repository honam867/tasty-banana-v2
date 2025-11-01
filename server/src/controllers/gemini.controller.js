import lodash from "lodash";
const { get } = lodash;

import fs from "fs";
import { getOperationTypeByName } from "../services/operationType.service.js";
import {
  queueService,
  QUEUE_NAMES,
  JOB_TYPES,
  JOB_PRIORITY,
} from "../services/queue/index.js";
import {
  HTTP_STATUS,
  GENERATION_STATUS,
  UPLOAD_PURPOSE,
  TEMP_FILE_CONFIG,
} from "../utils/constant.js";
import { sendSuccess, throwError } from "../utils/response.js";
import {
  createGenerationRecord,
  updateGenerationRecord,
  handleGeminiError,
  saveToStorage,
} from "../utils/gemini.helper.js";
import tempFileManager from "../utils/tempFileManager.js";
import logger from "../config/logger.js";

export const textToImage = async (req, res) => {
  let generationId = null;

  try {
    const userId = get(req, "user.id");

    const prompt = get(req.body, "prompt");
    const aspectRatio = get(req.body, "aspectRatio", "1:1");
    const numberOfImages = parseInt(get(req.body, "numberOfImages", "1"), 10);
    const projectId = get(req.body, "projectId");
    const promptTemplateId = get(req.body, "promptTemplateId"); // Optional style enhancement

    if (!prompt) {
      throwError("Prompt is required", HTTP_STATUS.BAD_REQUEST);
    }

    // Get operation type from database
    const operationType = await getOperationTypeByName("text_to_image");
    if (!operationType) {
      logger.error("Operation type 'text_to_image' not found in database");
      throwError(
        "Operation type not available",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // Sanitize prompt
    const sanitizedPrompt = prompt
      .trim()
      .replace(/<script[^>]*>.*?<\/script>/gi, "");

    // Create generation record with PENDING status (not PROCESSING yet)
    generationId = await createGenerationRecord(
      userId,
      operationType.id,
      sanitizedPrompt,
      {
        originalPrompt: sanitizedPrompt,
        aspectRatio,
        numberOfImages,
        projectId,
      }
    );

    // Ensure queue exists (or get existing one)
    if (!queueService.hasQueue(QUEUE_NAMES.IMAGE_GENERATION)) {
      queueService.createQueue(QUEUE_NAMES.IMAGE_GENERATION);
    }

    // Add job to queue for background processing
    const job = await queueService.addJob(
      QUEUE_NAMES.IMAGE_GENERATION,
      JOB_TYPES.IMAGE_GENERATION.TEXT_TO_IMAGE,
      {
        userId,
        generationId,
        prompt: sanitizedPrompt,
        numberOfImages,
        aspectRatio,
        projectId,
        promptTemplateId, // Pass template ID to processor
        operationTypeTokenCost: operationType.tokensPerOperation, // Pass token cost from database
      },
      {
        priority: JOB_PRIORITY.NORMAL,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );

    logger.info(
      `Text-to-image job queued for user ${userId}: job ${job.id}, generation ${generationId}, numberOfImages: ${numberOfImages}`
    );

    // Return immediately with 202 Accepted
    sendSuccess(
      res,
      {
        jobId: job.id,
        generationId,
        status: GENERATION_STATUS.PENDING,
        message:
          "Image generation job queued successfully. Listen to WebSocket for progress updates.",
        numberOfImages,
        metadata: {
          prompt: sanitizedPrompt,
          aspectRatio,
          projectId,
        },
        websocketEvents: {
          progress: "generation_progress",
          completed: "generation_completed",
          failed: "generation_failed",
        },
        statusEndpoint: `/api/generate/queue/${generationId}`,
      },
      "Job queued successfully",
      202 // HTTP 202 Accepted
    );
  } catch (error) {
    // Update generation record with error
    if (generationId) {
      await updateGenerationRecord(generationId, {
        status: GENERATION_STATUS.FAILED,
        errorMessage: error.message,
      });
    }

    logger.error("Text-to-image job queue error:", error);
    const geminiError = handleGeminiError(error);
    throwError(geminiError.message, geminiError.status);
  }
};

/**
 * POST /api/generate/image-reference
 * Generate image using a reference image (upload OR referenceImageId)
 */
export const imageReference = async (req, res) => {
  let generationId = null;
  let uploadedFile = null;
  let tempFileId = null;

  try {
    const userId = get(req, "user.id");
    const prompt = get(req.body, "prompt");
    let referenceImageId = get(req.body, "referenceImageId"); // Optional UUID
    const referenceType = get(req.body, "referenceType"); // 'subject', 'face', 'full_image'
    const aspectRatio = get(req.body, "aspectRatio", "1:1");
    const numberOfImages = parseInt(get(req.body, "numberOfImages", "1"), 10);
    const projectId = get(req.body, "projectId");

    // Get uploaded file (if any)
    uploadedFile = get(req, "file");

    // Validation: Must provide EITHER file upload OR referenceImageId
    if (!uploadedFile && !referenceImageId) {
      throwError(
        "Either upload an image file or provide referenceImageId",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (!prompt) throwError("Prompt is required", HTTP_STATUS.BAD_REQUEST);
    if (!referenceType)
      throwError("Reference type is required", HTTP_STATUS.BAD_REQUEST);

    // If file uploaded, save to storage AND temp storage for optimization
    if (uploadedFile) {
      // Save to R2 for database record
      const uploadRecord = await saveToStorage({
        filePath: uploadedFile.path,
        userId,
        purpose: UPLOAD_PURPOSE.GENERATION_INPUT,
        title: `Reference image for: ${prompt.substring(0, 50)}`,
        metadata: {
          originalName: uploadedFile.originalname,
          referenceType,
        },
      });

      referenceImageId = uploadRecord.id;
      logger.info(`Uploaded reference image to R2: ${referenceImageId}`);

      // Store in temp manager for processing (avoid re-downloading from R2)
      tempFileId = await tempFileManager.storeTempFile(
        uploadedFile.path,
        {
          userId,
          uploadId: referenceImageId,
          purpose: TEMP_FILE_CONFIG.PURPOSE.REFERENCE_IMAGE,
          referenceType,
        }
      );
      logger.info(`Stored temp file for processing: ${tempFileId}`);

      // Cleanup uploaded file after copying to temp
      if (fs.existsSync(uploadedFile.path)) {
        fs.unlinkSync(uploadedFile.path);
      }
    }

    // Get operation type from database
    const operationType = await getOperationTypeByName("image_reference");
    if (!operationType) {
      throwError(
        "Operation type not available",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // Sanitize prompt
    const sanitizedPrompt = prompt
      .trim()
      .replace(/<script[^>]*>.*?<\/script>/gi, "");

    // Create generation record
    generationId = await createGenerationRecord(
      userId,
      operationType.id,
      sanitizedPrompt,
      {
        originalPrompt: sanitizedPrompt,
        aspectRatio,
        numberOfImages,
        projectId,
        referenceImageId,
        referenceType,
      }
    );

    // Ensure queue exists
    if (!queueService.hasQueue(QUEUE_NAMES.IMAGE_GENERATION)) {
      queueService.createQueue(QUEUE_NAMES.IMAGE_GENERATION);
    }

    // Add job to queue
    const job = await queueService.addJob(
      QUEUE_NAMES.IMAGE_GENERATION,
      JOB_TYPES.IMAGE_GENERATION.IMAGE_REFERENCE,
      {
        userId,
        generationId,
        prompt: sanitizedPrompt,
        referenceImageId,
        referenceType,
        numberOfImages,
        aspectRatio,
        projectId,
        operationTypeTokenCost: operationType.tokensPerOperation,
        tempFileId, // Pass temp file ID if file was uploaded (null if using existing referenceImageId)
      },
      {
        priority: JOB_PRIORITY.NORMAL,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      }
    );

    logger.info(
      `Image reference job queued: ${job.id}, generation ${generationId}`
    );

    sendSuccess(
      res,
      {
        jobId: job.id,
        generationId,
        referenceImageId,
        status: GENERATION_STATUS.PENDING,
        message: "Image reference generation queued successfully",
        numberOfImages,
        metadata: {
          prompt: sanitizedPrompt,
          referenceType,
          aspectRatio,
          projectId,
          uploadedNewImage: !!uploadedFile,
        },
        websocketEvents: {
          progress: "generation_progress",
          completed: "generation_completed",
          failed: "generation_failed",
        },
        statusEndpoint: `/api/generate/queue/${generationId}`,
      },
      "Job queued successfully",
      202
    );
  } catch (error) {
    // Cleanup uploaded file on error
    if (uploadedFile?.path && fs.existsSync(uploadedFile.path)) {
      fs.unlinkSync(uploadedFile.path);
    }

    // Cleanup temp file on error
    if (tempFileId) {
      tempFileManager.cleanup(tempFileId);
    }

    if (generationId) {
      await updateGenerationRecord(generationId, {
        status: GENERATION_STATUS.FAILED,
        errorMessage: error.message,
      });
    }

    logger.error("Image reference job queue error:", error);
    const geminiError = handleGeminiError(error);
    throwError(geminiError.message, geminiError.status);
  }
};

