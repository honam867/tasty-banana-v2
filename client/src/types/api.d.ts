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
 * User Type (example)
 */
export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Auth Response (example)
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
