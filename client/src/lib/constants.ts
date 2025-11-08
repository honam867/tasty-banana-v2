/**
 * API Configuration Constants
 * 
 * Note: BASE_URL now points to Next.js API routes (same origin)
 * This hides the actual backend URL from the browser
 */
export const API_CONFIG = {
  BASE_URL: '', // Empty string = same origin (Next.js API routes)
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

/**
 * API Endpoints
 * These are proxied through Next.js API routes to the backend
 * 
 * Client calls: /api/auth/login
 * Next.js proxies to: http://localhost:8090/api/auth/login (hidden from browser)
 */
export const API_ENDPOINTS = {
  // Auth endpoints (proxied through /api/auth/[...route])
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    FORGOT_PASSWORD: '/api/auth/forgot',
    CHANGE_PASSWORD: '/api/auth/password/change',
  },
  // Add more endpoints as needed
} as const;

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Image Generation Constants
 */
export const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;

export const GENERATION_LIMITS = {
  PROMPT_MIN_LENGTH: 5,
  PROMPT_MAX_LENGTH: 2000,
  MAX_OUTPUTS_UI: 6,  // UI allows up to 6
  MAX_OUTPUTS_API: 4, // But API caps at 4
  MIN_OUTPUTS: 1,
} as const;

export const HINT_TYPES = {
  TEXT_TO_IMAGE: 'text_to_image',
  IMAGE_REFERENCE: 'image_reference',
  STYLE_TRANSFER: 'style_transfer',
} as const;

export const IMAGE_REFERENCE_TYPES = ['subject', 'face', 'full_image'] as const;

export const IMAGE_REFERENCE_TOKEN_COST = 150;
