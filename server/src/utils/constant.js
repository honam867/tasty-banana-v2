export const HTTP_STATUS = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 403,
  GEN_UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_TEMPORARILY_OVERLOADED: 502,
  SERVICE_UNAVAILABLE: 503,
  CONFLICT: 409,
  TOO_MANY_REQUEST: 429,
};

export const ROLE = {
  OWNER: "owner",
  ADMIN: "admin",
  MOD: "mod",
  WAREHOUSE: "warehouse",
  USER: "user",
};

export const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const TOKEN_USAGE = {
  DEFAULT: 1000,
};

// Token Transaction Types
export const TOKEN_TRANSACTION_TYPES = {
  CREDIT: "credit",
  DEBIT: "debit",
};

// Token Actor Types
export const TOKEN_ACTOR_TYPES = {
  SYSTEM: "system",
  USER: "user",
  ADMIN: "admin",
};

// Token Reason Codes
export const TOKEN_REASON_CODES = {
  SIGNUP_BONUS: "signup_bonus",
  ADMIN_TOPUP: "admin_topup",
  SPEND_GENERATION: "spend_generation",
};

// Token Pagination Defaults
export const TOKEN_PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
};

// Image Generation Operation Types
export const IMAGE_OPERATION_TYPES = {
  TEXT_TO_IMAGE: "text_to_image",
  IMAGE_REFERENCE: "image_reference",
  IMAGE_MULTIPLE_REFERENCE: "image_multiple_reference",
};

// Image Reference Types
export const IMAGE_REFERENCE_TYPES = {
  SUBJECT: "subject",
  FACE: "face",
  FULL_IMAGE: "full_image"
};

export const IMAGE_REFERENCE_TYPES_ARRAY = ['subject', 'face', 'full_image'];

// Prompt Template Categories
export const PROMPT_TEMPLATE_CATEGORIES = {
  GENERAL: 'general',
  TEXT_TO_IMAGE: 'text_to_image',
  SINGLE_REFERENCE: 'single_reference',
  MULTIPLE_REFERENCE: 'multiple_reference'
};

// Gemini Image Generation Constants
export const GEMINI_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];

// Gemini Error Codes
export const GEMINI_ERRORS = {
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_IMAGE_FORMAT: 'INVALID_IMAGE_FORMAT',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  INVALID_PROMPT: 'INVALID_PROMPT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  UPLOAD_FAILED: 'UPLOAD_FAILED'
};

// Generation Status
export const GENERATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Upload Purpose Types
export const UPLOAD_PURPOSE = {
  GENERATION_OUTPUT: 'generation_output',
  GENERATION_INPUT: 'generation_input',
};

// Storage Provider Types
export const STORAGE_PROVIDER = {
  R2: 'r2',
};

// Temporary File Configuration
export const TEMP_FILE_CONFIG = {
  DEFAULT_EXPIRATION_MS: 5 * 60 * 1000, // 5 minutes (temp file TTL)
  CLEANUP_CRON: process.env.TEMP_FILE_CLEANUP_CRON || '*/5 * * * *', // Run cleanup every 5 minutes (cron syntax)
  PURPOSE: {
    REFERENCE_IMAGE: 'reference_image',
  }
};

// Gemini Model Configuration
export const GEMINI_CONFIG = {
  DEFAULT_MODEL: process.env.GEMINI_MODEL,
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_TOP_K: 40,
  DEFAULT_TOP_P: 0.95,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 15,
  MAX_RETRY_ATTEMPTS: 3
};

// Supported Gemini Models (future-ready for multiple models)
export const GEMINI_MODELS = {
  FLASH_IMAGE: process.env.GEMINI_MODEL,  // Currently the only image generation model
  // Future models will be added here when Google releases them:
  // FLASH_IMAGE_PRO: 'gemini-2.5-flash-image-pro',
  // PRO_IMAGE: 'gemini-2.5-pro-image',
};

export const GEMINI_SUPPORTED_MODELS = Object.values(GEMINI_MODELS);

export const GEMINI_LIMITS = {
  PROMPT_MIN_LENGTH: 5,
  PROMPT_MAX_LENGTH: 2000,
  PROMPT_MAX_LENGTH_SHORT: 1000,
  CUSTOM_PROMPT_MAX_LENGTH: 500,
  FILE_SIZE_MAX: 10 * 1024 * 1024, // 10MB
  FILE_COUNT_MAX: 5,
  IMAGE_WIDTH_MAX: 4096,
  IMAGE_HEIGHT_MAX: 4096,
  IMAGE_WIDTH_MIN: 32,
  IMAGE_HEIGHT_MIN: 32,
  COMPOSE_IMAGES_MIN: 2,
  COMPOSE_IMAGES_MAX: 3,
  NUMBER_OF_IMAGES_MIN: 1,
  NUMBER_OF_IMAGES_MAX: 4,
  REFERENCE_IMAGES_MIN: 1,
  REFERENCE_IMAGES_MAX: 5,
  TOTAL_IMAGES_MAX: 6 // 1 target + 5 references
};

export const GEMINI_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp'
];

export const GEMINI_ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp'
];

export const setResetPassEmailContent = (username, newPassword) => {
  return `Your new password for user ${username} in Ecomx system is: \n ${newPassword} \n If you did not request to reset your password, it is safe to disregard this message. You can learn more about why you may have received this email here.\n
  Best regards, \n
  The Ecomx Team`;
};

export const randomPassword = (length) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
};
