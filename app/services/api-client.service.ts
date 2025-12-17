/**
 * API Client Service
 * 
 * Centralized Axios client with interceptors for auth, error handling, and retries
 * Supports mock mode via environment variable
 */

import axios, { type AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG, HTTP_STATUS, getBaseURLForRequest, isDistributionAPI } from '~/config/api.config';

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

/**
 * Create API client instance
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

/**
 * Add authentication token to requests and handle hybrid routing
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get auth token from storage or context
    const token = getAuthToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Hybrid mode: Route Distribution APIs to mock server, everything else to real backend
    if (API_CONFIG.HYBRID_MODE && config.url) {
      const targetBaseURL = getBaseURLForRequest(config.url);
      config.baseURL = targetBaseURL;
      
      const isMockRoute = isDistributionAPI(config.url);
      if (isMockRoute) {
        console.log(`[HYBRID → MOCK] ${config.method?.toUpperCase()} ${config.url}`);
      } else {
        console.log(`[HYBRID → BACKEND] ${config.method?.toUpperCase()} ${config.url}`);
      }
    } else if (API_CONFIG.MOCK_MODE) {
      // Full mock mode - all requests go to mock
      config.baseURL = API_CONFIG.MOCK_BASE_URL;
      console.log(`[MOCK MODE] ${config.method?.toUpperCase()} ${config.url}`);
    } else if (import.meta.env.DEV) {
      // Normal development mode
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================

/**
 * Handle responses and errors globally
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (import.meta.env.DEV && !API_CONFIG.MOCK_MODE) {
      console.log(`[API Response] ${response.status} ${response.config.url}`);
    }
    
    return response;
  },
  async (error: AxiosError) => {
    // Log error in development
    if (import.meta.env.DEV) {
      console.error(`[API Error] ${error.message}`, error.response?.data);
    }
    
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      
      // Unauthorized - redirect to login
      if (status === HTTP_STATUS.UNAUTHORIZED) {
        handleUnauthorized();
        return Promise.reject(error);
      }
      
      // Forbidden - show access denied
      if (status === HTTP_STATUS.FORBIDDEN) {
        handleForbidden();
        return Promise.reject(error);
      }
      
      // Conflict - might be version conflict or exposure control
      if (status === HTTP_STATUS.CONFLICT) {
        // Let the component handle conflict resolution
        return Promise.reject(error);
      }
      
      // Server errors - might be retryable
      if (status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
        // Auto-retry for 5xx errors
        const config = error.config;
        if (config && shouldRetry(config)) {
          return retryRequest(config);
        }
      }
    } else if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      // Network error or timeout - might be retryable
      const config = error.config;
      if (config && shouldRetry(config)) {
        return retryRequest(config);
      }
    }
    
    return Promise.reject(error);
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get authentication token
 * TODO: Replace with actual auth context
 */
function getAuthToken(): string | null {
  // In a real app, this would get token from auth context or local storage
  // For now, return null (backend might not require auth in development)
  return null;
}

/**
 * Handle unauthorized access
 * Note: Server-side loaders handle 401 redirects, so client-side just logs
 */
function handleUnauthorized(): void {
  // Server-side loaders will handle redirect on 401
  // Client-side just logs for debugging
  console.warn('[Auth] Unauthorized access detected');
}

/**
 * Handle forbidden access
 */
function handleForbidden(): void {
  // In a real app, this would show an access denied message
  console.warn('[Auth] Forbidden - insufficient permissions');
}

/**
 * Check if request should be retried
 */
function shouldRetry(config: InternalAxiosRequestConfig): boolean {
  // Don't retry if already retried max times
  const retryCount = (config as InternalAxiosRequestConfig & { _retryCount?: number })._retryCount ?? 0;
  if (retryCount >= API_CONFIG.RETRY.MAX_ATTEMPTS) {
    return false;
  }
  
  // Only retry GET requests by default (unless explicitly marked as retryable)
  const isRetryable = (config as InternalAxiosRequestConfig & { _retryable?: boolean })._retryable ?? config.method === 'get';
  return isRetryable;
}

/**
 * Retry request with exponential backoff
 */
async function retryRequest(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const retryCount = ((config as InternalAxiosRequestConfig & { _retryCount?: number })._retryCount ?? 0) + 1;
  (config as InternalAxiosRequestConfig & { _retryCount?: number })._retryCount = retryCount;
  
  // Calculate delay with exponential backoff
  const delay = Math.min(
    API_CONFIG.RETRY.INITIAL_DELAY * Math.pow(API_CONFIG.RETRY.BACKOFF_MULTIPLIER, retryCount - 1),
    API_CONFIG.RETRY.MAX_DELAY
  );
  
  console.log(`[API] Retrying request (attempt ${retryCount}/${API_CONFIG.RETRY.MAX_ATTEMPTS}) after ${delay}ms`);
  
  // Wait before retrying
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Retry the request
  return apiClient.request(config);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Mark a request as retryable (even if it's not a GET)
 */
export function markAsRetryable(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  (config as InternalAxiosRequestConfig & { _retryable?: boolean })._retryable = true;
  return config;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && (
    error.code === 'ECONNABORTED' ||
    error.message === 'Network Error' ||
    !error.response
  );
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.code === 'ECONNABORTED';
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  return axios.isAxiosError(error) && 
    error.response !== undefined &&
    error.response.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Check if error is a client error (4xx)
 */
export function isClientError(error: unknown): boolean {
  return axios.isAxiosError(error) && 
    error.response !== undefined &&
    error.response.status >= HTTP_STATUS.BAD_REQUEST &&
    error.response.status < HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Get error status code
 */
export function getErrorStatus(error: unknown): number | null {
  return axios.isAxiosError(error) && error.response 
    ? error.response.status 
    : null;
}

/**
 * Get error data
 */
export function getErrorData<T = unknown>(error: unknown): T | null {
  return axios.isAxiosError(error) && error.response 
    ? error.response.data as T
    : null;
}

