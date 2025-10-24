import workerService from "../WorkerService.js";
import { QUEUE_NAMES, JOB_TYPES } from "../jobs/index.js";
import {
  generateImageProcessor,
  generateThumbnailProcessor,
  addWatermarkProcessor,
  resizeImageProcessor,
} from "../processors/imageGeneration.processor.js";
import logger from "../../../config/logger.js";

/**
 * Worker Initialization
 * Central place to register all processors and start workers
 * 
 * This file should be imported and initialized when your server starts
 * 
 * Usage:
 *   import { initializeWorkers } from './services/queue/workers/index.js';
 *   await initializeWorkers();
 */

/**
 * Register Image Generation processors
 */
function registerImageGenerationWorkers() {
  logger.info("Registering image generation processors...");

  // Register all processors for the image generation queue
  workerService.registerProcessor(
    QUEUE_NAMES.IMAGE_GENERATION,
    JOB_TYPES.IMAGE_GENERATION.GENERATE,
    generateImageProcessor
  );

  workerService.registerProcessor(
    QUEUE_NAMES.IMAGE_GENERATION,
    JOB_TYPES.IMAGE_GENERATION.THUMBNAIL,
    generateThumbnailProcessor
  );

  workerService.registerProcessor(
    QUEUE_NAMES.IMAGE_GENERATION,
    JOB_TYPES.IMAGE_GENERATION.WATERMARK,
    addWatermarkProcessor
  );

  workerService.registerProcessor(
    QUEUE_NAMES.IMAGE_GENERATION,
    JOB_TYPES.IMAGE_GENERATION.RESIZE,
    resizeImageProcessor
  );

  // Create and start the worker
  workerService.createWorker(QUEUE_NAMES.IMAGE_GENERATION, {
    concurrency: 3, // Process 3 image jobs concurrently
    limiter: {
      max: 5,
      duration: 1000,
    },
  });

  logger.info("Image generation workers registered and started");
}

/**
 * Register Email processors (example placeholder)
 */
function registerEmailWorkers() {
  // Placeholder - implement your email processors
  logger.info("Email workers not yet implemented");
}

/**
 * Register File Processing processors (example placeholder)
 */
function registerFileProcessingWorkers() {
  // Placeholder - implement your file processing processors
  logger.info("File processing workers not yet implemented");
}

/**
 * Initialize all workers
 * Call this function when your server starts
 */
export async function initializeWorkers() {
  try {
    logger.info("=== Initializing Queue Workers ===");

    // Register workers for each queue
    registerImageGenerationWorkers();
    // registerEmailWorkers(); // Uncomment when implemented
    // registerFileProcessingWorkers(); // Uncomment when implemented

    logger.info("=== All Queue Workers Initialized Successfully ===");
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
