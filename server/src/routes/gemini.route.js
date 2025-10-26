import express from 'express';
import multer from 'multer';
import {
  getOperations,
  getTemplates,
  textToImage,
  editSimple,
  editComplex,
  compose,
  styleTransfer,
  quickAction,
  textRendering,
} from '../controllers/gemini.controller.js';
import {
  validateTextToImage,
  validateSimpleEdit,
  validateComplexEdit,
  validateComposition,
  validateStyleTransfer,
  validateQuickAction,
  validateTextRendering,
  validateRequestWithCleanup
} from '../middlewares/validators.js';
import {
  uploadSingle,
  uploadMultiple,
  uploadStyleTransfer
} from '../middlewares/upload.js';
import { GEMINI_LIMITS, GEMINI_ERRORS } from '../utils/constant.js';

const router = express.Router();

// GET /api/generate/operations - List available operations with costs
router.get('/operations', getOperations);

// GET /api/generate/templates - List available templates
router.get('/templates', getTemplates);

// POST /api/generate/text-to-image - Generate image from text (100 tokens)
router.post('/text-to-image', 
  validateTextToImage,
  validateRequestWithCleanup,
  textToImage
);

// POST /api/generate/edit-simple - Simple image editing (100 tokens)
router.post('/edit-simple', 
  uploadSingle,
  validateSimpleEdit,
  validateRequestWithCleanup,
  editSimple
);

// POST /api/generate/edit-complex - Complex image editing (150 tokens)
router.post('/edit-complex', 
  uploadSingle,
  validateComplexEdit,
  validateRequestWithCleanup,
  editComplex
);

// POST /api/generate/compose - Multi-image composition (200 tokens)
router.post('/compose', 
  uploadMultiple,
  validateComposition,
  validateRequestWithCleanup,
  compose
);

// POST /api/generate/style-transfer - Style transfer (150 tokens)
router.post('/style-transfer', 
  uploadStyleTransfer,
  validateStyleTransfer,
  validateRequestWithCleanup,
  styleTransfer
);

// POST /api/generate/quick-action - Quick actions (100 tokens)
router.post('/quick-action', 
  uploadSingle,
  validateQuickAction,
  validateRequestWithCleanup,
  quickAction
);

// POST /api/generate/text-rendering - Generate images with text (100 tokens)
router.post('/text-rendering', 
  validateTextRendering,
  validateRequestWithCleanup,
  textRendering
);

// Error handling middleware for file upload errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        status: 400,
        message: `File too large. Maximum size is ${GEMINI_LIMITS.FILE_SIZE_MAX / (1024 * 1024)}MB`,
        code: GEMINI_ERRORS.IMAGE_TOO_LARGE
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        status: 400,
        message: `Too many files. Maximum ${GEMINI_LIMITS.FILE_COUNT_MAX} files allowed`,
        code: GEMINI_ERRORS.INVALID_FILE_TYPE
      });
    }
    return res.status(400).json({
      success: false,
      status: 400,
      message: `File upload error: ${error.message}`,
      code: GEMINI_ERRORS.UPLOAD_FAILED
    });
  }
  next(error);
});

export default router;
