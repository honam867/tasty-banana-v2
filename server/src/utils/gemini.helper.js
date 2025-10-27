import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "../db/drizzle.js";
import { imageGenerations } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { createUpload } from "../services/uploads.service.js";
import { uploadToR2, uploadMultipleToR2 } from "../config/r2.js";
import {
  HTTP_STATUS,
  GENERATION_STATUS,
  UPLOAD_PURPOSE,
  GEMINI_CONFIG,
  STORAGE_PROVIDER,
  GEMINI_ERRORS,
} from "./constant.js";
import { throwError } from "./response.js";
import logger from "../config/logger.js";

/**
 * Create a new image generation record in the database
 * @param {string} userId - User ID
 * @param {string} operationTypeId - Operation type ID (UUID)
 * @param {string} prompt - Generation prompt
 * @param {Object} options - Additional metadata options
 * @returns {Promise<string>} Generation ID
 */
export const createGenerationRecord = async (
  userId,
  operationTypeId,
  prompt,
  options = {}
) => {
  const generationId = crypto.randomUUID();

  try {
    const generation = await db
      .insert(imageGenerations)
      .values({
        id: generationId,
        userId,
        operationTypeId,
        prompt,
        status: GENERATION_STATUS.PENDING,
        model: process.env.GEMINI_MODEL || GEMINI_CONFIG.DEFAULT_MODEL,
        tokensUsed: 0,
        metadata: JSON.stringify({
          ...options,
          startTime: new Date().toISOString(),
        }),
      })
      .returning();

    return generation[0].id;
  } catch (error) {
    logger.error("Failed to create generation record:", error);
    return generationId;
  }
};

/**
 * Update an existing image generation record
 * @param {string} generationId - Generation ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateGenerationRecord = async (generationId, updates) => {
  try {
    await db
      .update(imageGenerations)
      .set({
        ...updates,
        completedAt:
          updates.status === GENERATION_STATUS.COMPLETED
            ? new Date()
            : undefined,
      })
      .where(eq(imageGenerations.id, generationId));
  } catch (error) {
    logger.error("Failed to update generation record:", error);
  }
};

/**
 * Generate R2 storage key with consistent pattern: g/{userId}/{fileName}
 * Pattern specifically for generated images (prefix: g/)
 * @param {string} userId - User ID
 * @param {string} fileName - File name with extension
 * @returns {string} Storage key path
 */
export const generateStorageKey = (userId, fileName) => {
  return `g/${userId}/${fileName}`;
};

/**
 * Save image to R2 storage and create database record
 * @param {Object} options - Configuration options
 * @param {Buffer|Object} options.source - Buffer or imageData object with base64
 * @param {string} options.filePath - File path (alternative to source)
 * @param {string} options.userId - User ID
 * @param {string} options.purpose - Upload purpose (GENERATION_INPUT or GENERATION_OUTPUT)
 * @param {string} options.title - Upload title
 * @param {Object} options.metadata - Additional metadata (generationId, etc.)
 * @returns {Promise<Object>} Upload record with publicUrl, id, etc.
 */
