/**
 * Image Generation Queue Processor
 * Handles background processing of image generation jobs
 */

import GeminiService from "../../gemini/GeminiService.js";
import PromptTemplates from "../../gemini/promptTemplates.js";
import PromptTemplateService from "../../promptTemplate.service.js";
import {
  updateGenerationRecord,
  saveMultipleToStorage,
  handleGeminiError,
} from "../../../utils/gemini.helper.js";
import {
  emitGenerationProgress,
  emitGenerationCompleted,
  emitGenerationFailed,
} from "../../websocket/emitters/imageGeneration.emitter.js";
import { GENERATION_STATUS, UPLOAD_PURPOSE } from "../../../utils/constant.js";
import { generateReferencePrompt } from "../../../utils/imageReferencePrompts.js";
import { db } from "../../../db/drizzle.js";
import { uploads } from "../../../db/schema.js";
import { and, eq } from "drizzle-orm";
import tempFileManager from "../../../utils/tempFileManager.js";
import logger from "../../../config/logger.js";
import { buildMultipleReferencePrompt } from "../../../utils/multipleReferencePrompts.js";

/**
 * Process text-to-image generation job
 * @param {Object} job - BullMQ job object
 * @returns {Promise<Object>} - Job result
 */
export async function processTextToImage(job) {
  const {
    userId,
    generationId,
    prompt,
    numberOfImages = 1,
    aspectRatio = "1:1",
    projectId,
    promptTemplateId, // Optional: database template ID for style enhancement
    model, // Optional: model selection from client
    operationTypeTokenCost, // Token cost from database (operationType.tokenCost)
  } = job.data;

  logger.info(
    `Processing text-to-image job ${job.id} for generation ${generationId}`
  );

  try {
    // Step 1: Update status to PROCESSING (10% progress)
    await updateGenerationRecord(generationId, {
      status: GENERATION_STATUS.PROCESSING,
    });

    await job.updateProgress(10);
    emitGenerationProgress(
      userId,
      generationId,
      10,
      "Starting image generation..."
    );

    // Step 2: Sanitize and enhance prompt
    const sanitizedPrompt = prompt
      .trim()
      .replace(/<script[^>]*>.*?<\/script>/gi, "");

    // Step 2a: Fetch and apply database template if promptTemplateId is provided
    let enhancedPrompt = sanitizedPrompt;

    if (promptTemplateId) {
      try {
        const template = await PromptTemplateService.getById(promptTemplateId);
        if (template && template.isActive) {
          // Append template enhancement to user's prompt
          enhancedPrompt = `${sanitizedPrompt} ${template.prompt}`;
          logger.info(
            `Applied prompt template '${template.name}' to generation ${generationId}`
          );
        }
      } catch (error) {
        logger.warn(
          `Failed to fetch prompt template ${promptTemplateId}, using original prompt:`,
          error.message
        );
        // Continue with original prompt if template fetch fails
      }
    } else {
      // Fallback to hardcoded template (keep for backward compatibility)
      enhancedPrompt = PromptTemplates.textToImage(sanitizedPrompt);
    }

    await job.updateProgress(20);
    emitGenerationProgress(
      userId,
      generationId,
      20,
      "Prompt prepared, generating images..."
    );

    // Step 3: Generate all images sequentially
    logger.info(
      `Generating ${numberOfImages} images for generation ${generationId}`
    );
    const generationResults = [];
    let totalTokensUsed = 0;
    let totalProcessingTime = 0;
    let remainingBalance = 0;

    const progressPerImage = 60 / numberOfImages; // 60% total for generation

    for (let i = 0; i < numberOfImages; i++) {
      logger.info(`Generating image ${i + 1} of ${numberOfImages}`);

      const result = await GeminiService.textToImage(
        userId,
        operationTypeTokenCost,
        enhancedPrompt,
        {
          aspectRatio,
          modelName: model,
          metadata: {
            originalPrompt: sanitizedPrompt,
            projectId,
            generationId,
            imageNumber: i + 1,
            totalImages: numberOfImages,
          },
        }
      );

      generationResults.push({
        result: result.result,
        imageNumber: i + 1,
      });

      totalTokensUsed += result.tokensUsed;
      totalProcessingTime += result.processingTimeMs;
      remainingBalance = result.remainingBalance;

      // Update progress after each image
      const currentProgress = 20 + (i + 1) * progressPerImage;
      await job.updateProgress(currentProgress);
      emitGenerationProgress(
        userId,
        generationId,
        currentProgress,
        `Generated image ${i + 1} of ${numberOfImages}...`
      );
    }

    // Step 4: Upload all images concurrently to R2 (80-90% progress)
    await job.updateProgress(80);
    emitGenerationProgress(
      userId,
      generationId,
      80,
      "Uploading images to storage..."
    );

    logger.info(`Uploading ${numberOfImages} images concurrently to R2`);

    const imagesToUpload = generationResults.map((genResult) => ({
      source: genResult.result,
      userId,
      purpose: UPLOAD_PURPOSE.GENERATION_OUTPUT,
      title: `Generated: ${sanitizedPrompt.substring(0, 50)}... (${
        genResult.imageNumber
      }/${numberOfImages})`,
      metadata: {
        generationId,
        aspectRatio,
        imageNumber: genResult.imageNumber,
      },
    }));

    const uploadRecords = await saveMultipleToStorage(imagesToUpload);

    await job.updateProgress(90);
    emitGenerationProgress(
      userId,
      generationId,
      90,
      "Finalizing generation..."
    );

    // Step 5: Build response and update database
    const generatedImages = uploadRecords.map((uploadRecord, index) => ({
      imageUrl: uploadRecord.publicUrl,
      imageId: uploadRecord.id,
      mimeType: generationResults[index].result.mimeType,
      imageSize: generationResults[index].result.size,
    }));

    // Final generation update
    await updateGenerationRecord(generationId, {
      status: GENERATION_STATUS.COMPLETED,
      outputImageId: generatedImages[0].imageId, // First image as primary
      tokensUsed: totalTokensUsed,
      processingTimeMs: totalProcessingTime,
      aiMetadata: JSON.stringify({
        aspectRatio,
        numberOfImages,
        prompt: sanitizedPrompt,
        enhancedPrompt,
        promptTemplateId: promptTemplateId || null,
        imageIds: generatedImages.map((img) => img.imageId),
      }),
    });

    // Step 6: Complete job and emit success
    await job.updateProgress(100);

    const result = {
      generationId,
      images: generatedImages,
      numberOfImages,
      metadata: {
        prompt: sanitizedPrompt,
        aspectRatio,
      },
      tokens: {
        used: totalTokensUsed,
        remaining: remainingBalance,
      },
      processing: {
        timeMs: totalProcessingTime,
        status: GENERATION_STATUS.COMPLETED,
      },
      createdAt: new Date().toISOString(),
    };

    emitGenerationCompleted(userId, generationId, result);

    logger.info(
      `Text-to-image generation completed for job ${job.id}, generation ${generationId}, generated ${numberOfImages} images`
    );

    return result;
  } catch (error) {
    // Handle errors
    logger.error(`Text-to-image generation failed for job ${job.id}:`, error);

    // Update generation record with error
    await updateGenerationRecord(generationId, {
      status: GENERATION_STATUS.FAILED,
      errorMessage: error.message,
    });

    // Emit failure event
    const geminiError = handleGeminiError(error);
    emitGenerationFailed(userId, generationId, geminiError.message);

    // Re-throw to mark job as failed in queue
    throw error;
  }
}

