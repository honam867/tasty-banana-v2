import lodash from "lodash";
const { get } = lodash;

import { db } from "../db/drizzle.js";
import { imageGenerations, uploads } from "../db/schema.js";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import GeminiService from "../services/gemini/GeminiService.js";
import PromptTemplates from "../services/gemini/promptTemplates.js";
import {
  getOperationsWithPricing,
  getOperationTypeByName,
} from "../services/operationType.service.js";
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
} from "../utils/constant.js";
import { sendSuccess, throwError } from "../utils/response.js";
import {
  createGenerationRecord,
  updateGenerationRecord,
  saveToStorage,
  saveMultipleToStorage,
  handleGeminiError,
} from "../utils/gemini.helper.js";
import { cleanupFile } from "../utils/file.helper.js";
import logger from "../config/logger.js";

/**
 * GET /api/generate/operations - List available operations with pricing from database
 */
export const getOperations = async (req, res, next) => {
  try {
    // Fetch operations with pricing from database
    const operations = await getOperationsWithPricing();

    if (!operations || operations.length === 0) {
      logger.warn("No token pricing found in database");
      return sendSuccess(res, [], "No operations available");
    }

    sendSuccess(res, operations, "Available operations retrieved");
  } catch (error) {
    logger.error("Get operations error:", error);
    next(error);
  }
};

/**
 * GET /api/generate/templates - List available templates
 */
export const getTemplates = async (req, res, next) => {
  try {
    const templates = {
      simple: {
        remove_background: "Remove background, make it pure white",
        flip_horizontal: "Flip horizontally (mirror)",
        flip_vertical: "Flip vertically",
        enhance_lighting: "Brighten and improve lighting",
        add_shadows: "Add soft shadows underneath",
        center_product: "Center product in frame",
        sharpen_details: "Sharpen for clarity",
        enhance_colors: "Make colors more vibrant",
      },
      complex: {
        complete_transformation:
          "Full image transformation with professional quality",
        background_scene_change: "Change background while maintaining lighting",
        lighting_enhancement: "Professional lighting corrections",
        color_correction: "Color balance and enhancement",
      },
      composition: {
        product_lifestyle: "Products in natural lifestyle settings",
        product_grouping: "Professional group shots of multiple products",
        scene_creation: "Custom scenes with product context",
      },
      styleTransfer: {
        artistic_style: "Apply artistic style while maintaining clarity",
        mood_transfer: "Transfer mood and atmosphere",
        aesthetic_enhancement: "Enhance with aesthetic qualities",
      },
    };

    sendSuccess(res, templates, "Templates retrieved successfully");
  } catch (error) {
    logger.error("Get templates error:", error);
    next(error);
  }
};

/**
 * POST /api/generate/text-to-image - Generate image from text (Background Job)
 * Returns immediately with job ID. Generation happens in background.
 * Client should listen to WebSocket for progress updates.
 */
