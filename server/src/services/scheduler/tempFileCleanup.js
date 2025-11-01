import cron from "node-cron";
import tempFileManager from "../../utils/tempFileManager.js";
import { TEMP_FILE_CONFIG } from "../../utils/constant.js";
import logger from "../../config/logger.js";

/**
 * Temp File Cleanup Scheduler
 * Runs periodic cleanup of expired temporary files using cron
 */
class TempFileCleanupScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Start the cleanup scheduler with cron expression
   * @param {string} cronExpression - Cron expression (default: every 5 minutes)
   */
  start(cronExpression = TEMP_FILE_CONFIG.CLEANUP_CRON) {
    if (this.isRunning) {
      logger.warn("Temp file cleanup scheduler is already running");
      return;
    }

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    logger.info(
      `Starting temp file cleanup scheduler (cron: ${cronExpression})`
    );

    // Schedule task with node-cron
    this.task = cron.schedule(
      cronExpression,
      () => {
        this.runCleanup();
      },
      {
        scheduled: true,
        timezone: "UTC", // Use UTC to avoid timezone issues
      }
    );

    // Run cleanup immediately on start
    this.runCleanup();

    this.isRunning = true;
  }

  /**
   * Run cleanup task
   */
  runCleanup() {
    try {
      const cleaned = tempFileManager.cleanupExpired();
      const stats = tempFileManager.getStats();

      if (cleaned > 0) {
        logger.info(
          `Temp file cleanup: removed ${cleaned} expired files. Active: ${stats.active}, Total: ${stats.total}`
        );
      } else {
        logger.debug(
          `Temp file cleanup: no expired files. Active: ${stats.active}, Total: ${stats.total}`
        );
      }
    } catch (error) {
      logger.error("Temp file cleanup error:", error);
    }
  }

  /**
   * Stop the cleanup scheduler
   */
  stop() {
    if (!this.isRunning) {
      logger.warn("Temp file cleanup scheduler is not running");
      return;
    }

    if (this.task) {
      this.task.stop(); // Graceful stop
      this.task = null;
    }

    this.isRunning = false;
    logger.info("Temp file cleanup scheduler stopped");
  }

  /**
   * Check if scheduler is running
   * @returns {boolean}
   */
  getStatus() {
    return this.isRunning;
  }
}

// Export singleton instance
export default new TempFileCleanupScheduler();
