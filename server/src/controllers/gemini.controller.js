import lodash from "lodash";
const { get } = lodash;

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
} from "../utils/constant.js";
import { sendSuccess, throwError } from "../utils/response.js";
import {
  createGenerationRecord,
  updateGenerationRecord,
  handleGeminiError,
} from "../utils/gemini.helper.js";
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

