/**
 * Request Validators
 * Provides reusable validation functions and middleware
 */

import { body, validationResult } from 'express-validator';
import fs from 'fs';
import {
  GEMINI_ASPECT_RATIOS,
  GEMINI_LIMITS,
  IMAGE_REFERENCE_TYPES_ARRAY
} from '../utils/constant.js';

// ========================================
// Token Operation Validators
// ========================================

/**
 * Validate token amount
 */
export const validateAmount = (amount) => {
  if (!Number.isInteger(amount)) {
    throw new Error("Amount must be an integer");
  }
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }
  if (amount > 1000000) {
    throw new Error("Amount exceeds maximum limit");
  }
  return amount;
};



/**
 * Validate idempotency key format
 */
export const validateIdempotencyKey = (key) => {
  if (!key) return null;

  if (typeof key !== "string") {
    throw new Error("Idempotency key must be a string");
  }
  if (key.length < 1 || key.length > 128) {
    throw new Error("Idempotency key must be 1-128 characters");
  }
  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    throw new Error("Idempotency key contains invalid characters");
  }
  return key;
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (limit, cursor) => {
  let validLimit = 20; // default
  if (limit !== undefined) {
    const parsed = parseInt(limit, 10);
    if (isNaN(parsed) || parsed < 1) {
      throw new Error("Limit must be a positive integer");
    }
    validLimit = Math.min(parsed, 100); // cap at 100
  }

  let validCursor = null;
  if (cursor !== undefined && cursor !== null) {
    if (typeof cursor !== "string") {
      throw new Error("Cursor must be a string");
    }
    validCursor = cursor;
  }

  return { limit: validLimit, cursor: validCursor };
};

/**
 * Validate user ID format (UUID)
 */
export const validateUserId = (userId) => {
  if (!userId) {
    throw new Error("User ID is required");
  }
  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error("Invalid user ID format");
  }
  return userId;
};

/**
 * Validate metadata object size
 */
export const validateMetadata = (metadata) => {
  if (!metadata) return {};

  if (typeof metadata !== "object") {
    throw new Error("Metadata must be an object");
  }

  const jsonString = JSON.stringify(metadata);
  if (jsonString.length > 10000) {
    // 10KB limit
    throw new Error("Metadata exceeds size limit");
  }

  return metadata;
};

// ========================================
// Gemini Image Generation Validators
// ========================================

/**
 * Validate text-to-image request
 */
export const validateTextToImage = [
  body('prompt')
    .notEmpty().withMessage('Prompt is required')
    .isLength({ 
      min: GEMINI_LIMITS.PROMPT_MIN_LENGTH, 
      max: GEMINI_LIMITS.PROMPT_MAX_LENGTH 
    })
    .withMessage(`Prompt must be ${GEMINI_LIMITS.PROMPT_MIN_LENGTH}-${GEMINI_LIMITS.PROMPT_MAX_LENGTH} characters`),
  body('aspectRatio')
    .optional({ values: 'falsy' })
    .isIn(GEMINI_ASPECT_RATIOS)
    .withMessage(`Invalid aspect ratio. Allowed: ${GEMINI_ASPECT_RATIOS.join(', ')}`),
  body('numberOfImages')
    .optional({ values: 'falsy' })
    .isInt({ 
      min: GEMINI_LIMITS.NUMBER_OF_IMAGES_MIN, 
      max: GEMINI_LIMITS.NUMBER_OF_IMAGES_MAX 
    })
    .withMessage(`Number of images must be between ${GEMINI_LIMITS.NUMBER_OF_IMAGES_MIN} and ${GEMINI_LIMITS.NUMBER_OF_IMAGES_MAX}`),
  body('projectId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Invalid project ID'),
  body('promptTemplateId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Invalid prompt template ID')
];

/**
 * Validate image reference request
 */
