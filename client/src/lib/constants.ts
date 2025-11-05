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
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
