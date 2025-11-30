/**
 * Base Integration Service
 * Parent class for all integration services (SCM, Slack, etc.)
 * Provides common HTTP client and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export abstract class IntegrationService {
  protected client: AxiosInstance;
  protected baseUrl: string;

  constructor() {
    this.baseUrl = process.env.DELIVR_BACKEND_URL || process.env.BACKEND_API_URL || 'http://localhost:3010';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Build headers with userId
   */
  protected buildHeaders(userId: string, additionalHeaders?: any) {
    return {
      'Content-Type': 'application/json',
      'userId': userId,
      ...(additionalHeaders || {}),
    };
  }

  /**
   * Common GET request
   */
  protected async get<T>(
    url: string,
    userId: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(url, {
        ...config,
        headers: this.buildHeaders(userId, config?.headers),
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Common POST request
   */
  protected async post<T>(
    url: string,
    data: any,
    userId: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      console.log(`[IntegrationService] POST ${this.baseUrl}${url}`, {
        headers: this.buildHeaders(userId, config?.headers),
        dataKeys: Object.keys(data || {}),
        dataValues: JSON.stringify(data, null, 2)
      });
      
      const response: AxiosResponse<T> = await this.client.post(url, data, {
        ...config,
        headers: this.buildHeaders(userId, config?.headers),
      });
      
      console.log(`[IntegrationService] POST ${url} - Success:`, {
        status: response.status,
        dataKeys: response.data ? Object.keys(response.data as any) : [],
        data: response.data
      });
      
      return response.data;
    } catch (error: any) {
      console.error(`[IntegrationService] POST ${url} - Error:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw this.handleError(error);
    }
  }

  /**
   * Common PATCH request
   */
  protected async patch<T>(
    url: string,
    data: any,
    userId: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.patch(url, data, {
        ...config,
        headers: this.buildHeaders(userId, config?.headers),
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Common PUT request
   */
  protected async put<T>(
    url: string,
    data: any,
    userId: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.put(url, data, {
        ...config,
        headers: this.buildHeaders(userId, config?.headers),
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Common DELETE request
   */
  protected async delete<T>(
    url: string,
    userId: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.delete(url, {
        ...config,
        headers: this.buildHeaders(userId, config?.headers),
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle and format errors consistently
   */
  protected handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      console.error('[IntegrationService] Backend error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
      
      const message = error.response.data?.message || error.response.data?.error || error.message;
      const err = new Error(message);
      (err as any).status = error.response.status;
      (err as any).data = error.response.data;
      return err;
    } else if (error.request) {
      // Request was made but no response
      console.error('[IntegrationService] No response from backend:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout,
        headers: error.config?.headers
      });
      
      // Check if it's a timeout
      if (error.code === 'ECONNABORTED') {
        return new Error(`Request timeout after ${error.config?.timeout}ms. Backend server may be slow or not responding.`);
      }
      
      return new Error('No response from server. Check if backend is running and reachable.');
    } else {
      // Something else happened
      console.error('[IntegrationService] Unexpected error:', error);
      return error;
    }
  }

  /**
   * Log request info (useful for debugging)
   */
  protected logRequest(method: string, url: string, data?: any) {
    console.log(`[${this.constructor.name}] ${method} ${url}`, data ? { ...data, token: '[REDACTED]' } : '');
  }

  /**
   * Log response info (useful for debugging)
   */
  protected logResponse(method: string, url: string, success: boolean) {
    console.log(`[${this.constructor.name}] ${method} ${url} - ${success ? 'SUCCESS' : 'FAILED'}`);
  }
}

