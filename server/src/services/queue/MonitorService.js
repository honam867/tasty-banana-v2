import queueService from "./QueueService.js";
import logger from "../../config/logger.js";

/**
 * Monitor Service
 * Provides monitoring, debugging, and analytics for queues and jobs
 * Useful for tracking job status, performance, and health
 */
class MonitorService {
  /**
   * Get queue counts (waiting, active, completed, failed, delayed)
   */
  async getQueueCounts(queueName) {
    try {
      const queue = queueService.getQueue(queueName);
      const counts = await queue.getJobCounts();
      return counts;
    } catch (error) {
      logger.error(`Failed to get counts for queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(queueName, status, start = 0, end = 10) {
    try {
      const queue = queueService.getQueue(queueName);
      const jobs = await queue.getJobs(status, start, end);
      return jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        timestamp: job.timestamp,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
      }));
    } catch (error) {
      logger.error(
        `Failed to get ${status} jobs for queue ${queueName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get waiting jobs
   */
  async getWaitingJobs(queueName, start = 0, end = 10) {
    return this.getJobsByStatus(queueName, "waiting", start, end);
  }

  /**
   * Get active jobs
   */
  async getActiveJobs(queueName, start = 0, end = 10) {
    return this.getJobsByStatus(queueName, "active", start, end);
  }

  /**
   * Get completed jobs
   */
  async getCompletedJobs(queueName, start = 0, end = 10) {
    return this.getJobsByStatus(queueName, "completed", start, end);
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(queueName, start = 0, end = 10) {
    return this.getJobsByStatus(queueName, "failed", start, end);
  }

  /**
   * Get delayed jobs
   */
  async getDelayedJobs(queueName, start = 0, end = 10) {
    return this.getJobsByStatus(queueName, "delayed", start, end);
  }

  /**
   * Get job details by ID
   */
  async getJobDetails(queueName, jobId) {
    try {
      const job = await queueService.getJob(queueName, jobId);
      if (!job) {
        return null;
      }

      const state = await job.getState();
      const logs = await job.getProgress();

      return {
        id: job.id,
        name: job.name,
        data: job.data,
        state,
        progress: logs,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts?.attempts || 0,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        timestamp: job.timestamp,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        opts: job.opts,
      };
    } catch (error) {
      logger.error(
        `Failed to get details for job ${jobId} in queue ${queueName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get comprehensive queue metrics
   */
  async getQueueMetrics(queueName) {
    try {
      const queue = queueService.getQueue(queueName);
      const counts = await queue.getJobCounts();
      const isPaused = await queue.isPaused();

      return {
        name: queueName,
        isPaused,
        counts,
        total:
          counts.waiting +
          counts.active +
          counts.delayed +
          counts.paused,
        completed: counts.completed,
        failed: counts.failed,
      };
    } catch (error) {
      logger.error(`Failed to get metrics for queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get metrics for all queues
   */
  async getAllQueueMetrics() {
    try {
      const queueNames = queueService.getQueueNames();
      const metricsPromises = queueNames.map((name) =>
        this.getQueueMetrics(name)
      );
      const metrics = await Promise.all(metricsPromises);
      return metrics;
    } catch (error) {
      logger.error("Failed to get metrics for all queues:", error);
      throw error;
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName, jobId) {
    try {
      const job = await queueService.getJob(queueName, jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found in queue ${queueName}`);
      }

      await job.retry();
      logger.info(`Job ${jobId} in queue ${queueName} queued for retry`);
      return true;
    } catch (error) {
      logger.error(
        `Failed to retry job ${jobId} in queue ${queueName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Retry all failed jobs in a queue
   */
  async retryAllFailed(queueName) {
    try {
      const failedJobs = await this.getFailedJobs(queueName, 0, -1);
      const retryPromises = failedJobs.map((job) =>
        this.retryJob(queueName, job.id)
      );
      await Promise.all(retryPromises);
      logger.info(
        `Retried ${failedJobs.length} failed jobs in queue ${queueName}`
      );
      return failedJobs.length;
    } catch (error) {
      logger.error(
        `Failed to retry all failed jobs in queue ${queueName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get job logs/events
   */
  async getJobLogs(queueName, jobId) {
    try {
      const job = await queueService.getJob(queueName, jobId);
      if (!job) {
        return null;
      }

      return {
        id: job.id,
        logs: await job.getProgress(),
        state: await job.getState(),
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      };
    } catch (error) {
      logger.error(
        `Failed to get logs for job ${jobId} in queue ${queueName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(queueName, olderThan = 86400000, limit = 1000) {
    try {
      const completedJobs = await queueService.cleanQueue(
        queueName,
        olderThan,
        limit,
        "completed"
      );
      const failedJobs = await queueService.cleanQueue(
        queueName,
        olderThan,
        limit,
        "failed"
      );

      logger.info(
        `Cleaned ${completedJobs.length} completed and ${failedJobs.length} failed jobs from queue ${queueName}`
      );

      return {
        completed: completedJobs.length,
        failed: failedJobs.length,
        total: completedJobs.length + failedJobs.length,
      };
    } catch (error) {
      logger.error(`Failed to clean queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get queue health status
   */
  async getQueueHealth(queueName) {
    try {
      const metrics = await this.getQueueMetrics(queueName);
      const failureRate =
        metrics.failed / (metrics.completed + metrics.failed || 1);

      return {
        name: queueName,
        healthy: failureRate < 0.1 && !metrics.isPaused, // Less than 10% failure rate
        metrics,
        failureRate: (failureRate * 100).toFixed(2) + "%",
        status: metrics.isPaused ? "paused" : "active",
      };
    } catch (error) {
      logger.error(`Failed to get health for queue ${queueName}:`, error);
      return {
        name: queueName,
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Get system-wide health
   */
  async getSystemHealth() {
    try {
      const queueNames = queueService.getQueueNames();
      const healthPromises = queueNames.map((name) =>
        this.getQueueHealth(name)
      );
      const health = await Promise.all(healthPromises);

      const unhealthyQueues = health.filter((q) => !q.healthy);

      return {
        healthy: unhealthyQueues.length === 0,
        totalQueues: queueNames.length,
        healthyQueues: queueNames.length - unhealthyQueues.length,
        unhealthyQueues: unhealthyQueues.length,
        queues: health,
      };
    } catch (error) {
      logger.error("Failed to get system health:", error);
      throw error;
    }
  }
}

// Export singleton instance
const monitorService = new MonitorService();
export default monitorService;
