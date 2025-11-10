import lodash from 'lodash';
const { get } = lodash;

import { GEMINI_SUPPORTED_MODELS, HTTP_STATUS } from '../utils/constant.js';
import { throwError } from '../utils/response.js';

/**
 * Validates model parameter from request body
 * Model is optional, but if provided, must be in the supported list
 */
export const validateModel = (req, res, next) => {
  const model = get(req.body, 'model');
  
  // Model is optional, but if provided, must be valid
  if (model && !GEMINI_SUPPORTED_MODELS.includes(model)) {
    throwError(
      `Invalid model. Supported models: ${GEMINI_SUPPORTED_MODELS.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST
    );
  }
  
  next();
};