/**
 * Process image reference generation job
 * Based on generateWithReference pattern from NANO_BANANA_SETUP_GUIDE.md
 * @param {Object} job - BullMQ job object
 * @returns {Promise<Object>} - Job result
 */
export async function processImageReference(job) {
  const {
    userId,
    generationId,
    prompt,
    referenceImageId,
    referenceType,
    numberOfImages = 1,
    aspectRatio = "1:1",
    projectId,
    model, // Optional: model selection from client
    operationTypeTokenCost,
    tempFileId, // Optional: temp file ID if uploaded (avoids R2 download)
  } = job.data;

  logger.info(
    `Processing image reference job ${job.id} for generation ${generationId}`
  );

  let referenceImagePath = null;
  let usedTempFile = false;

  try {
    // Update status to PROCESSING
    await updateGenerationRecord(generationId, {
      status: GENERATION_STATUS.PROCESSING,
      referenceImageId,
      referenceType,
    });

    await job.updateProgress(10);
    emitGenerationProgress(
      userId,
      generationId,
      10,
      "Loading reference image..."
    );

    // Optimization: Use temp file if available (uploaded flow), otherwise download from R2
    if (tempFileId) {
      // Check if temp file still exists
      referenceImagePath = tempFileManager.getTempFilePath(tempFileId);

      if (referenceImagePath) {
        usedTempFile = true;
        logger.info(
          `Using temp file for processing (optimization): ${tempFileId}`
        );
      } else {
        logger.warn(
          `Temp file expired or missing: ${tempFileId}, falling back to R2 download`
        );
      }
    }

    // Fallback: Fetch reference image from R2 (existing flow or temp file unavailable)
    if (!referenceImagePath) {
      const referenceImage = await db
        .select()
        .from(uploads)
        .where(
          and(eq(uploads.id, referenceImageId), eq(uploads.userId, userId))
        )
        .limit(1);

      if (!referenceImage.length) {
        throw new Error("Reference image not found or access denied");
      }

      // Use publicUrl (will be downloaded by GeminiService)
      referenceImagePath = referenceImage[0].publicUrl;
      logger.info(`Using R2 public URL for processing: ${referenceImagePath}`);
    }

    await job.updateProgress(20);
    emitGenerationProgress(
      userId,
      generationId,
      20,
      "Generating enhanced prompt..."
    );

    // Generate enhanced prompt using utility
    const enhancedPrompt = generateReferencePrompt(prompt, referenceType);

    await job.updateProgress(30);
    emitGenerationProgress(
      userId,
      generationId,
      30,
      "Generating images with reference..."
    );

    // Generate images with reference
    const generationResults = [];
    let totalTokensUsed = 0;
    let totalProcessingTime = 0;
    let remainingBalance = 0;

    const progressPerImage = 50 / numberOfImages;

    for (let i = 0; i < numberOfImages; i++) {
      // Call GeminiService with reference image (follows generateWithReference pattern)
      // referenceImagePath can be either local temp file path OR R2 public URL
      const result = await GeminiService.generateWithReference(
        userId,
        operationTypeTokenCost,
        referenceImagePath, // Local temp path OR R2 URL (GeminiService handles both)
        enhancedPrompt,
        {
          aspectRatio,
          modelName: model,
          metadata: {
            originalPrompt: prompt,
            referenceType,
            projectId,
            generationId,
            imageNumber: i + 1,
            totalImages: numberOfImages,
            usedTempFile, // Track optimization usage
          },
        }
      );

      generationResults.push({ result: result.result, imageNumber: i + 1 });
      totalTokensUsed += result.tokensUsed;
      totalProcessingTime += result.processingTimeMs;
      remainingBalance = result.remainingBalance;

      const currentProgress = 30 + (i + 1) * progressPerImage;
      await job.updateProgress(currentProgress);
      emitGenerationProgress(
        userId,
        generationId,
        currentProgress,
        `Generated image ${i + 1}/${numberOfImages}`
      );
    }

    // Upload images (80-90% progress)
    await job.updateProgress(80);
    emitGenerationProgress(userId, generationId, 80, "Uploading images...");

    const imagesToUpload = generationResults.map((genResult) => ({
      source: genResult.result,
      userId,
      purpose: UPLOAD_PURPOSE.GENERATION_OUTPUT,
      title: `Ref-${referenceType}: ${prompt.substring(0, 50)}... (${
        genResult.imageNumber
      }/${numberOfImages})`,
      metadata: {
        generationId,
        aspectRatio,
        referenceType,
        imageNumber: genResult.imageNumber,
      },
    }));

    const uploadRecords = await saveMultipleToStorage(imagesToUpload);

    // Build response and update database
    const generatedImages = uploadRecords.map((uploadRecord, index) => ({
      imageUrl: uploadRecord.publicUrl,
      imageId: uploadRecord.id,
      mimeType: generationResults[index].result.mimeType,
      imageSize: generationResults[index].result.size,
    }));

    await updateGenerationRecord(generationId, {
      status: GENERATION_STATUS.COMPLETED,
      outputImageId: generatedImages[0].imageId,
      tokensUsed: totalTokensUsed,
      processingTimeMs: totalProcessingTime,
      aiMetadata: JSON.stringify({
        aspectRatio,
        numberOfImages,
        prompt,
        enhancedPrompt,
        referenceType,
        referenceImageId,
        imageIds: generatedImages.map((img) => img.imageId),
      }),
    });

    await job.updateProgress(100);

    const result = {
      generationId,
      images: generatedImages,
      numberOfImages,
      referenceType,
      metadata: { prompt, referenceType, aspectRatio },
      tokens: { used: totalTokensUsed, remaining: remainingBalance },
      processing: {
        timeMs: totalProcessingTime,
        status: GENERATION_STATUS.COMPLETED,
      },
      createdAt: new Date().toISOString(),
    };

    emitGenerationCompleted(userId, generationId, result);
    logger.info(`Image reference generation completed: ${generationId}`);

    return result;
  } catch (error) {
    logger.error(`Image reference generation failed: ${job.id}`, error);
    await updateGenerationRecord(generationId, {
      status: GENERATION_STATUS.FAILED,
      errorMessage: error.message,
    });
    const geminiError = handleGeminiError(error);
    emitGenerationFailed(userId, generationId, geminiError.message);
    throw error;
  } finally {
    // Cleanup temp file after processing (success or failure)
    if (tempFileId) {
      tempFileManager.cleanup(tempFileId);
      logger.debug(`Cleaned up temp file after processing: ${tempFileId}`);
    }
  }
}

