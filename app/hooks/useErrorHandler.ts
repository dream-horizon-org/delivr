/**
 * useErrorHandler Hook
 * 
 * Provides error handling with retry functionality
 */

import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import React, { useCallback, useState } from 'react';
import {
    type AppError,
    type RetryOptions,
    ErrorCategory,
    parseNetworkError,
    withRetry,
} from '~/utils/error-handling';

// ============================================================================
// ERROR HANDLER HOOK
// ============================================================================

export interface UseErrorHandlerOptions {
  onError?: (error: AppError) => void;
  retryOptions?: RetryOptions;
  showNotification?: boolean;
}

export interface ErrorHandlerState {
  error: AppError | null;
  isError: boolean;
  setError: (error: string | Error | AppError) => void;
  clearError: () => void;
  handleError: (error: unknown) => void;
  retry: <T>(fn: () => Promise<T>) => Promise<T>;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}): ErrorHandlerState {
  const { onError, retryOptions, showNotification = true } = options;
  const [error, setErrorState] = useState<AppError | null>(null);
  
  const setError = useCallback((err: string | Error | AppError) => {
    let appError: AppError;
    
    if (typeof err === 'string') {
      appError = {
        category: ErrorCategory.UNKNOWN,
        code: 'UNKNOWN_ERROR',
        message: err,
        userMessage: err,
        retryable: false,
      };
    } else if (err instanceof Error) {
      appError = parseNetworkError(err);
    } else {
      appError = err;
    }
    
    setErrorState(appError);
    
    if (showNotification) {
      notifications.show({
        title: 'Error',
        message: appError.userMessage,
        color: 'red',
        icon: React.createElement(IconX, { size: 18 }),
        autoClose: appError.retryable ? 5000 : 7000,
      });
    }
    
    if (onError) {
      onError(appError);
    }
  }, [onError, showNotification]);
  
  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);
  
  const handleError = useCallback((err: unknown) => {
    if (err instanceof Error) {
      setError(err);
    } else if (typeof err === 'string') {
      setError(err);
    } else {
      setError(err as AppError);
    }
  }, [setError]);
  
  const retry = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      clearError();
      return await withRetry(fn, retryOptions);
    } catch (err) {
      handleError(err);
      throw err;
    }
  }, [clearError, handleError, retryOptions]);
  
  return {
    error,
    isError: error !== null,
    setError,
    clearError,
    handleError,
    retry,
  };
}

// ============================================================================
// API CALL WITH ERROR HANDLING
// ============================================================================

export interface UseApiCallOptions<T> extends UseErrorHandlerOptions {
  onSuccess?: (data: T) => void;
  successMessage?: string;
}

export interface ApiCallState<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
  execute: (fn: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

export function useApiCall<T>(options: UseApiCallOptions<T> = {}): ApiCallState<T> {
  const { onSuccess, successMessage, ...errorOptions } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const errorHandler = useErrorHandler(errorOptions);
  
  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      errorHandler.clearError();
      
      const result = await fn();
      
      if (successMessage) {
        notifications.show({
          title: 'Success',
          message: successMessage,
          color: 'green',
          icon: React.createElement(IconCheck, { size: 16 }),
          autoClose: 3000,
        });
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      errorHandler.clearError();
      
      setData(result);
      setLoading(false);
      errorHandler.clearError();
      return result;
    } catch (err) {
      errorHandler.handleError(err);
      setLoading(false);
      return null;
    }
  }, [errorHandler, onSuccess, successMessage]);
  
  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    errorHandler.clearError();
  }, [errorHandler]);
  
  return {
    data,
    loading,
    error: errorHandler.error,
    execute,
    reset,
  };
}
