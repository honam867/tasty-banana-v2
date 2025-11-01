import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../config/logger.js";
import { cleanupFile } from "./file.helper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Temporary File Manager
 * Manages temporary file storage for processing with automatic cleanup
 * Reusable pattern for any feature that needs temporary file handling
 */
class TempFileManager {
  constructor() {
    // Temp directory: server/uploads/temp/
    this.tempDir = path.join(__dirname, "../../uploads/temp");
    
    // In-memory registry of temp files
    // Structure: { tempId: { path, metadata, createdAt, uploadId } }
    this.registry = new Map();
    
    // Default expiration: 5 minutes
    this.defaultExpirationMs = 5 * 60 * 1000;
    
    // Ensure temp directory exists
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      logger.info(`Created temp directory: ${this.tempDir}`);
    }
  }

  /**
   * Store a temporary file from upload
   * @param {string} sourceFilePath - Path to uploaded file (from multer)
   * @param {Object} metadata - Additional metadata to store
   * @param {string} metadata.userId - User ID
   * @param {string} metadata.uploadId - Upload record ID (from R2/database)
   * @param {string} metadata.purpose - Purpose (e.g., 'reference_image')
   * @param {number} expirationMs - Custom expiration time in milliseconds
   * @returns {Promise<string>} Temporary file ID
   */
  async storeTempFile(sourceFilePath, metadata = {}, expirationMs = null) {
    try {
      // Generate unique temp ID
      const tempId = crypto.randomUUID();
      
      // Get file extension
      const ext = path.extname(sourceFilePath);
      
      // Create temp file path
      const tempFileName = `${tempId}${ext}`;
      const tempFilePath = path.join(this.tempDir, tempFileName);
      
      // Copy file to temp location (keep original for potential rollback)
      await fs.promises.copyFile(sourceFilePath, tempFilePath);
      
      // Register in memory
      this.registry.set(tempId, {
        path: tempFilePath,
        metadata: {
          ...metadata,
          originalPath: sourceFilePath,
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + (expirationMs || this.defaultExpirationMs),
      });
      
      logger.debug(`Stored temp file: ${tempId} at ${tempFilePath}`);
      
      return tempId;
    } catch (error) {
      logger.error("Failed to store temp file:", error);
      throw new Error(`Temp file storage failed: ${error.message}`);
    }
  }

  /**
   * Get temporary file path for processing
   * @param {string} tempId - Temporary file ID
   * @returns {string|null} File path or null if not found/expired
   */
  getTempFilePath(tempId) {
    const entry = this.registry.get(tempId);
    
    if (!entry) {
      logger.warn(`Temp file not found in registry: ${tempId}`);
      return null;
    }
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      logger.warn(`Temp file expired: ${tempId}`);
      this.cleanup(tempId); // Auto-cleanup expired
      return null;
    }
    
    // Check file still exists
    if (!fs.existsSync(entry.path)) {
      logger.warn(`Temp file missing on disk: ${tempId}`);
      this.registry.delete(tempId);
      return null;
    }
    
    return entry.path;
  }

  /**
   * Get temp file metadata
   * @param {string} tempId - Temporary file ID
   * @returns {Object|null} Metadata or null if not found
   */
  getMetadata(tempId) {
    const entry = this.registry.get(tempId);
    return entry ? entry.metadata : null;
  }

  /**
   * Check if temp file exists and is valid
   * @param {string} tempId - Temporary file ID
   * @returns {boolean} True if exists and not expired
   */
  exists(tempId) {
    return this.getTempFilePath(tempId) !== null;
  }

  /**
   * Cleanup temporary file after use
   * @param {string} tempId - Temporary file ID
   * @returns {boolean} True if cleaned up successfully
   */
  cleanup(tempId) {
    const entry = this.registry.get(tempId);
    
    if (!entry) {
      logger.debug(`Temp file already cleaned: ${tempId}`);
      return false;
    }
    
    // Remove file from disk
    cleanupFile(entry.path);
    
    // Remove from registry
    this.registry.delete(tempId);
    
    logger.debug(`Cleaned up temp file: ${tempId}`);
    return true;
  }

  /**
   * Cleanup multiple temp files
   * @param {Array<string>} tempIds - Array of temp file IDs
   * @returns {number} Number of files cleaned up
   */
  cleanupMultiple(tempIds) {
    if (!Array.isArray(tempIds)) {
      logger.warn("cleanupMultiple expects an array of temp IDs");
      return 0;
    }
    
    let cleaned = 0;
    tempIds.forEach((tempId) => {
      if (this.cleanup(tempId)) {
        cleaned++;
      }
    });
    
    return cleaned;
  }

  /**
   * Cleanup expired temp files (for scheduled jobs)
   * @returns {number} Number of expired files cleaned up
   */
  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [tempId, entry] of this.registry.entries()) {
      if (now > entry.expiresAt) {
        this.cleanup(tempId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired temp files`);
    }
    
    return cleaned;
  }

  /**
   * Cleanup all temp files (for shutdown or testing)
   * @returns {number} Number of files cleaned up
   */
  cleanupAll() {
    const tempIds = Array.from(this.registry.keys());
    return this.cleanupMultiple(tempIds);
  }

  /**
   * Get statistics about temp files
   * @returns {Object} Statistics object
   */
  getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    
    for (const entry of this.registry.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }
    
    return {
      total: this.registry.size,
      active,
      expired,
      tempDir: this.tempDir,
    };
  }
}

// Export singleton instance
export default new TempFileManager();
