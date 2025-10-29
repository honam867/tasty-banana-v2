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
import logger from "../../../config/logger.js";

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

export default {
  processTextToImage,
};
