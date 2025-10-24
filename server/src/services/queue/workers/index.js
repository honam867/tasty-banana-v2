import workerService from "../WorkerService.js";
import logger from "../../../config/logger.js";

/**
 * Worker Initialization
 * Central place to register all processors and start workers
 * 
 * Add your worker registrations here when you're ready to use them.
 * 
 * Example:
 *   import { myProcessor } from "../processors/myProcessor.js";
 *   workerService.registerProcessor(QUEUE_NAME, JOB_TYPE, myProcessor);
 *   workerService.createWorker(QUEUE_NAME, { concurrency: 3 });
 */

/**
 * Initialize all workers
 * Call this function when your server starts
 */
export async function initializeWorkers() {
  try {
    logger.info("=== Initializing Queue Workers ===");

    // TODO: Register your workers here when needed
    // Example:
    // registerYourWorkers();

    logger.info("=== Queue Workers Ready (No workers registered yet) ===");
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
