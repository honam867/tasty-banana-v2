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
    const model = get(req.body, "model"); // Optional model selection

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
        model,
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
        model, // Pass model selection to processor
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
    const model = get(req.body, "model"); // Optional model selection

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
        model,
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
        model, // Pass model selection to processor
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

/**
 * POST /api/generate/image-multiple-reference
 * Generate image using target image + multiple reference images
 * Supports dual input: file upload OR reference IDs OR mixed
 */
export const imageMultipleReference = async (req, res) => {
  let generationId = null;
  let uploadedFiles = null;
  let tempFileIds = [];

  try {
    const userId = get(req, "user.id");
    const prompt = get(req.body, "prompt");
    let targetImageId = get(req.body, "targetImageId");
    let referenceImageIds = get(req.body, "referenceImageIds");
    const promptTemplateId = get(req.body, "promptTemplateId");
    const aspectRatio = get(req.body, "aspectRatio", "1:1");
    const numberOfImages = parseInt(get(req.body, "numberOfImages", "1"), 10);
    const projectId = get(req.body, "projectId");
    const model = get(req.body, "model");

    // Get uploaded files (if any)
    uploadedFiles = get(req, "files");

    // Extract target and reference images from uploaded files
    const targetImageFile = uploadedFiles?.targetImage?.[0];
    const referenceImageFiles = uploadedFiles?.referenceImages || [];

    // Parse referenceImageIds if it's a JSON string
    if (referenceImageIds && typeof referenceImageIds === 'string') {
      try {
        referenceImageIds = JSON.parse(referenceImageIds);
      } catch (error) {
        throwError("Invalid referenceImageIds format", HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Validation: Must provide target image (file OR ID)
    if (!targetImageFile && !targetImageId) {
      throwError(
        "Either upload targetImage file or provide targetImageId",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Validation: Must provide at least 1 reference image (files OR IDs)
    const totalReferences = referenceImageFiles.length + (referenceImageIds ? referenceImageIds.length : 0);
    if (totalReferences < 1) {
      throwError(
        "At least 1 reference image is required (file or referenceImageId)",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (!prompt) throwError("Prompt is required", HTTP_STATUS.BAD_REQUEST);

    // Get operation type from database
    const operationType = await getOperationTypeByName("image_multiple_reference");
    if (!operationType) {
      logger.error("Operation type 'image_multiple_reference' not found in database");
      throwError(
        "Operation type not available. Please ensure database is seeded.",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // Process target image upload (if provided)
    if (targetImageFile) {
      const uploadRecord = await saveToStorage({
        filePath: targetImageFile.path,
        userId,
        purpose: UPLOAD_PURPOSE.GENERATION_INPUT,
        title: `Target image for: ${prompt.substring(0, 50)}`,
        metadata: {
          originalName: targetImageFile.originalname,
          purpose: 'target',
        },
      });

      targetImageId = uploadRecord.id;
      logger.info(`Uploaded target image to R2: ${targetImageId}`);

      // Store in temp manager for optimization
      const tempId = await tempFileManager.storeTempFile(
        targetImageFile.path,
        {
          userId,
          uploadId: targetImageId,
          purpose: 'target_image',
        }
      );
      tempFileIds.push({ id: tempId, type: 'target' });

      // Cleanup multer uploaded file
      if (fs.existsSync(targetImageFile.path)) {
        fs.unlinkSync(targetImageFile.path);
      }
    }

    // Process reference image uploads (if provided)
    const uploadedReferenceIds = [];
    for (const refFile of referenceImageFiles) {
      const uploadRecord = await saveToStorage({
        filePath: refFile.path,
        userId,
        purpose: UPLOAD_PURPOSE.GENERATION_INPUT,
        title: `Reference image for: ${prompt.substring(0, 50)}`,
        metadata: {
          originalName: refFile.originalname,
          purpose: 'reference',
        },
      });

      uploadedReferenceIds.push(uploadRecord.id);
      logger.info(`Uploaded reference image to R2: ${uploadRecord.id}`);

      // Store in temp manager
      const tempId = await tempFileManager.storeTempFile(
        refFile.path,
        {
          userId,
          uploadId: uploadRecord.id,
          purpose: TEMP_FILE_CONFIG.PURPOSE.REFERENCE_IMAGE,
        }
      );
      tempFileIds.push({ id: tempId, type: 'reference', uploadId: uploadRecord.id });

      // Cleanup multer uploaded file
      if (fs.existsSync(refFile.path)) {
        fs.unlinkSync(refFile.path);
      }
    }

    // Merge uploaded reference IDs with provided reference IDs
    const allReferenceImageIds = [
      ...uploadedReferenceIds,
      ...(referenceImageIds || [])
    ];

    if (allReferenceImageIds.length < 1 || allReferenceImageIds.length > 5) {
      throwError(
        "Total reference images must be between 1 and 5",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Sanitize prompt
    const sanitizedPrompt = prompt
      .trim()
      .replace(/<script[^>]*>.*?<\/script>/gi, "");

    // Create generation record with PENDING status
    generationId = await createGenerationRecord(
      userId,
      operationType.id,
      sanitizedPrompt,
      {
        originalPrompt: sanitizedPrompt,
        targetImageId,
        referenceImageIds: allReferenceImageIds,
        promptTemplateId,
        aspectRatio,
        numberOfImages,
        projectId,
        model,
      }
    );

    // Ensure queue exists
    if (!queueService.hasQueue(QUEUE_NAMES.IMAGE_GENERATION)) {
      queueService.createQueue(QUEUE_NAMES.IMAGE_GENERATION);
    }

    // Add job to queue for background processing
    const job = await queueService.addJob(
      QUEUE_NAMES.IMAGE_GENERATION,
      JOB_TYPES.IMAGE_GENERATION.IMAGE_MULTIPLE_REFERENCE,
      {
        userId,
        generationId,
        prompt: sanitizedPrompt,
        targetImageId,
        referenceImageIds: allReferenceImageIds,
        promptTemplateId,
        numberOfImages,
        aspectRatio,
        projectId,
        model,
        operationTypeTokenCost: operationType.tokensPerOperation,
        tempFileIds, // Pass temp file info for optimization
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
      `Multiple reference job queued for user ${userId}: job ${job.id}, generation ${generationId}, references: ${allReferenceImageIds.length}`
    );

    // Return immediately with 202 Accepted
    sendSuccess(
      res,
      {
        jobId: job.id,
        generationId,
        targetImageId,
        referenceImageIds: allReferenceImageIds,
        promptTemplateId,
        status: GENERATION_STATUS.PENDING,
        message: "Multiple reference generation job queued successfully",
        numberOfImages,
        metadata: {
          prompt: sanitizedPrompt,
          targetImageId,
          referenceCount: allReferenceImageIds.length,
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
      202
    );
  } catch (error) {
    // Cleanup uploaded files on error
    if (uploadedFiles) {
      const allFiles = [
        ...(uploadedFiles.targetImage || []),
        ...(uploadedFiles.referenceImages || [])
      ];
      allFiles.forEach(file => {
        if (file?.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    // Cleanup temp files on error
    tempFileIds.forEach(tempInfo => {
      tempFileManager.cleanup(tempInfo.id);
    });

    if (generationId) {
      await updateGenerationRecord(generationId, {
        status: GENERATION_STATUS.FAILED,
        errorMessage: error.message,
      });
    }

    logger.error("Multiple reference job queue error:", error);
    const geminiError = handleGeminiError(error);
    throwError(geminiError.message, geminiError.status);
  }
};

