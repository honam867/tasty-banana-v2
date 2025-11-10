/**
 * Job Type Definitions
 * Central registry for all job types in the system
 * 
 * Add your queue names and job types here as you implement them.
 */

/**
 * Queue Names - Define your queues here
 */
export const QUEUE_NAMES = {
  IMAGE_GENERATION: "image-generation",
  IMAGE_REFERENCE: "image-reference", // For future use
};

/**
 * Job Types - Define specific job types within queues
 */
export const JOB_TYPES = {
  IMAGE_GENERATION: {
    TEXT_TO_IMAGE: "text-to-image",
    IMAGE_REFERENCE: "image-reference",
    IMAGE_MULTIPLE_REFERENCE: "image-multiple-reference",
    IMAGE_EDIT_SIMPLE: "image-edit-simple",
    IMAGE_EDIT_COMPLEX: "image-edit-complex",
    STYLE_TRANSFER: "style-transfer",
    COMPOSE: "compose",
    TEXT_RENDERING: "text-rendering",
  },
  IMAGE_REFERENCE: {
    PROCESS: "process-reference", // For future use
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
 * Validation helper for job data
 * Add your custom validators here as you implement job types
 * 
 * Example:
 * export class JobValidator {
 *   static validateEmail(data) {
 *     if (!data.to || !data.subject) {
 *       throw new Error("Email requires: to and subject");
 *     }
 *     return true;
 *   }
 * }
 */
export class JobValidator {
  /**
   * Generic validator - implement your validation logic
   */
  static validate(jobType, data) {
    // Add your validation logic here
    return true;
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
