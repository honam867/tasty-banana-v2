import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG, STORAGE_KEYS, HTTP_STATUS } from './constants';

/**
 * Axios instance configured for backend API communication
 * Base URL: http://localhost:8090
 * Includes automatic token injection and error handling
 */
class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.initializeRequestInterceptor();
    this.initializeResponseInterceptor();
  }

  /**
   * Request Interceptor
   * - Adds authentication token from localStorage
   * - Logs requests in development mode
   */
  private initializeRequestInterceptor() {
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Get token from localStorage
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
            params: config.params,
            data: config.data,
          });
        }

        return config;
      },
      (error: AxiosError) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Response Interceptor
   * - Handles global error responses
   * - Logs responses in development mode
   * - Auto-logout on 401 Unauthorized
   */
  private initializeResponseInterceptor() {
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          });
        }

        return response;
      },
      async (error: AxiosError) => {
        if (error.response) {
          const { status, data } = error.response;

          console.error(`[API Error] ${status}`, data);

          // Handle 401 Unauthorized - clear auth and redirect to login
          if (status === HTTP_STATUS.UNAUTHORIZED) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
              localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
              localStorage.removeItem(STORAGE_KEYS.USER);
              
              // Redirect to login page if not already there
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
            }
          }

          // Handle 403 Forbidden
          if (status === HTTP_STATUS.FORBIDDEN) {
            console.error('Access forbidden');
          }
        } else if (error.request) {
          // Request made but no response received
          console.error('[API Error] No response received', error.request);
        } else {
          // Something else happened
          console.error('[API Error]', error.message);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }

  /**
   * Get raw Axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.instance;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export the class for custom instances if needed
export default apiClient;
