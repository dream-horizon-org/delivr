/**
 * API Client Utility
 * Provides a consistent interface for making API calls with proper error handling
 */

interface ApiClientOptions extends RequestInit {
  baseUrl?: string;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | { code?: string; message?: string };
  message?: string;
}

/**
 * Internal helper to extract error message from error field (supports both string and object formats)
 * Note: For external usage, use extractErrorMessage from api-error-utils.ts
 */
function extractErrorMessageInternal(error: unknown): string | undefined {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return typeof error.message === 'string' ? error.message : undefined;
  }
  return undefined;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown,
    public isAuthError?: boolean
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Makes an API request with proper error handling and JSON parsing
 */
async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<ApiResponse<T>> {
  const {
    baseUrl = '',
    timeout = 30000,
    headers = {},
    ...fetchOptions
  } = options;

  const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Detect FormData to skip Content-Type header (browser will set it with boundary)
  const isFormData = fetchOptions.body instanceof FormData;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include', // Send cookies with requests
      headers: {
        // Only set Content-Type for non-FormData requests
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      
      // Special handling for 401 auth errors - backend returns plain text
      const isAuthError = response.status === 401 && (
        text.includes('session') || 
        text.includes('access key') || 
        text.includes('expired') || 
        text.includes('invalid') ||
        text.includes('login')
      );
      
      if (isAuthError) {
        throw new ApiError(
          'Your session has expired. Please refresh the page to log in again.',
          response.status,
          text,
          true // Mark as auth error
        );
      }
      
      throw new ApiError(
        `Server returned ${response.status} ${response.statusText}. Expected JSON but got ${contentType || 'unknown'}`,
        response.status,
        text
      );
    }

    const parsed = await response.json();

    // If HTTP status is not OK, throw with best available message
    if (!response.ok) {
      // Server-side loaders handle 401 redirects, client-side just throws error
      const errorMessage = parsed?.error ? extractErrorMessageInternal(parsed.error) : undefined;
      const messageFromParsed =
        errorMessage || parsed?.message || `Request failed with status ${response.status}`;
      
      // Check if it's an auth error (401 status)
      const isAuthError = response.status === 401;
      
      throw new ApiError(
        isAuthError 
          ? 'Your session has expired. Please refresh the page to log in again.'
          : messageFromParsed,
        response.status,
        parsed,
        isAuthError
      );
    }

    // Support two response shapes:
    // 1) Standard envelope: { success, data, message, error }
    // 2) Raw JSON payloads (no 'success' boolean): e.g., { verified: true, message: '...' }
    const hasSuccessBoolean = typeof parsed?.success === 'boolean';

    if (hasSuccessBoolean) {
      const envelope = parsed as ApiResponse<T>;
      if (!envelope.success) {
        const errorMessage = envelope.error ? extractErrorMessageInternal(envelope.error) : undefined;
        const messageFromEnvelope =
          errorMessage || envelope.message || `Request failed with status ${response.status}`;
        throw new ApiError(messageFromEnvelope, response.status, envelope);
      }
      // Normalize shape when payload lives at top-level instead of in 'data'
      const dataIsMissing = typeof (envelope as any).data === 'undefined';
      if (dataIsMissing) {
        const { success: _success, message, error, ...rest } = parsed as Record<string, unknown>;
        const normalized: ApiResponse<T> = {
          success: true,
          data: rest as T,
          message: typeof message === 'string' ? message : undefined,
          // If success is true, prefer clearing error
        };
        return normalized;
      }
      return envelope;
    }

    // Raw payload → wrap into ApiResponse<T>
    const wrapped: ApiResponse<T> = {
      success: true,
      data: parsed as T,
    };
    return wrapped;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', 408);
    }

    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiError('Network error. Please check your connection.', 0);
    }

    // Handle unknown errors
    throw new ApiError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      undefined,
      error
    );
  }
}

/**
 * GET request helper
 */
export async function apiGet<T = unknown>(
  endpoint: string,
  options: Omit<ApiClientOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T = unknown>(
  endpoint: string,
  data?: unknown,
  options: Omit<ApiClientOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T = unknown>(
  endpoint: string,
  data?: unknown,
  options: Omit<ApiClientOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = unknown>(
  endpoint: string,
  data?: unknown,
  options: Omit<ApiClientOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T = unknown>(
  endpoint: string,
  data?: unknown,
  options: Omit<ApiClientOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Upload helper - same as apiPut but with longer timeout for file uploads
 * Handles FormData properly (no Content-Type header, browser sets it with boundary)
 */
export async function apiUpload<T = unknown>(
  endpoint: string,
  formData: FormData,
  options: Omit<ApiClientOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: formData,
    timeout: options.timeout ?? 5 * 60 * 1000, // 5 minutes default for uploads
  });
}

/**
 * Helper to extract error message from ApiError
 */
export function getApiErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

// Export the error class for instanceof checks
export { ApiError };

