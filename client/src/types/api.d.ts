/**
 * API Response Types
 * Define your backend API response structures here
 */

/**
 * Standard API Response Wrapper
 * Matches the backend sendSuccess/throwError format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Pagination Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * User Type
 * Matches server response from auth endpoints
 */
export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Login Response
 * Server returns: { success: true, status: 200, message: string, user: User, token: string }
 */
export interface LoginResponse {
  success: boolean;
  status: number;
  message: string;
  user: User;
  token: string;
}

/**
 * Register Response
 * Server returns: { success: true, status: 200, message: string, data: { user: User, token: string, tokensGranted: number } }
 */
export interface RegisterResponse {
  success: boolean;
  status: number;
  message: string;
  data: {
    user: User;
    token: string;
    tokensGranted: number;
  };
}

/**
 * Auth Response (generic)
 */
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

/**
 * Error Response
 */
export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode: number;
}

/**
 * Request State for Hooks
 */
export interface RequestState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
