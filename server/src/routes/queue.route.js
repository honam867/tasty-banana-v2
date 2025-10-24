import express from "express";
import {
  getJobStatus,
  getQueueMetrics,
  getAllQueueMetrics,
  getFailedJobs,
  retryJob,
  getSystemHealth,
  cleanQueue,
} from "../controllers/queue.controller.js";

const router = express.Router();

// Public routes (you may want to add authentication middleware)
router.get("/status/:jobId", getJobStatus);

// Monitoring routes (should be protected with admin middleware)
router.get("/metrics", getAllQueueMetrics);
router.get("/metrics/:queueName", getQueueMetrics);
router.get("/failed/:queueName", getFailedJobs);
router.get("/health", getSystemHealth);

// Admin operations (should be protected with admin middleware)
router.post("/retry/:queueName/:jobId", retryJob);
router.post("/clean/:queueName", cleanQueue);

export default router;
