/**
 * Base Integration Service
 * Parent class for all integration services (SCM, Slack, etc.)
 * Provides common HTTP client and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { env } from '../../config';

export abstract class IntegrationService {
  protected client: AxiosInstance;
  protected baseUrl: string;

  constructor() {
    this.baseUrl = env.DELIVR_BACKEND_URL || 'http://localhost:3000';
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
      const response: AxiosResponse<T> = await this.client.post(url, data, {
        ...config,
        headers: this.buildHeaders(userId, config?.headers),
      });
      return response.data;
    } catch (error: any) {
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
      const message = error.response.data?.message || error.response.data?.error || error.message;
      const err = new Error(message);
      (err as any).status = error.response.status;
      (err as any).data = error.response.data;
      return err;
    } else if (error.request) {
      // Request was made but no response
      return new Error('No response from server');
    } else {
      // Something else happened
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