export const textToImage = async (req, res) => {
  let generationId = null;

  try {
    const userId = get(req, "user.id");

    const prompt = get(req.body, "prompt");
    const aspectRatio = get(req.body, "aspectRatio", "1:1");
    const numberOfImages = parseInt(get(req.body, "numberOfImages", "1"), 10);
    const projectId = get(req.body, "projectId");

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
        message: "Image generation job queued successfully. Listen to WebSocket for progress updates.",
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
 * GET /api/generate/queue/:generationId - Get generation status
 * Returns the current status and progress of a generation job
 */
export const getGenerationStatus = async (req, res, next) => {
  try {
    const userId = get(req, "user.id");
    const { generationId } = req.params;

    if (!generationId) {
      throwError("Generation ID is required", HTTP_STATUS.BAD_REQUEST);
    }

    // Fetch generation record from database
    const generation = await db
      .select()
      .from(imageGenerations)
      .where(
        and(
          eq(imageGenerations.id, generationId),
          eq(imageGenerations.userId, userId) // Authorization check
        )
      )
      .limit(1);

    if (!generation.length) {
      throwError("Generation not found or access denied", HTTP_STATUS.NOT_FOUND);
    }

    const generationData = generation[0];

    // Try to get job status from queue if still processing
    let jobStatus = null;
    let progress = 0;
    
    if (generationData.status === GENERATION_STATUS.PENDING || 
        generationData.status === GENERATION_STATUS.PROCESSING) {
      try {
        // Note: We'd need to store jobId in the generation record to fetch this
        // For now, we'll just use the database status
        progress = generationData.status === GENERATION_STATUS.PENDING ? 0 : 50;
      } catch (error) {
        logger.warn("Could not fetch job status from queue:", error);
      }
    } else if (generationData.status === GENERATION_STATUS.COMPLETED) {
      progress = 100;
    }

    // Parse metadata and AI metadata
    const metadata = generationData.metadata ? JSON.parse(generationData.metadata) : {};
    const aiMetadata = generationData.aiMetadata ? JSON.parse(generationData.aiMetadata) : {};

    // Build response
    const response = {
      generationId: generationData.id,
      status: generationData.status,
      progress,
      createdAt: generationData.createdAt,
      completedAt: generationData.completedAt,
      metadata: {
        prompt: metadata.originalPrompt,
        numberOfImages: metadata.numberOfImages || 1,
        aspectRatio: metadata.aspectRatio || "1:1",
        projectId: metadata.projectId,
      },
      tokensUsed: generationData.tokensUsed,
      processingTimeMs: generationData.processingTimeMs,
    };

    // Add images if completed
    if (generationData.status === GENERATION_STATUS.COMPLETED && aiMetadata.imageIds) {
      // Fetch upload records for the images
      const imageIds = aiMetadata.imageIds;
      const images = await db
        .select()
        .from(uploads)
        .where(inArray(uploads.id, imageIds));
      
      response.images = images.map(img => ({
        imageId: img.id,
        imageUrl: img.publicUrl,
        mimeType: img.mimeType,
        sizeBytes: img.sizeBytes,
      }));
    }

    // Add error if failed
    if (generationData.status === GENERATION_STATUS.FAILED) {
      response.error = generationData.errorMessage;
    }

    sendSuccess(res, response, "Generation status retrieved successfully");
  } catch (error) {
    logger.error("Get generation status error:", error);
    next(error);
  }
};

/**
 * GET /api/generate/my-queue - Get user's active generation queue
 * Returns all pending and processing generations for the current user
 */
export const getUserQueue = async (req, res, next) => {
  try {
    const userId = get(req, "user.id");
    const limit = Math.min(parseInt(get(req.query, "limit", "20"), 10), 100);
    const offset = parseInt(get(req.query, "offset", "0"), 10);

    // Fetch active generations (pending or processing)
    const activeGenerations = await db
      .select()
      .from(imageGenerations)
      .where(
        and(
          eq(imageGenerations.userId, userId),
          inArray(imageGenerations.status, [
            GENERATION_STATUS.PENDING,
            GENERATION_STATUS.PROCESSING,
          ])
        )
      )
      .orderBy(desc(imageGenerations.createdAt))
      .limit(limit)
      .offset(offset);

    // Format response
    const queue = activeGenerations.map((gen) => {
      const metadata = gen.metadata ? JSON.parse(gen.metadata) : {};
      
      return {
        generationId: gen.id,
        status: gen.status,
        progress: gen.status === GENERATION_STATUS.PENDING ? 0 : 50,
        createdAt: gen.createdAt,
        metadata: {
          prompt: metadata.originalPrompt || "Image generation",
          numberOfImages: metadata.numberOfImages || 1,
          aspectRatio: metadata.aspectRatio || "1:1",
          projectId: metadata.projectId,
        },
      };
    });

    // Get total count
    const totalCount = await db
      .select({ count: sql`count(*)` })
      .from(imageGenerations)
      .where(
        and(
          eq(imageGenerations.userId, userId),
          inArray(imageGenerations.status, [
            GENERATION_STATUS.PENDING,
            GENERATION_STATUS.PROCESSING,
          ])
        )
      );

    sendSuccess(res, {
      queue,
      pagination: {
        total: parseInt(totalCount[0].count, 10),
        limit,
        offset,
        hasMore: offset + limit < parseInt(totalCount[0].count, 10),
      },
    }, "User queue retrieved successfully");
  } catch (error) {
    logger.error("Get user queue error:", error);
    next(error);
  }
};

/**
 * POST /api/generate/edit-simple - Simple image editing
 */
// export const editSimple = async (req, res) => {
//   let generationId = null;
//   let inputUploadRecord = null;

//   try {
//     const userId = get(req, "user.id");

//     const file = get(req, "file");
//     if (!file) {
//       throwError("Image file is required", HTTP_STATUS.BAD_REQUEST);
//     }

//     const prompt = get(req.body, "prompt");
//     const template = get(req.body, "template");
//     const projectId = get(req.body, "projectId");

//     if (!prompt && !template) {
//       throwError(
//         "Either prompt or template must be provided",
//         HTTP_STATUS.BAD_REQUEST
//       );
//     }

//     const imagePath = file.path;

//     // Sanitize prompt if provided
//     const sanitizedPrompt = prompt
//       ? prompt.trim().replace(/<script[^>]*>.*?<\/script>/gi, "")
//       : "";

//     // Use template if provided, otherwise use custom prompt
//     const editPrompt = template
//       ? PromptTemplates.simpleEdit(template, sanitizedPrompt)
//       : sanitizedPrompt;

//     // Create generation record
//     generationId = await createGenerationRecord(
//       userId,
//       IMAGE_OPERATION_TYPES.IMAGE_EDIT_SIMPLE,
//       editPrompt,
//       {
//         originalPrompt: sanitizedPrompt,
//         template,
//         projectId,
//         inputFileName: file.originalname,
//       }
//     );

//     // Upload input image to storage
//     try {
//       inputUploadRecord = await saveToStorage({
//         filePath: imagePath,
//         userId,
//         purpose: UPLOAD_PURPOSE.GENERATION_INPUT,
//         title: `Input: ${file.originalname}`,
//         metadata: { generationId },
//       });
//     } catch (uploadError) {
//       logger.warn("Failed to upload input image:", uploadError);
//     }

//     // Update generation status
//     await updateGenerationRecord(generationId, {
//       status: GENERATION_STATUS.PROCESSING,
//       inputImageId: inputUploadRecord?.id,
//     });

//     logger.info(`Starting simple edit for user ${userId}: ${generationId}`);

//     // Execute editing
//     const result = await GeminiService.editImageSimple(
//       userId,
//       imagePath,
//       editPrompt,
//       {
//         metadata: { template, customPrompt: !template, generationId },
//       }
//     );

//     // Upload result to storage
//     const outputUploadRecord = await saveToStorage({
//       source: result.result,
//       userId,
//       purpose: UPLOAD_PURPOSE.GENERATION_OUTPUT,
//       title: `Edited: ${file.originalname} (${template || "custom"})`,
//       metadata: {
//         generationId,
//         template,
//         editType: template || "custom",
//       },
//     });

//     // Final generation update
//     await updateGenerationRecord(generationId, {
//       status: GENERATION_STATUS.COMPLETED,
//       inputImageId: inputUploadRecord?.id,
//       outputImageId: outputUploadRecord.id,
//       tokensUsed: result.tokensUsed,
//       processingTimeMs: result.processingTimeMs,
//       aiMetadata: JSON.stringify({
//         inputFileName: file.originalname,
//         template,
//         prompt: sanitizedPrompt,
//         editPrompt,
//         inputUploadId: inputUploadRecord?.id,
//       }),
//     });

//     logger.info(`Simple edit completed for user ${userId}: ${generationId}`);

//     // Cleanup temp file
//     cleanupFile(imagePath);

//     // Enhanced response
//     const enhancedResult = {
//       generationId,
//       imageUrl: outputUploadRecord.publicUrl,
//       imageId: outputUploadRecord.id,
//       inputImage: {
//         url: inputUploadRecord?.publicUrl || null,
//         id: inputUploadRecord?.id || null,
//       },
//       metadata: {
//         prompt: sanitizedPrompt,
//         template,
//         editType: template || "custom",
//         originalFileName: file.originalname,
//         mimeType: result.result.mimeType,
//         imageSize: result.result.size,
//       },
//       tokens: {
//         used: result.tokensUsed,
//         remaining: result.remainingBalance,
//       },
//       processing: {
//         timeMs: result.processingTimeMs,
//         status: GENERATION_STATUS.COMPLETED,
//       },
//       createdAt: new Date().toISOString(),
//     };

//     sendSuccess(res, enhancedResult, "Image edited successfully");
//   } catch (error) {
//     // Update generation record with error
//     if (generationId) {
//       await updateGenerationRecord(generationId, {
//         status: GENERATION_STATUS.FAILED,
//         errorMessage: error.message,
//         inputImageId: inputUploadRecord?.id,
//       });
//     }

//     // Cleanup temp file
//     const file = get(req, "file");
//     if (file) cleanupFile(file.path);

//     logger.error("Simple edit error:", error);
//     const geminiError = handleGeminiError(error);
//     throwError(geminiError.message, geminiError.status);
//   }
// };

/**
 * POST /api/generate/quick-action - Quick action operations
 */
// export const quickAction = async (req, res) => {
//   let generationId = null;
//   let inputUploadRecord = null;

//   try {
//     const userId = get(req, "user.id");

//     const file = get(req, "file");
//     if (!file) {
//       throwError("Image file is required", HTTP_STATUS.BAD_REQUEST);
//     }

//     const action = get(req.body, "action");
//     const customPrompt = get(req.body, "customPrompt");
//     const projectId = get(req.body, "projectId");

//     if (!action) {
//       throwError("Action is required", HTTP_STATUS.BAD_REQUEST);
//     }

//     const imagePath = file.path;

//     // Get action description
//     const actionDescriptions = {
//       remove_background: "Remove background, make it pure white",
//       flip_horizontal: "Flip horizontally (mirror image)",
//       flip_vertical: "Flip vertically",
//       enhance_lighting: "Brighten and improve professional lighting",
//       add_shadows: "Add soft professional shadows underneath",
//       center_product: "Center product in frame",
//       sharpen_details: "Sharpen for better clarity and details",
//       enhance_colors: "Make colors slightly more vibrant and professional",
//     };

//     const actionDescription = actionDescriptions[action] || action;

//     // Create generation record
//     generationId = await createGenerationRecord(
//       userId,
//       IMAGE_OPERATION_TYPES.QUICK_ACTION,
//       actionDescription,
//       {
//         actionType: action,
//         customPrompt,
//         projectId,
//         inputFileName: file.originalname,
//         isQuickAction: true,
//       }
//     );

//     // Upload input image to storage
//     try {
//       inputUploadRecord = await saveToStorage({
//         filePath: imagePath,
//         userId,
//         purpose: UPLOAD_PURPOSE.GENERATION_INPUT,
//         title: `Input: ${file.originalname}`,
//         metadata: { generationId },
//       });
//     } catch (uploadError) {
//       logger.warn("Failed to upload input image:", uploadError);
//     }

//     // Update generation status
//     await updateGenerationRecord(generationId, {
//       status: GENERATION_STATUS.PROCESSING,
//       inputImageId: inputUploadRecord?.id,
//     });

//     logger.info(
//       `Starting quick action ${action} for user ${userId}: ${generationId}`
//     );

//     // Execute quick action
//     const result = await GeminiService.quickAction(userId, imagePath, action, {
//       customPrompt,
//       metadata: { action, generationId, isQuickAction: true },
//     });

//     // Upload result to storage
//     const outputUploadRecord = await saveToStorage({
//       source: result.result,
//       userId,
//       purpose: UPLOAD_PURPOSE.GENERATION_OUTPUT,
//       title: `Quick Action: ${action} - ${file.originalname}`,
//       metadata: {
//         generationId,
//         action,
//         actionType: "quick_action",
//       },
//     });

//     // Final generation update
//     await updateGenerationRecord(generationId, {
//       status: GENERATION_STATUS.COMPLETED,
//       inputImageId: inputUploadRecord?.id,
//       outputImageId: outputUploadRecord.id,
//       tokensUsed: result.tokensUsed,
//       processingTimeMs: result.processingTimeMs,
//       aiMetadata: JSON.stringify({
//         inputFileName: file.originalname,
//         action,
//         customPrompt,
//         actionDescription,
//         inputUploadId: inputUploadRecord?.id,
//       }),
//     });

//     logger.info(
//       `Quick action ${action} completed for user ${userId}: ${generationId}`
//     );

//     // Cleanup temp file
//     cleanupFile(imagePath);

//     // Enhanced response
//     const enhancedResult = {
//       generationId,
//       imageUrl: outputUploadRecord.publicUrl,
//       imageId: outputUploadRecord.id,
//       inputImage: {
//         url: inputUploadRecord?.publicUrl || null,
//         id: inputUploadRecord?.id || null,
//       },
//       metadata: {
//         action,
//         actionDescription,
//         customPrompt,
//         originalFileName: file.originalname,
//         actionType: "quick_action",
//         mimeType: result.result.mimeType,
//         imageSize: result.result.size,
//       },
//       tokens: {
//         used: result.tokensUsed,
//         remaining: result.remainingBalance,
//       },
//       processing: {
//         timeMs: result.processingTimeMs,
//         status: GENERATION_STATUS.COMPLETED,
//       },
//       createdAt: new Date().toISOString(),
//     };

//     sendSuccess(res, enhancedResult, "Quick action completed successfully");
//   } catch (error) {
//     // Update generation record with error
//     if (generationId) {
//       await updateGenerationRecord(generationId, {
//         status: GENERATION_STATUS.FAILED,
//         errorMessage: error.message,
//         inputImageId: inputUploadRecord?.id,
//       });
//     }

//     // Cleanup temp file
//     const file = get(req, "file");
//     if (file) cleanupFile(file.path);

//     logger.error("Quick action error:", error);
//     const geminiError = handleGeminiError(error);
//     throwError(geminiError.message, geminiError.status);
//   }
// };

/**
 * POST /api/generate/edit-complex - Complex image editing
 */
// export const editComplex = async (req, res) => {
//   let imagePath = null;

//   try {
//     const userId = get(req, "user.id");

//     const file = get(req, "file");
//     if (!file) {
//       throwError("Image file is required", HTTP_STATUS.BAD_REQUEST);
//     }

//     const prompt = get(req.body, "prompt");
//     const scenario = get(req.body, "scenario");

//     if (!prompt) {
//       throwError("Prompt is required", HTTP_STATUS.BAD_REQUEST);
//     }

//     imagePath = file.path;

//     const complexPrompt = scenario
//       ? PromptTemplates.complexEdit(scenario, prompt)
//       : PromptTemplates.complexEdit("custom", prompt);

//     logger.info(`Starting complex edit for user ${userId}`);

//     const result = await GeminiService.editImageComplex(
//       userId,
//       imagePath,
//       complexPrompt,
//       {
//         metadata: { scenario },
//       }
//     );

//     logger.info(`Complex edit completed for user ${userId}`);

//     cleanupFile(imagePath);
//     sendSuccess(res, result, "Complex edit completed successfully");
//   } catch (error) {
//     if (imagePath) cleanupFile(imagePath);
//     logger.error("Complex edit error:", error);
//     next(error);
//   }
// };

/**
 * POST /api/generate/compose - Multi-image composition
 */
// export const compose = async (req, res, next) => {
//   let imagePaths = [];

//   try {
//     const userId = get(req, "user.id");

//     const files = get(req, "files");
//     if (!files || files.length < 2) {
//       throwError(
//         "At least 2 images are required for composition",
//         HTTP_STATUS.BAD_REQUEST
//       );
//     }

//     const prompt = get(req.body, "prompt");
//     const scenario = get(req.body, "scenario");

//     if (!prompt) {
//       throwError("Prompt is required", HTTP_STATUS.BAD_REQUEST);
//     }

//     imagePaths = files.map((file) => file.path);

//     const compositionPrompt = scenario
//       ? PromptTemplates.composition(scenario, prompt)
//       : PromptTemplates.composition("custom", prompt);

//     logger.info(
//       `Starting composition for user ${userId} with ${imagePaths.length} images`
//     );

//     const result = await GeminiService.composeMultipleImages(
//       userId,
//       imagePaths,
//       compositionPrompt,
//       {
//         metadata: { scenario, imageCount: imagePaths.length },
//       }
//     );

//     logger.info(`Composition completed for user ${userId}`);

//     imagePaths.forEach((path) => cleanupFile(path));
//     sendSuccess(res, result, "Images composed successfully");
//   } catch (error) {
//     imagePaths.forEach((path) => cleanupFile(path));
//     logger.error("Composition error:", error);
//     next(error);
//   }
// };

/**
 * POST /api/generate/style-transfer - Style transfer
 */
// export const styleTransfer = async (req, res, next) => {
//   let contentImagePath = null;
//   let styleImagePath = null;

//   try {
//     const userId = get(req, "user.id");

//     const files = get(req, "files");
//     if (!files?.contentImage?.[0] || !files?.styleImage?.[0]) {
//       throwError(
//         "Both content and style images are required",
//         HTTP_STATUS.BAD_REQUEST
//       );
//     }

//     const scenario = get(req.body, "scenario");
//     const customPrompt = get(req.body, "customPrompt");

//     contentImagePath = files.contentImage[0].path;
//     styleImagePath = files.styleImage[0].path;

//     logger.info(`Starting style transfer for user ${userId}`);

//     const result = await GeminiService.styleTransfer(
//       userId,
//       contentImagePath,
//       styleImagePath,
//       {
//         scenario,
//         customPrompt,
//       }
//     );

//     logger.info(`Style transfer completed for user ${userId}`);

//     cleanupFile(contentImagePath);
//     cleanupFile(styleImagePath);
//     sendSuccess(res, result, "Style transfer completed successfully");
//   } catch (error) {
//     if (contentImagePath) cleanupFile(contentImagePath);
//     if (styleImagePath) cleanupFile(styleImagePath);
//     logger.error("Style transfer error:", error);
//     next(error);
//   }
// };

/**
 * POST /api/generate/text-rendering - Generate images with text
 */
// export const textRendering = async (req, res, next) => {
//   try {
//     const userId = get(req, "user.id");

//     const text = get(req.body, "text");
//     const designPrompt = get(req.body, "designPrompt");
//     const designStyle = get(req.body, "designStyle");

//     if (!text || !designPrompt) {
//       throwError(
//         "Text content and design prompt are required",
//         HTTP_STATUS.BAD_REQUEST
//       );
//     }

//     if (text.length > 200) {
//       throwError(
//         "Text too long. Maximum 200 characters",
//         HTTP_STATUS.BAD_REQUEST
//       );
//     }

//     logger.info(`Starting text rendering for user ${userId}`);

//     const result = await GeminiService.generateWithText(
//       userId,
//       text,
//       designPrompt,
//       {
//         metadata: { textLength: text.length, designStyle },
//       }
//     );

//     logger.info(`Text rendering completed for user ${userId}`);

//     sendSuccess(res, result, "Text image generated successfully");
//   } catch (error) {
//     logger.error("Text rendering error:", error);
//     next(error);
//   }
// };
