import { Queue } from "bullmq";
import redisManager from "./redis.js";
import logger from "../../config/logger.js";

/**
 * Queue Service - Factory Pattern
 * Centralized queue management for creating and managing BullMQ queues
 * Provides a single point of configuration and reusability
 */
class QueueService {
  constructor() {
    this.queues = new Map();
    this.defaultOptions = {
      // Default job options
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 604800, // Keep failed jobs for 7 days
          count: 5000, // Keep last 5000 failed jobs
        },
      },
    };
  }

  /**
   * Get Redis connection for BullMQ
   */
  getRedisConnection() {
    try {
      const connections = redisManager.getConnections();
      return connections.client;
    } catch (error) {
      logger.error("Failed to get Redis connection for queue:", error);
      throw error;
    }
  }

  /**
   * Create or get existing queue
   * @param {string} queueName - Name of the queue
   * @param {Object} options - Queue configuration options
   * @returns {Queue} BullMQ Queue instance
   */
  createQueue(queueName, options = {}) {
    if (this.queues.has(queueName)) {
      logger.debug(`Reusing existing queue: ${queueName}`);
      return this.queues.get(queueName);
    }

    try {
      const connection = this.getRedisConnection();
      
      const queueOptions = {
        connection,
        ...this.defaultOptions,
        ...options,
      };

      const queue = new Queue(queueName, queueOptions);

      // Event listeners for debugging and monitoring
      queue.on("error", (error) => {
        logger.error(`Queue ${queueName} error:`, error);
      });

      queue.on("waiting", (jobId) => {
        logger.debug(`Job ${jobId} is waiting in queue ${queueName}`);
      });

      this.queues.set(queueName, queue);
      logger.info(`Queue created successfully: ${queueName}`);

      return queue;
    } catch (error) {
      logger.error(`Failed to create queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get existing queue by name
   */
  getQueue(queueName) {
    if (!this.queues.has(queueName)) {
      throw new Error(`Queue ${queueName} does not exist. Create it first.`);
    }
    return this.queues.get(queueName);
  }

  /**
   * Add a job to a queue
   * @param {string} queueName - Name of the queue
   * @param {string} jobName - Name/type of the job
   * @param {Object} data - Job data
   * @param {Object} options - Job-specific options
   * @returns {Promise<Job>} Created job
   */
  async addJob(queueName, jobName, data, options = {}) {
    try {
      const queue = this.getQueue(queueName);
      
      const job = await queue.add(jobName, data, {
        ...options,
        timestamp: Date.now(),
      });

      logger.info(`Job ${jobName} added to queue ${queueName} with ID: ${job.id}`);
      return job;
    } catch (error) {
      logger.error(`Failed to add job ${jobName} to queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Add multiple jobs in bulk
   */
  async addBulkJobs(queueName, jobs) {
    try {
      const queue = this.getQueue(queueName);
      const bulkJobs = jobs.map(({ name, data, options = {} }) => ({
        name,
        data: { ...data, timestamp: Date.now() },
        opts: options,
      }));

      const createdJobs = await queue.addBulk(bulkJobs);
      logger.info(`Added ${createdJobs.length} jobs to queue ${queueName}`);
      return createdJobs;
    } catch (error) {
      logger.error(`Failed to add bulk jobs to queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(queueName, jobId) {
    try {
      const queue = this.getQueue(queueName);
      return await queue.getJob(jobId);
    } catch (error) {
      logger.error(`Failed to get job ${jobId} from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Remove a job from queue
   */
  async removeJob(queueName, jobId) {
    try {
      const job = await this.getJob(queueName, jobId);
      if (job) {
        await job.remove();
        logger.info(`Job ${jobId} removed from queue ${queueName}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to remove job ${jobId} from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName) {
    try {
      const queue = this.getQueue(queueName);
      await queue.pause();
      logger.info(`Queue ${queueName} paused`);
    } catch (error) {
      logger.error(`Failed to pause queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Resume a paused queue
   */
  async resumeQueue(queueName) {
    try {
      const queue = this.getQueue(queueName);
      await queue.resume();
      logger.info(`Queue ${queueName} resumed`);
    } catch (error) {
      logger.error(`Failed to resume queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(queueName, grace = 86400000, limit = 1000, type = "completed") {
    try {
      const queue = this.getQueue(queueName);
      const jobs = await queue.clean(grace, limit, type);
      logger.info(`Cleaned ${jobs.length} ${type} jobs from queue ${queueName}`);
      return jobs;
    } catch (error) {
      logger.error(`Failed to clean queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Obliterate a queue (remove all jobs and queue data)
   */
  async obliterateQueue(queueName) {
    try {
      const queue = this.getQueue(queueName);
      await queue.obliterate({ force: true });
      logger.warn(`Queue ${queueName} obliterated`);
    } catch (error) {
      logger.error(`Failed to obliterate queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Close a queue
   */
  async closeQueue(queueName) {
    try {
      const queue = this.getQueue(queueName);
      await queue.close();
      this.queues.delete(queueName);
      logger.info(`Queue ${queueName} closed`);
    } catch (error) {
      logger.error(`Failed to close queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Close all queues
   */
  async closeAll() {
    try {
      const closePromises = Array.from(this.queues.keys()).map((queueName) =>
        this.closeQueue(queueName)
      );
      await Promise.all(closePromises);
      logger.info("All queues closed");
    } catch (error) {
      logger.error("Failed to close all queues:", error);
      throw error;
    }
  }

  /**
   * Get all queue names
   */
  getQueueNames() {
    return Array.from(this.queues.keys());
  }

  /**
   * Check if queue exists
   */
  hasQueue(queueName) {
    return this.queues.has(queueName);
  }
}

// Export singleton instance
const queueService = new QueueService();
export default queueService;
