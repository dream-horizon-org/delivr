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
  error?: string;
  message?: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown
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

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      throw new ApiError(
        `Server returned ${response.status} ${response.statusText}. Expected JSON but got ${contentType || 'unknown'}`,
        response.status,
        text
      );
    }

    const parsed = await response.json();

    // If HTTP status is not OK, throw with best available message
    if (!response.ok) {
      const messageFromParsed =
        (parsed && (parsed.error || parsed.message)) ||
        `Request failed with status ${response.status}`;
      throw new ApiError(messageFromParsed, response.status, parsed);
    }

    // Support two response shapes:
    // 1) Standard envelope: { success, data, message, error }
    // 2) Raw JSON payloads (no 'success' boolean): e.g., { verified: true, message: '...' }
    const hasSuccessBoolean = typeof parsed?.success === 'boolean';

    if (hasSuccessBoolean) {
      const envelope = parsed as ApiResponse<T>;
      if (!envelope.success) {
        const messageFromEnvelope =
          envelope.error || envelope.message || `Request failed with status ${response.status}`;
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

