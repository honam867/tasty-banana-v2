import { Worker } from "bullmq";
import redisManager from "./redis.js";
import logger from "../../config/logger.js";

/**
 * Worker Service
 * Manages BullMQ workers for processing jobs
 * Provides centralized worker configuration and lifecycle management
 */
class WorkerService {
  constructor() {
    this.workers = new Map();
    this.processors = new Map();
    this.defaultOptions = {
      concurrency: 5, // Process 5 jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs
        duration: 1000, // per 1 second
      },
    };
  }

  /**
   * Get Redis connection for worker
   */
  getRedisConnection() {
    try {
      const connections = redisManager.getConnections();
      return connections.client;
    } catch (error) {
      logger.error("Failed to get Redis connection for worker:", error);
      throw error;
    }
  }

  /**
   * Register a processor function for a specific job type
   * @param {string} queueName - Queue name
   * @param {string} jobType - Job type/name
   * @param {Function} processor - Async function to process the job
   */
  registerProcessor(queueName, jobType, processor) {
    const key = `${queueName}:${jobType}`;
    this.processors.set(key, processor);
    logger.info(`Processor registered: ${key}`);
  }

  /**
   * Register multiple processors at once
   */
  registerProcessors(queueName, processors) {
    Object.entries(processors).forEach(([jobType, processor]) => {
      this.registerProcessor(queueName, jobType, processor);
    });
  }

  /**
   * Create and start a worker
   * @param {string} queueName - Name of the queue to process
   * @param {Object} options - Worker configuration
   */
  createWorker(queueName, options = {}) {
    if (this.workers.has(queueName)) {
      logger.warn(`Worker for queue ${queueName} already exists`);
      return this.workers.get(queueName);
    }

    try {
      const connection = this.getRedisConnection();

      const workerOptions = {
        connection,
        ...this.defaultOptions,
        ...options,
      };

      // Main processor function that routes to registered processors
      const processor = async (job) => {
        const processorKey = `${queueName}:${job.name}`;
        const processorFn = this.processors.get(processorKey);

        if (!processorFn) {
          throw new Error(
            `No processor registered for job type: ${job.name} in queue: ${queueName}`
          );
        }

        logger.info(
          `Processing job ${job.id} (${job.name}) in queue ${queueName}`
        );

        try {
          // Update progress to 0%
          await job.updateProgress(0);

          // Execute the processor
          const result = await processorFn(job);

          // Update progress to 100%
          await job.updateProgress(100);

          logger.info(
            `Job ${job.id} (${job.name}) completed successfully in queue ${queueName}`
          );

          return result;
        } catch (error) {
          logger.error(
            `Job ${job.id} (${job.name}) failed in queue ${queueName}:`,
            error
          );
          throw error;
        }
      };

      const worker = new Worker(queueName, processor, workerOptions);

      // Event listeners for monitoring
      worker.on("completed", (job, result) => {
        logger.info(
          `✓ Job ${job.id} completed in queue ${queueName}`,
          { jobId: job.id, result }
        );
      });

      worker.on("failed", (job, error) => {
        logger.error(
          `✗ Job ${job?.id} failed in queue ${queueName}:`,
          {
            jobId: job?.id,
            error: error.message,
            attempts: job?.attemptsMade,
          }
        );
      });

      worker.on("progress", (job, progress) => {
        logger.debug(
          `Job ${job.id} progress in queue ${queueName}: ${progress}%`
        );
      });

      worker.on("active", (job) => {
        logger.debug(`Job ${job.id} is now active in queue ${queueName}`);
      });

      worker.on("stalled", (jobId) => {
        logger.warn(`Job ${jobId} stalled in queue ${queueName}`);
      });

      worker.on("error", (error) => {
        logger.error(`Worker error in queue ${queueName}:`, error);
      });

      worker.on("closed", () => {
        logger.info(`Worker closed for queue ${queueName}`);
      });

      this.workers.set(queueName, worker);
      logger.info(
        `Worker created and started for queue: ${queueName} (concurrency: ${workerOptions.concurrency})`
      );

      return worker;
    } catch (error) {
      logger.error(`Failed to create worker for queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get existing worker
   */
  getWorker(queueName) {
    const worker = this.workers.get(queueName);
    if (!worker) {
      throw new Error(`Worker for queue ${queueName} does not exist`);
    }
    return worker;
  }

  /**
   * Pause a worker
   */
  async pauseWorker(queueName) {
    try {
      const worker = this.getWorker(queueName);
      await worker.pause();
      logger.info(`Worker paused for queue ${queueName}`);
    } catch (error) {
      logger.error(`Failed to pause worker for queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Resume a paused worker
   */
  async resumeWorker(queueName) {
    try {
      const worker = this.getWorker(queueName);
      await worker.resume();
      logger.info(`Worker resumed for queue ${queueName}`);
    } catch (error) {
      logger.error(`Failed to resume worker for queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Close a worker
   */
  async closeWorker(queueName) {
    try {
      const worker = this.getWorker(queueName);
      await worker.close();
      this.workers.delete(queueName);
      logger.info(`Worker closed for queue ${queueName}`);
    } catch (error) {
      logger.error(`Failed to close worker for queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Close all workers gracefully
   */
  async closeAll() {
    try {
      const closePromises = Array.from(this.workers.keys()).map((queueName) =>
        this.closeWorker(queueName)
      );
      await Promise.all(closePromises);
      logger.info("All workers closed gracefully");
    } catch (error) {
      logger.error("Failed to close all workers:", error);
      throw error;
    }
  }

  /**
   * Get all active worker names
   */
  getWorkerNames() {
    return Array.from(this.workers.keys());
  }

  /**
   * Check if worker exists
   */
  hasWorker(queueName) {
    return this.workers.has(queueName);
  }

  /**
   * Get worker metrics
   */
  async getWorkerMetrics(queueName) {
    try {
      const worker = this.getWorker(queueName);
      return {
        isRunning: await worker.isRunning(),
        isPaused: await worker.isPaused(),
        name: worker.name,
      };
    } catch (error) {
      logger.error(`Failed to get metrics for worker ${queueName}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
const workerService = new WorkerService();
export default workerService;
