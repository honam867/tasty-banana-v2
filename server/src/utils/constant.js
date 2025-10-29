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
  TEXT_TO_IMAGE: "text_to_image",
  IMAGE_EDIT_SIMPLE: "image_edit_simple",
  IMAGE_EDIT_COMPLEX: "image_edit_complex",
  MULTI_IMAGE_COMPOSITION: "multi_image_composition",
  STYLE_TRANSFER: "style_transfer",
  QUICK_ACTION: "quick_action",
  TEXT_RENDERING: "text_rendering",
  CUSTOM_PROMPT: "custom_prompt",
};

// Token Pagination Defaults
export const TOKEN_PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
};

export const DATE = {
  DAYS: "days",
  WEEKS: "weeks",
  MONTHS: "months",
};

// Image Generation Operation Types
export const IMAGE_OPERATION_TYPES = {
  TEXT_TO_IMAGE: "text_to_image",
  IMAGE_EDIT_SIMPLE: "image_edit_simple",
  IMAGE_EDIT_COMPLEX: "image_edit_complex",
  MULTI_IMAGE_COMPOSITION: "multi_image_composition",
  STYLE_TRANSFER: "style_transfer",
  QUICK_ACTION: "quick_action",
  TEXT_RENDERING: "text_rendering",
  CUSTOM_PROMPT: "custom_prompt",
};

// Gemini Image Generation Constants
export const GEMINI_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];

export const GEMINI_TEMPLATES = {
  SIMPLE: [
    'remove_background',
    'flip_horizontal',
    'flip_vertical',
    'enhance_lighting',
    'add_shadows',
    'center_product',
    'sharpen_details',
    'enhance_colors'
  ],
  COMPLEX: [
    'complete_transformation',
    'background_scene_change',
    'lighting_enhancement',
    'color_correction'
  ],
  COMPOSITION: [
    'product_lifestyle',
    'product_grouping',
    'scene_creation'
  ],
  STYLE_TRANSFER: [
    'artistic_style',
    'mood_transfer',
    'aesthetic_enhancement'
  ]
};

export const GEMINI_QUICK_ACTIONS = [
  'remove_background',
  'flip_horizontal',
  'flip_vertical',
  'enhance_lighting',
  'add_shadows',
  'center_product',
  'sharpen_details',
  'enhance_colors'
];

export const GEMINI_DESIGN_CATEGORIES = [
  'logo_design',
  'banner_design',
  'social_media'
];

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
  INIT: 'init',
  MASK: 'mask',
  REFERENCE: 'reference',
  ATTACHMENT: 'attachment'
};

// Storage Provider Types
export const STORAGE_PROVIDER = {
  R2: 'r2',
  S3: 's3',
  LOCAL: 'local'
};

// Gemini Model Configuration
export const GEMINI_CONFIG = {
  DEFAULT_MODEL: 'gemini-2.5-flash-image',
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_TOP_K: 40,
  DEFAULT_TOP_P: 0.95,
  COMPLEX_EDIT_TEMPERATURE: 0.6,
  COMPLEX_EDIT_TOP_K: 35,
  COMPLEX_EDIT_TOP_P: 0.92,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 15,
  MAX_RETRY_ATTEMPTS: 3
};

export const GEMINI_LIMITS = {
  PROMPT_MIN_LENGTH: 5,
  PROMPT_MAX_LENGTH: 2000,
  PROMPT_MAX_LENGTH_SHORT: 1000,
  CUSTOM_PROMPT_MAX_LENGTH: 500,
  TEXT_MAX_LENGTH: 200,
  FILE_SIZE_MAX: 10 * 1024 * 1024, // 10MB
  FILE_COUNT_MAX: 5,
  IMAGE_WIDTH_MAX: 4096,
  IMAGE_HEIGHT_MAX: 4096,
  IMAGE_WIDTH_MIN: 32,
  IMAGE_HEIGHT_MIN: 32,
  COMPOSE_IMAGES_MIN: 2,
  COMPOSE_IMAGES_MAX: 3,
  NUMBER_OF_IMAGES_MIN: 1,
  NUMBER_OF_IMAGES_MAX: 4
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