/**
 * Process multiple reference generation job
 * Target image + multiple reference images for composition/styling
 * @param {Object} job - BullMQ job object
 * @returns {Promise<Object>} - Job result
 */
export async function processImageMultipleReference(job) {
  const {
    userId,
    generationId,
    prompt,
    targetImageId,
    referenceImageIds = [],
    promptTemplateId,
    numberOfImages = 1,
    aspectRatio = "1:1",
    projectId,
    model,
    operationTypeTokenCost,
    tempFileIds = [], // Array of {id, type, uploadId}
  } = job.data;

  let targetImagePath = null;
  let referenceImagePaths = [];
  const usedTempFiles = [];

  try {
    // Update status to PROCESSING (10% progress)
    await updateGenerationRecord(generationId, {
      status: GENERATION_STATUS.PROCESSING,
    });
    await job.updateProgress(10);
    emitGenerationProgress(
      userId,
      generationId,
      10,
      "Loading target and reference images..."
    );

    // Load target image (temp cache or R2)
    const targetTempInfo = tempFileIds.find((t) => t.type === "target");
    if (targetTempInfo) {
      targetImagePath = tempFileManager.getTempFilePath(targetTempInfo.id);
      if (targetImagePath) {
        usedTempFiles.push(targetTempInfo.id);
        logger.info(`Using temp file for target image: ${targetTempInfo.id}`);
      } else {
        logger.warn(`Temp file expired for target: ${targetTempInfo.id}`);
      }
    }

    // Fallback: Load target from database if temp not available
    if (!targetImagePath) {
      const [targetImage] = await db
        .select()
        .from(uploads)
        .where(and(eq(uploads.id, targetImageId), eq(uploads.userId, userId)))
        .limit(1);

      if (!targetImage) {
        throw new Error("Target image not found or access denied");
      }

      targetImagePath = targetImage.publicUrl;
      logger.info(`Using R2 public URL for target: ${targetImagePath}`);
    }

    await job.updateProgress(20);

    // Load reference images (temp cache or R2)
    for (const refId of referenceImageIds) {
      let refPath = null;

      // Try temp file first
      const refTempInfo = tempFileIds.find((t) => t.uploadId === refId);
      if (refTempInfo) {
        refPath = tempFileManager.getTempFilePath(refTempInfo.id);
        if (refPath) {
          usedTempFiles.push(refTempInfo.id);
          logger.info(
            `Using temp file for reference ${refId}: ${refTempInfo.id}`
          );
        }
      }

      // Fallback: Load from database if temp not available
      if (!refPath) {
        const [refImage] = await db
          .select()
          .from(uploads)
          .where(and(eq(uploads.id, refId), eq(uploads.userId, userId)))
          .limit(1);

        if (!refImage) {
          throw new Error(
            `Reference image ${refId} not found or access denied`
          );
        }

        refPath = refImage.publicUrl;
        logger.info(`Using R2 public URL for reference ${refId}`);
      }

      referenceImagePaths.push(refPath);
    }

    await job.updateProgress(30);
    emitGenerationProgress(
      userId,
      generationId,
      30,
      "Building enhanced prompt..."
    );

    // Build enhanced prompt using template system
    const enhancedPrompt = await buildMultipleReferencePrompt(
      prompt,
      promptTemplateId,
      { referenceCount: referenceImageIds.length }
    );

    logger.info(`Enhanced prompt built for generation ${generationId}`);

    await job.updateProgress(40);

    // Generate images loop
    const generationResults = [];
    const progressPerImage = 40 / numberOfImages; // 40-80% range

    for (let i = 0; i < numberOfImages; i++) {
      const currentProgress = 40 + (i + 1) * progressPerImage;

      emitGenerationProgress(
        userId,
        generationId,
        Math.round(currentProgress),
        `Generating image ${
          i + 1
        }/${numberOfImages} with multiple references...`
      );

      // Call Gemini service with target + multiple references
      const result = await GeminiService.generateWithMultipleReferences(
        userId,
        operationTypeTokenCost,
        targetImagePath,
        referenceImagePaths,
        enhancedPrompt,
        {
          aspectRatio,
          modelName: model,
          metadata: {
            originalPrompt: prompt,
            enhancedPrompt,
            targetImageId,
            referenceImageIds,
            promptTemplateId,
            projectId,
            generationId,
            imageNumber: i + 1,
            totalImages: numberOfImages,
          },
        }
      );

      generationResults.push({
        result: result.result,
        imageNumber: i + 1,
        tokensUsed: result.tokensUsed,
        processingTimeMs: result.processingTimeMs,
        remainingBalance: result.remainingBalance,
      });

      await job.updateProgress(Math.round(currentProgress));
    }

    await job.updateProgress(80);
    emitGenerationProgress(
      userId,
      generationId,
      80,
      "Uploading generated images..."
    );

    // Calculate total tokens and processing time
    const totalTokensUsed = generationResults.reduce(
      (sum, r) => sum + r.tokensUsed,
      0
    );
    const totalProcessingTime = generationResults.reduce(
      (sum, r) => sum + r.processingTimeMs,
      0
    );
    // Get remaining balance from last generation result
    const remainingBalance =
      generationResults[generationResults.length - 1]?.remainingBalance || 0;

    // Upload all images to R2 concurrently
    const imagesToUpload = generationResults.map((genResult) => ({
      source: genResult.result,
      userId,
      purpose: UPLOAD_PURPOSE.GENERATION_OUTPUT,
      title: `Multi-ref: ${prompt.substring(0, 50)}... (${
        genResult.imageNumber
      }/${numberOfImages})`,
      metadata: {
        generationId,
        aspectRatio,
        imageNumber: genResult.imageNumber,
        targetImageId,
        referenceCount: referenceImageIds.length,
      },
    }));

    const uploadRecords = await saveMultipleToStorage(imagesToUpload);

    await job.updateProgress(90);
    emitGenerationProgress(userId, generationId, 90, "Finalizing...");

    // Prepare image metadata
    const generatedImages = uploadRecords.map((uploadRecord, index) => ({
      imageUrl: uploadRecord.publicUrl,
      imageId: uploadRecord.id,
      mimeType: generationResults[index].result.mimeType,
      imageSize: generationResults[index].result.size,
    }));

    // Update generation record with results
    await updateGenerationRecord(generationId, {
      status: GENERATION_STATUS.COMPLETED,
      outputImageId: generatedImages[0].imageId,
      tokensUsed: totalTokensUsed,
      processingTimeMs: totalProcessingTime,
      aiMetadata: JSON.stringify({
        aspectRatio,
        numberOfImages,
        prompt,
        enhancedPrompt,
        targetImageId,
        referenceImageIds,
        promptTemplateId,
        imageIds: generatedImages.map((img) => img.imageId),
        model: model || process.env.GEMINI_MODEL || "gemini-2.5-flash-image",
      }),
    });

    await job.updateProgress(100);

    // Emit completion event
    const result = {
      generationId,
      images: generatedImages,
      numberOfImages,
      targetImageId,
      referenceImageIds,
      promptTemplateId,
      metadata: {
        prompt,
        enhancedPrompt,
        aspectRatio,
        targetImageId,
        referenceCount: referenceImageIds.length,
      },
      tokens: {
        used: totalTokensUsed,
        remaining: remainingBalance,
      },
      processing: {
        timeMs: totalProcessingTime,
        status: GENERATION_STATUS.COMPLETED,
      },
      createdAt: new Date().toISOString(),
    };

    emitGenerationCompleted(userId, generationId, result);

    logger.info(
      `Multiple reference generation completed: ${generationId} (${numberOfImages} images, ${totalTokensUsed} tokens, ${totalProcessingTime}ms)`
    );

    return result;
  } catch (error) {
    logger.error(
      `Multiple reference generation failed: ${generationId}`,
      error
    );

    // Update generation record with error
    await updateGenerationRecord(generationId, {
      status: GENERATION_STATUS.FAILED,
      errorMessage: error.message,
    });

    // Emit failure event
    const geminiError = handleGeminiError(error);
    emitGenerationFailed(userId, generationId, geminiError.message);

    // Re-throw for BullMQ retry logic
    throw error;
  } finally {
    // Cleanup temp files after processing (success or failure)
    for (const tempId of usedTempFiles) {
      tempFileManager.cleanup(tempId);
      logger.debug(`Cleaned up temp file after processing: ${tempId}`);
    }
  }
}

export default {
  processTextToImage,
  processImageReference,
  processImageMultipleReference,
};
