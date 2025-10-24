/**
 * Job Type Definitions
 * Central registry for all job types in the system
 * 
 * Add your queue names and job types here as you implement them.
 */

/**
 * Queue Names - Define your queues here
 * 
 * Example:
 * export const QUEUE_NAMES = {
 *   EMAIL: "email",
 *   FILE_PROCESSING: "file-processing",
 * };
 */
export const QUEUE_NAMES = {
  // Add your queue names here
};

/**
 * Job Types - Define specific job types within queues
 * 
 * Example:
 * export const JOB_TYPES = {
 *   EMAIL: {
 *     SEND_WELCOME: "send-welcome-email",
 *     SEND_VERIFICATION: "send-verification-email",
 *   },
 * };
 */
export const JOB_TYPES = {
  // Add your job types here
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
