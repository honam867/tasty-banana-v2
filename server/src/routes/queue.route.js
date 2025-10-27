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

/**
 * @swagger
 * /queue/status/{jobId}:
 *   get:
 *     summary: Get job status by ID
 *     tags: [Queue]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get("/status/:jobId", getJobStatus);

/**
 * @swagger
 * /queue/metrics:
 *   get:
 *     summary: Get metrics for all queues
 *     tags: [Queue]
 *     responses:
 *       200:
 *         description: Queue metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get("/metrics", getAllQueueMetrics);

/**
 * @swagger
 * /queue/metrics/{queueName}:
 *   get:
 *     summary: Get metrics for specific queue
 *     tags: [Queue]
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Queue metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get("/metrics/:queueName", getQueueMetrics);

/**
 * @swagger
 * /queue/failed/{queueName}:
 *   get:
 *     summary: Get failed jobs for specific queue
 *     tags: [Queue]
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Failed jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get("/failed/:queueName", getFailedJobs);

/**
 * @swagger
 * /queue/health:
 *   get:
 *     summary: Get queue system health status
 *     tags: [Queue]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get("/health", getSystemHealth);

/**
 * @swagger
 * /queue/retry/{queueName}/{jobId}:
 *   post:
 *     summary: Retry a failed job
 *     tags: [Queue]
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job retry initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post("/retry/:queueName/:jobId", retryJob);

/**
 * @swagger
 * /queue/clean/{queueName}:
 *   post:
 *     summary: Clean completed/failed jobs from queue
 *     tags: [Queue]
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Queue cleaned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post("/clean/:queueName", cleanQueue);

export default router;
