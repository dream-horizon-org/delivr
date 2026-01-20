/**
 * useUploadState - Manages AAB file upload state
 */

import { useFetcher } from '@remix-run/react';
import { useCallback, useState } from 'react';
import {
  ERROR_MESSAGES,
  MAX_AAB_FILE_SIZE,
} from '~/constants/distribution/distribution.constants';

type BuildOperationResponse = {
  success?: boolean;
  data?: { build: unknown };
  error?: { message: string };
};

export function useUploadState() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fetcher = useFetcher<BuildOperationResponse>();
  
  const isUploading = fetcher.state === 'submitting';
  const uploadError = fetcher.data?.error?.message ?? null;
  const uploadSuccess = fetcher.data?.success === true;

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setValidationError(null);
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    // Check file extension
    if (!file.name.endsWith('.aab')) {
      return ERROR_MESSAGES.INVALID_FILE;
    }
    
    // Check file size
    if (file.size > MAX_AAB_FILE_SIZE) {
      return ERROR_MESSAGES.FILE_TOO_LARGE;
    }
    
    return null;
  }, []);

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
    } else {
      setValidationError(null);
      setSelectedFile(file);
    }
  }, [validateFile]);

  return {
    selectedFile,
    validationError,
    isDragging,
    setIsDragging,
    isUploading,
    uploadError,
    uploadSuccess,
    fetcher,
    clearFile,
    handleFileSelect,
  };
}

