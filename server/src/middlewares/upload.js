/**
 * Multer Upload Configuration for Gemini Image Processing
 * Reusable upload middleware with validation
 */

import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import {
  GEMINI_ALLOWED_TYPES,
  GEMINI_ALLOWED_EXTENSIONS,
  GEMINI_LIMITS
} from '../utils/constant.js';
import logger from '../config/logger.js';

/**
 * Create multer configuration for image uploads
 */
export const createImageUpload = () => multer({
  dest: 'uploads/',
  limits: {
    fileSize: GEMINI_LIMITS.FILE_SIZE_MAX,
    files: GEMINI_LIMITS.FILE_COUNT_MAX
  },
  fileFilter: async (req, file, cb) => {
    try {
      // Validate MIME type
      if (!GEMINI_ALLOWED_TYPES.includes(file.mimetype)) {
        return cb(
          new Error(`Invalid file type. Allowed: ${GEMINI_ALLOWED_EXTENSIONS.join(', ')}`), 
          false
        );
      }

      // Validate file extension
      const ext = path.extname(file.originalname).toLowerCase();
      if (!GEMINI_ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(new Error('Invalid file extension'), false);
      }

      // Basic image validation with Sharp (if buffer is available)
      try {
        if (file.buffer) {
          const info = await sharp(file.buffer).metadata();
          
          // Validate dimensions
          if (info.width > GEMINI_LIMITS.IMAGE_WIDTH_MAX || info.height > GEMINI_LIMITS.IMAGE_HEIGHT_MAX) {
            return cb(
              new Error(`Image dimensions too large. Maximum: ${GEMINI_LIMITS.IMAGE_WIDTH_MAX}x${GEMINI_LIMITS.IMAGE_HEIGHT_MAX} pixels`), 
              false
            );
          }
          
          if (info.width < GEMINI_LIMITS.IMAGE_WIDTH_MIN || info.height < GEMINI_LIMITS.IMAGE_HEIGHT_MIN) {
            return cb(
              new Error(`Image dimensions too small. Minimum: ${GEMINI_LIMITS.IMAGE_WIDTH_MIN}x${GEMINI_LIMITS.IMAGE_HEIGHT_MIN} pixels`), 
              false
            );
          }
        }

        cb(null, true);
      } catch (sharpError) {
        logger.warn('Image validation with Sharp failed:', sharpError.message);
        // Allow upload even if Sharp validation fails
        cb(null, true);
      }
    } catch (error) {
      cb(error, false);
    }
  }
});

// Single image upload
export const uploadSingle = createImageUpload().single('image');

// Multiple images upload (for composition)
export const uploadMultiple = createImageUpload().array('images', GEMINI_LIMITS.COMPOSE_IMAGES_MAX);

// Multiple named fields (for style transfer)
export const uploadStyleTransfer = createImageUpload().fields([
  { name: 'contentImage', maxCount: 1 },
  { name: 'styleImage', maxCount: 1 }
]);

// Multiple reference upload (target + references)
export const uploadMultipleReference = createImageUpload().fields([
  { name: 'targetImage', maxCount: 1 },
  { name: 'referenceImages', maxCount: GEMINI_LIMITS.REFERENCE_IMAGES_MAX }
]);
