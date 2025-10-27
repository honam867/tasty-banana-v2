import fs from "fs";
import logger from "../config/logger.js";

/**
 * Clean up a temporary file if it exists
 * Safely removes files without throwing errors if file doesn't exist
 * @param {string} filePath - Path to the file to cleanup
 * @returns {void}
 */
export const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      logger.debug(`Cleaned up file: ${filePath}`);
    } catch (error) {
      logger.warn(`Failed to cleanup file ${filePath}:`, error);
    }
  }
};

/**
 * Clean up multiple temporary files
 * @param {Array<string>} filePaths - Array of file paths to cleanup
 * @returns {void}
 */
export const cleanupFiles = (filePaths) => {
  if (!Array.isArray(filePaths)) {
    logger.warn('cleanupFiles expects an array of file paths');
    return;
  }
  
  filePaths.forEach(filePath => cleanupFile(filePath));
};

/**
 * Check if file exists
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file exists
 */
export const fileExists = (filePath) => {
  return filePath && fs.existsSync(filePath);
};

/**
 * Get file size in bytes
 * @param {string} filePath - Path to the file
 * @returns {number} File size in bytes
 */
export const getFileSize = (filePath) => {
  if (!fileExists(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const stats = fs.statSync(filePath);
  return stats.size;
};

/**
 * Read file as buffer
 * @param {string} filePath - Path to the file
 * @returns {Promise<Buffer>} File contents as buffer
 */
export const readFileAsBuffer = async (filePath) => {
  if (!fileExists(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  return await fs.promises.readFile(filePath);
};

export default {
  cleanupFile,
  cleanupFiles,
  fileExists,
  getFileSize,
  readFileAsBuffer,
};