export const validateImageReference = [
  body('prompt')
    .notEmpty().withMessage('Prompt is required')
    .isLength({ 
      min: GEMINI_LIMITS.PROMPT_MIN_LENGTH, 
      max: GEMINI_LIMITS.PROMPT_MAX_LENGTH 
    })
    .withMessage(`Prompt must be ${GEMINI_LIMITS.PROMPT_MIN_LENGTH}-${GEMINI_LIMITS.PROMPT_MAX_LENGTH} characters`),
  body('referenceType')
    .notEmpty().withMessage('Reference type is required')
    .isIn(IMAGE_REFERENCE_TYPES_ARRAY)
    .withMessage(`Invalid reference type. Allowed: ${IMAGE_REFERENCE_TYPES_ARRAY.join(', ')}`),
  body('referenceImageId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Invalid reference image ID'),
  body('aspectRatio')
    .optional({ values: 'falsy' })
    .isIn(GEMINI_ASPECT_RATIOS)
    .withMessage(`Invalid aspect ratio. Allowed: ${GEMINI_ASPECT_RATIOS.join(', ')}`),
  body('numberOfImages')
    .optional({ values: 'falsy' })
    .isInt({ 
      min: GEMINI_LIMITS.NUMBER_OF_IMAGES_MIN, 
      max: GEMINI_LIMITS.NUMBER_OF_IMAGES_MAX 
    })
    .withMessage(`Number of images must be between ${GEMINI_LIMITS.NUMBER_OF_IMAGES_MIN} and ${GEMINI_LIMITS.NUMBER_OF_IMAGES_MAX}`),
  body('projectId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Invalid project ID')
];

/**
 * Validate multiple reference request
 */
export const validateImageMultipleReference = [
  body('prompt')
    .notEmpty().withMessage('Prompt is required')
    .isLength({ 
      min: GEMINI_LIMITS.PROMPT_MIN_LENGTH, 
      max: GEMINI_LIMITS.PROMPT_MAX_LENGTH 
    })
    .withMessage(`Prompt must be ${GEMINI_LIMITS.PROMPT_MIN_LENGTH}-${GEMINI_LIMITS.PROMPT_MAX_LENGTH} characters`),
  body('targetImageId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Invalid target image ID'),
  body('referenceImageIds')
    .optional({ values: 'falsy' })
    .custom((value) => {
      // Can be JSON string or array
      let ids = value;
      if (typeof value === 'string') {
        try {
          ids = JSON.parse(value);
        } catch {
          throw new Error('referenceImageIds must be valid JSON array');
        }
      }
      if (!Array.isArray(ids)) {
        throw new Error('referenceImageIds must be an array');
      }
      if (ids.length < GEMINI_LIMITS.REFERENCE_IMAGES_MIN || ids.length > GEMINI_LIMITS.REFERENCE_IMAGES_MAX) {
        throw new Error(`Reference images must be between ${GEMINI_LIMITS.REFERENCE_IMAGES_MIN} and ${GEMINI_LIMITS.REFERENCE_IMAGES_MAX}`);
      }
      // Validate each ID is UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      for (const id of ids) {
        if (!uuidRegex.test(id)) {
          throw new Error('All reference image IDs must be valid UUIDs');
        }
      }
      return true;
    }),
  body('promptTemplateId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Invalid prompt template ID'),
  body('aspectRatio')
    .optional({ values: 'falsy' })
    .isIn(GEMINI_ASPECT_RATIOS)
    .withMessage(`Invalid aspect ratio. Allowed: ${GEMINI_ASPECT_RATIOS.join(', ')}`),
  body('numberOfImages')
    .optional({ values: 'falsy' })
    .isInt({ 
      min: GEMINI_LIMITS.NUMBER_OF_IMAGES_MIN, 
      max: GEMINI_LIMITS.NUMBER_OF_IMAGES_MAX 
    })
    .withMessage(`Number of images must be between ${GEMINI_LIMITS.NUMBER_OF_IMAGES_MIN} and ${GEMINI_LIMITS.NUMBER_OF_IMAGES_MAX}`),
  body('projectId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Invalid project ID')
];

/**
 * Validate request and cleanup files on failure
 * This middleware should be used after all body validators
 */
export const validateRequestWithCleanup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Cleanup uploaded files if validation fails
    if (req.file) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      } else {
        // Handle multiple named fields
        Object.values(req.files).forEach(fileArray => {
          fileArray.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        });
      }
    }
    
    return res.status(400).json({
      success: false,
      status: 400,
      message: errors.array()[0].msg
    });
  }
  next();
};