export const saveToStorage = async ({
  source,
  filePath,
  userId,
  purpose,
  title,
  metadata = {},
}) => {
  try {
    let buffer;
    let mimeType;
    let extension;

    // Handle different input sources
    if (filePath) {
      // Read from file path
      buffer = await fs.promises.readFile(filePath);
      extension = path.extname(filePath).toLowerCase().substring(1);
      mimeType = `image/${extension === "jpg" ? "jpeg" : extension}`;
    } else if (source?.imageData) {
      // Handle base64 imageData object
      buffer = Buffer.from(source.imageData, "base64");
      mimeType = source.mimeType;
      extension = mimeType.split("/")[1];
    } else if (Buffer.isBuffer(source)) {
      // Handle direct buffer
      buffer = source;
      mimeType = metadata.mimeType || "image/png";
      extension = mimeType.split("/")[1];
    } else {
      throw new Error("Invalid source: must provide filePath or source");
    }

    // Generate unique filename
    const timestamp = Date.now();
    const generationId = metadata.generationId || crypto.randomUUID();
    const purposePrefix =
      purpose === UPLOAD_PURPOSE.GENERATION_INPUT ? "input" : "gen";
    const fileName = `${purposePrefix}-${generationId}-${timestamp}.${extension}`;

    // Generate storage key
    const storageKey = generateStorageKey(userId, fileName);

    // Upload to R2
    const uploadResult = await uploadToR2({
      buffer,
      key: storageKey,
      contentType: mimeType,
    });

    // Create upload record
    const uploadRecord = await createUpload({
      userId,
      title: title || `Image ${generationId}`,
      purpose,
      mimeType,
      sizeBytes: source?.size || buffer.length,
      storageProvider: STORAGE_PROVIDER.R2,
      storageBucket: process.env.R2_BUCKET,
      storageKey,
      publicUrl: uploadResult.publicUrl,
    });

    return uploadRecord;
  } catch (error) {
    logger.error("Failed to save to storage:", error);
    throwError(
      `Upload failed: ${error.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Save multiple images to R2 storage concurrently and create database records
 * Optimized for batch operations with Promise.all for concurrent uploads
 * @param {Array<Object>} images - Array of image objects to upload
 * @param {Buffer|Object} images[].source - Buffer or imageData object with base64
 * @param {string} images[].userId - User ID
 * @param {string} images[].purpose - Upload purpose
 * @param {string} images[].title - Upload title
 * @param {Object} images[].metadata - Additional metadata
 * @returns {Promise<Array<Object>>} Array of upload records
 */
export const saveMultipleToStorage = async (images) => {
  try {
    if (!Array.isArray(images) || images.length === 0) {
      throw new Error('images must be a non-empty array');
    }

    // Prepare all uploads
    const uploadConfigs = images.map(({ source, userId, purpose, title, metadata = {} }) => {
      let buffer;
      let mimeType;
      let extension;

      // Handle different input sources
      if (source?.imageData) {
        buffer = Buffer.from(source.imageData, "base64");
        mimeType = source.mimeType;
        extension = mimeType.split("/")[1];
      } else if (Buffer.isBuffer(source)) {
        buffer = source;
        mimeType = metadata.mimeType || "image/png";
        extension = mimeType.split("/")[1];
      } else {
        throw new Error("Invalid source: must provide source with imageData or Buffer");
      }

      // Generate unique filename
      const timestamp = Date.now();
      const generationId = metadata.generationId || crypto.randomUUID();
      const purposePrefix = purpose === UPLOAD_PURPOSE.GENERATION_INPUT ? "input" : "gen";
      const imageNumber = metadata.imageNumber || 1;
      const fileName = `${purposePrefix}-${generationId}-${imageNumber}-${timestamp}.${extension}`;

      // Generate storage key
      const storageKey = generateStorageKey(userId, fileName);

      return {
        buffer,
        key: storageKey,
        contentType: mimeType,
        metadata: {},
        // Store additional info for database record creation
        _dbInfo: {
          userId,
          title: title || `Image ${generationId}`,
          purpose,
          mimeType,
          sizeBytes: source?.size || buffer.length,
          storageKey,
        }
      };
    });

    // Upload all files concurrently to R2
    const uploadResults = await uploadMultipleToR2(uploadConfigs);

    // Create database records concurrently
    const uploadRecordPromises = uploadResults.map(async (uploadResult, index) => {
      const dbInfo = uploadConfigs[index]._dbInfo;
      
      return await createUpload({
        userId: dbInfo.userId,
        title: dbInfo.title,
        purpose: dbInfo.purpose,
        mimeType: dbInfo.mimeType,
        sizeBytes: dbInfo.sizeBytes,
        storageProvider: STORAGE_PROVIDER.R2,
        storageBucket: process.env.R2_BUCKET,
        storageKey: dbInfo.storageKey,
        publicUrl: uploadResult.publicUrl,
      });
    });

    const uploadRecords = await Promise.all(uploadRecordPromises);

    return uploadRecords;
  } catch (error) {
    logger.error("Failed to save multiple files to storage:", error);
    throwError(
      `Batch upload failed: ${error.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Map Gemini service errors to appropriate HTTP status codes and error codes
 * @param {Error} error - Error object from Gemini service
 * @returns {Object} Object with code, status, and message properties
 */
export const handleGeminiError = (error) => {
  const errorMap = {
    "Insufficient tokens": {
      code: GEMINI_ERRORS.INSUFFICIENT_BALANCE,
      status: 402,
    },
    "Invalid file type": {
      code: GEMINI_ERRORS.INVALID_FILE_TYPE,
      status: HTTP_STATUS.BAD_REQUEST,
    },
    "File too large": {
      code: GEMINI_ERRORS.IMAGE_TOO_LARGE,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    },
    "Rate limit exceeded": {
      code: GEMINI_ERRORS.RATE_LIMIT_EXCEEDED,
      status: HTTP_STATUS.TOO_MANY_REQUEST,
    },
    "AI operation failed": {
      code: GEMINI_ERRORS.PROCESSING_ERROR,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    },
    "upload failed": {
      code: GEMINI_ERRORS.UPLOAD_FAILED,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    },
  };

  for (const [message, errorInfo] of Object.entries(errorMap)) {
    if (error.message.includes(message)) {
      return {
        code: errorInfo.code,
        status: errorInfo.status,
        message: error.message,
      };
    }
  }

  return {
    code: GEMINI_ERRORS.PROCESSING_ERROR,
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: error.message || "Image processing failed",
  };
};

export default {
  createGenerationRecord,
  updateGenerationRecord,
  generateStorageKey,
  saveToStorage,
  saveMultipleToStorage,
  handleGeminiError,
};
