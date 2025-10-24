import { monitorService, QUEUE_NAMES } from "../services/queue/index.js";
import logger from "../config/logger.js";

/**
 * Queue Controller - Monitoring & Management
 * Provides endpoints for queue monitoring and administration
 */

/**
 * Get Job Status
 * GET /api/queue/status/:jobId
 */
export const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const queueName = req.query.queue || QUEUE_NAMES.IMAGE_GENERATION;

    const jobDetails = await monitorService.getJobDetails(queueName, jobId);

    if (!jobDetails) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const response = {
      success: true,
      data: {
        jobId: jobDetails.id,
        name: jobDetails.name,
        state: jobDetails.state,
        progress: jobDetails.progress,
        createdAt: new Date(jobDetails.timestamp).toISOString(),
        processedAt: jobDetails.processedOn
          ? new Date(jobDetails.processedOn).toISOString()
          : null,
        completedAt: jobDetails.finishedOn
          ? new Date(jobDetails.finishedOn).toISOString()
          : null,
        attemptsMade: jobDetails.attemptsMade,
        maxAttempts: jobDetails.maxAttempts,
      },
    };

    // Add result if completed
    if (jobDetails.state === "completed") {
      response.data.result = jobDetails.returnvalue;
    }

    // Add error if failed
    if (jobDetails.state === "failed") {
      response.data.error = {
        message: jobDetails.failedReason,
        stacktrace: jobDetails.stacktrace,
      };
    }

    res.json(response);
  } catch (error) {
    logger.error("Failed to get job status:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get Queue Metrics
 * GET /api/queue/metrics/:queueName
 */
export const getQueueMetrics = async (req, res) => {
  try {
    const { queueName } = req.params;

    const metrics = await monitorService.getQueueMetrics(queueName);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error("Failed to get queue metrics:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get All Queue Metrics
 * GET /api/queue/metrics
 */
export const getAllQueueMetrics = async (req, res) => {
  try {
    const metrics = await monitorService.getAllQueueMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error("Failed to get all queue metrics:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get Failed Jobs
 * GET /api/queue/failed/:queueName
 */
export const getFailedJobs = async (req, res) => {
  try {
    const { queueName } = req.params;
    const start = parseInt(req.query.start) || 0;
    const end = parseInt(req.query.end) || 10;

    const jobs = await monitorService.getFailedJobs(queueName, start, end);

    res.json({
      success: true,
      data: {
        queueName,
        count: jobs.length,
        jobs,
      },
    });
  } catch (error) {
    logger.error("Failed to get failed jobs:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Retry Failed Job
 * POST /api/queue/retry/:queueName/:jobId
 */
export const retryJob = async (req, res) => {
  try {
    const { queueName, jobId } = req.params;

    await monitorService.retryJob(queueName, jobId);

    res.json({
      success: true,
      message: "Job queued for retry",
      data: {
        jobId,
        queueName,
      },
    });
  } catch (error) {
    logger.error("Failed to retry job:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get System Health
 * GET /api/queue/health
 */
export const getSystemHealth = async (req, res) => {
  try {
    const health = await monitorService.getSystemHealth();

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error("Failed to get system health:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Clean Queue
 * POST /api/queue/clean/:queueName
 */
export const cleanQueue = async (req, res) => {
  try {
    const { queueName } = req.params;
    const olderThan = parseInt(req.body.olderThan) || 86400000; // 24 hours default
    const limit = parseInt(req.body.limit) || 1000;

    const result = await monitorService.cleanQueue(queueName, olderThan, limit);

    res.json({
      success: true,
      message: "Queue cleaned successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to clean queue:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
