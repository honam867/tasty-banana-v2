import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createServer } from "http";

import { config, validateEnv } from "./config/env.js";
import logger from "./config/logger.js";
import db from "./config/db/index.js";
import route from "./routes/index.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import redisManager from "./services/queue/redis.js";
import queueService from "./services/queue/QueueService.js";
import { initializeWorkers, shutdownWorkers } from "./services/queue/workers/index.js";
import websocketService from "./services/websocket/index.js";
import tempFileCleanupScheduler from "./services/scheduler/tempFileCleanup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

validateEnv();

const app = express();
const httpServer = createServer(app);

// Initialize database
db.connect();

// Initialize Redis and Queue Workers
async function initializeQueue() {
  try {
    await redisManager.connect();
    await initializeWorkers();
    logger.info("Queue system initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize queue system:", error);
    // Continue without queue system if it fails
  }
}

// Initialize WebSocket server
function initializeWebSocket() {
  try {
    websocketService.initialize(httpServer, {
      cors: {
        origin: config.corsOrigin || "*",
        credentials: true,
      },
    });
    logger.info("WebSocket service initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize WebSocket service:", error);
    // Continue without WebSocket if it fails
  }
}

initializeQueue();
initializeWebSocket();

// Initialize temp file cleanup scheduler with cron
tempFileCleanupScheduler.start();
logger.info("Temp file cleanup scheduler started with cron");

app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(requestLogger);

route(app);

app.use(notFoundHandler);
app.use(errorHandler);

httpServer.listen(config.port, () => {
  logger.info(`Server listening at ${config.baseUrl}:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info("WebSocket server ready for connections");
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  try {
    // Stop temp file cleanup scheduler
    tempFileCleanupScheduler.stop();
    logger.info("Temp file cleanup scheduler stopped");
    
    // Close WebSocket connections first
    await websocketService.shutdown();
    logger.info("WebSocket service shut down");
    
    // Stop queue workers
    await shutdownWorkers();
    logger.info("Queue workers shut down");
    
    // Close all queues
    await queueService.closeAll();
    logger.info("Queue service closed");
    
    // Disconnect Redis
    await redisManager.disconnect();
    logger.info("Redis disconnected");
    
    // Close HTTP server (wait for it to finish!)
    await new Promise((resolve) => {
      httpServer.close(() => {
        logger.info("HTTP server closed");
        resolve();
      });
    });
    
    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle nodemon restarts (SIGUSR2)
process.once("SIGUSR2", async () => {
  logger.info("Nodemon restart signal received");
  await gracefulShutdown("SIGUSR2");
});