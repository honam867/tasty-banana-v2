import workerService from "../WorkerService.js";
import logger from "../../../config/logger.js";
import { QUEUE_NAMES, JOB_TYPES } from "../jobs/index.js";
import { processTextToImage, processImageReference } from "../processors/imageGeneration.processor.js";

/**
 * Worker Initialization
 * Central place to register all processors and start workers
 */

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

    // Register image generation workers
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
