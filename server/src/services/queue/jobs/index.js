/**
 * Job Type Definitions
 * Central registry for all job types in the system
 * Each job type should have a clear schema and purpose
 */

/**
 * Queue Names - All available queues in the system
 */
export const QUEUE_NAMES = {
  IMAGE_GENERATION: "image-generation",
  EMAIL: "email",
  FILE_PROCESSING: "file-processing",
  NOTIFICATIONS: "notifications",
  ANALYTICS: "analytics",
};

/**
 * Job Types - Specific job names within queues
 */
export const JOB_TYPES = {
  // Image Generation Jobs
  IMAGE_GENERATION: {
    GENERATE: "generate-image",
    THUMBNAIL: "generate-thumbnail",
    WATERMARK: "add-watermark",
    RESIZE: "resize-image",
  },

  // Email Jobs
  EMAIL: {
    SEND_WELCOME: "send-welcome-email",
    SEND_VERIFICATION: "send-verification-email",
    SEND_PASSWORD_RESET: "send-password-reset",
    SEND_NOTIFICATION: "send-notification-email",
  },

  // File Processing Jobs
  FILE_PROCESSING: {
    COMPRESS: "compress-file",
    CONVERT: "convert-file",
    SCAN_VIRUS: "scan-virus",
    EXTRACT_METADATA: "extract-metadata",
  },

  // Notification Jobs
  NOTIFICATIONS: {
    PUSH: "send-push-notification",
    SMS: "send-sms",
    IN_APP: "send-in-app-notification",
  },

  // Analytics Jobs
  ANALYTICS: {
    TRACK_EVENT: "track-event",
    GENERATE_REPORT: "generate-report",
    AGGREGATE_DATA: "aggregate-data",
  },
};

/**
 * Job Priority Levels
 */
export const JOB_PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
  VERY_LOW: 5,
};

/**
 * Job Status
 */
export const JOB_STATUS = {
  WAITING: "waiting",
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed",
  DELAYED: "delayed",
  PAUSED: "paused",
};

/**
 * Job Data Schemas (JSDoc for type safety)
 * Define expected structure for each job type
 */

/**
 * @typedef {Object} ImageGenerationJobData
 * @property {string} userId - User ID requesting the image
 * @property {string} prompt - Text prompt for image generation
 * @property {Object} options - Generation options
 * @property {number} options.width - Image width
 * @property {number} options.height - Image height
 * @property {string} options.style - Art style
 * @property {string} [options.model] - AI model to use
 * @property {string} [callbackUrl] - URL to call when complete
 */

/**
 * @typedef {Object} EmailJobData
 * @property {string} to - Recipient email
 * @property {string} subject - Email subject
 * @property {string} template - Email template name
 * @property {Object} data - Template data
 * @property {string} [from] - Sender email (optional)
 */

/**
 * @typedef {Object} FileProcessingJobData
 * @property {string} fileId - File identifier
 * @property {string} filePath - Path to file
 * @property {string} operation - Operation to perform
 * @property {Object} options - Operation-specific options
 */

/**
 * Validation helper for job data
 */
export class JobValidator {
  /**
   * Validate image generation job data
   */
  static validateImageGeneration(data) {
    const required = ["userId", "prompt", "options"];
    const missing = required.filter((field) => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(", ")}`);
    }

    if (!data.options.width || !data.options.height) {
      throw new Error("Image dimensions (width, height) are required");
    }

    return true;
  }

  /**
   * Validate email job data
   */
  static validateEmail(data) {
    if (!data.to || !data.subject || !data.template) {
      throw new Error("Email requires: to, subject, and template");
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.to)) {
      throw new Error("Invalid email address");
    }

    return true;
  }

  /**
   * Validate file processing job data
   */
  static validateFileProcessing(data) {
    if (!data.fileId || !data.filePath || !data.operation) {
      throw new Error("File processing requires: fileId, filePath, and operation");
    }

    return true;
  }

  /**
   * Generic validator router
   */
  static validate(jobType, data) {
    switch (jobType) {
      case JOB_TYPES.IMAGE_GENERATION.GENERATE:
        return this.validateImageGeneration(data);
      case JOB_TYPES.EMAIL.SEND_WELCOME:
      case JOB_TYPES.EMAIL.SEND_VERIFICATION:
      case JOB_TYPES.EMAIL.SEND_PASSWORD_RESET:
        return this.validateEmail(data);
      case JOB_TYPES.FILE_PROCESSING.COMPRESS:
      case JOB_TYPES.FILE_PROCESSING.CONVERT:
        return this.validateFileProcessing(data);
      default:
        return true; // No validation for unknown types
    }
  }
}

/**
 * Helper to create job options with defaults
 */
export function createJobOptions(options = {}) {
  return {
    priority: options.priority || JOB_PRIORITY.NORMAL,
    attempts: options.attempts || 3,
    backoff: options.backoff || {
      type: "exponential",
      delay: 2000,
    },
    delay: options.delay || 0,
    removeOnComplete: options.removeOnComplete !== false,
    removeOnFail: options.removeOnFail !== false,
    ...options,
  };
}
