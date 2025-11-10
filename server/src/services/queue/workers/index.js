import workerService from "../WorkerService.js";
import logger from "../../../config/logger.js";
import { QUEUE_NAMES, JOB_TYPES } from "../jobs/index.js";
import { processTextToImage, processImageReference, processImageMultipleReference } from "../processors/imageGeneration.processor.js";
import { db } from "../../../db/drizzle.js";
import { imageGenerations } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { GENERATION_STATUS } from "../../../utils/constant.js";
import { updateGenerationRecord } from "../../../utils/gemini.helper.js";
import { emitGenerationFailed } from "../../websocket/emitters/imageGeneration.emitter.js";

/**
 * Worker Initialization
 * Central place to register all processors and start workers
 */

/**
 * Mark orphaned processing jobs as failed after server restart
 * Scans for jobs stuck in PROCESSING status and marks them as FAILED
 */
async function recoverOrphanedJobs() {
  try {
    logger.info("=== Checking for orphaned generation jobs ===");
    
    // Find all jobs stuck in PROCESSING status
    const orphanedJobs = await db
      .select()
      .from(imageGenerations)
      .where(eq(imageGenerations.status, GENERATION_STATUS.PROCESSING));
    
    if (orphanedJobs.length === 0) {
      logger.info("No orphaned jobs found");
      return;
    }
    
    logger.warn(`Found ${orphanedJobs.length} orphaned jobs, marking as failed`);
    
    const errorMessage = 'Server restarted during processing. Please retry your request.';
    
    // Mark each job as failed
    for (const job of orphanedJobs) {
      try {
        await updateGenerationRecord(job.id, {
          status: GENERATION_STATUS.FAILED,
          errorMessage: errorMessage,
          completedAt: new Date(),
        });
        
        // Emit failure event (in case user is already connected via WebSocket)
        emitGenerationFailed(job.userId, job.id, errorMessage);
        
        logger.info(`Marked generation ${job.id} as failed (server restart)`);
      } catch (error) {
        logger.error(`Failed to mark generation ${job.id} as failed:`, error);
        // Continue with other jobs even if one fails
      }
    }
    
    logger.info(`=== Recovery complete: ${orphanedJobs.length} jobs marked as failed ===`);
  } catch (error) {
    logger.error("Error during orphaned job recovery:", error);
    // Don't throw - allow server to start even if recovery fails
  }
}

/**
 * Register image generation workers
 */
function registerImageGenerationWorkers() {
  logger.info("Registering image generation workers...");
  
  // Register text-to-image processor
  workerService.registerProcessor(
    QUEUE_NAMES.IMAGE_GENERATION,
    JOB_TYPES.IMAGE_GENERATION.TEXT_TO_IMAGE,
    processTextToImage
  );
  
  // Register image-reference processor
  workerService.registerProcessor(
    QUEUE_NAMES.IMAGE_GENERATION,
    JOB_TYPES.IMAGE_GENERATION.IMAGE_REFERENCE,
    processImageReference
  );
  
  // Register image-multiple-reference processor
  workerService.registerProcessor(
    QUEUE_NAMES.IMAGE_GENERATION,
    JOB_TYPES.IMAGE_GENERATION.IMAGE_MULTIPLE_REFERENCE,
    processImageMultipleReference
  );
  
  // Create worker for image generation queue
  // Concurrency: 3 (process 3 jobs simultaneously)
  workerService.createWorker(QUEUE_NAMES.IMAGE_GENERATION, {
    concurrency: 3,
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per 1 second
    },
  });
  
  logger.info("Image generation workers registered successfully");
}

/**
 * Initialize all workers
 * Call this function when your server starts
 */
export async function initializeWorkers() {
  try {
    logger.info("=== Initializing Queue Workers ===");

    // STEP 1: Recover orphaned jobs from previous session
    await recoverOrphanedJobs();

    // STEP 2: Register image generation workers
    registerImageGenerationWorkers();

    logger.info("=== Queue Workers Ready ===");
  } catch (error) {
    logger.error("Failed to initialize workers:", error);
    throw error;
  }
}

/**
 * Shutdown all workers gracefully
 * Call this when your server is shutting down
 */
export async function shutdownWorkers() {
  try {
    logger.info("=== Shutting Down Queue Workers ===");
    await workerService.closeAll();
    logger.info("=== All Workers Shut Down Successfully ===");
  } catch (error) {
    logger.error("Error during worker shutdown:", error);
    throw error;
  }
}

/**
 * Handle graceful shutdown on process termination
 */
function setupGracefulShutdown() {
  const signals = ["SIGTERM", "SIGINT"];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`${signal} received, shutting down gracefully...`);
      try {
        await shutdownWorkers();
        process.exit(0);
      } catch (error) {
        logger.error("Error during graceful shutdown:", error);
        process.exit(1);
      }
    });
  });
}

// Setup graceful shutdown handlers
setupGracefulShutdown();
