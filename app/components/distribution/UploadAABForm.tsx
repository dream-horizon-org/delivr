/**
 * UploadAABForm - File upload form for Android AAB files
 * 
 * Features:
 * - File input with drag and drop styling
 * - File validation (type, size)
 * - Upload progress indicator
 * - Version info extraction display
 */

import { useState, useCallback, useRef } from 'react';
import { useFetcher } from '@remix-run/react';
import { 
  Stack, 
  Group, 
  Text, 
  Button, 
  Progress, 
  Paper,
  Alert,
  Box,
} from '@mantine/core';
import { IconUpload, IconX, IconFile, IconAlertCircle } from '@tabler/icons-react';
import { 
  MAX_AAB_FILE_SIZE, 
  MAX_AAB_FILE_SIZE_LABEL,
  BUTTON_LABELS,
  ERROR_MESSAGES,
} from '~/constants/distribution.constants';
import type { BuildOperationResponse } from '~/types/distribution.types';
import type { UploadAABFormProps } from './distribution.types';

// ============================================================================
// HELPER HOOKS
// ============================================================================

function useUploadState() {
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function FilePreview({ file, onClear }: { file: File; onClear: () => void }) {
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  
  return (
    <Paper p="md" withBorder radius="md">
      <Group justify="space-between">
        <Group gap="sm">
          <IconFile size={24} className="text-green-600" />
          <div>
            <Text size="sm" fw={500}>{file.name}</Text>
            <Text size="xs" c="dimmed">{fileSizeMB} MB</Text>
          </div>
        </Group>
        
        <Button
          variant="subtle"
          color="red"
          size="xs"
          onClick={onClear}
          aria-label="Remove selected file"
        >
          <IconX size={16} />
        </Button>
      </Group>
    </Paper>
  );
}

function useDropZoneClassName(isDragging: boolean, disabled: boolean): string {
  const baseClasses = 'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200';
  const draggingClasses = isDragging 
    ? 'border-blue-500 bg-blue-50' 
    : 'border-gray-300 hover:border-gray-400 bg-gray-50';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return `${baseClasses} ${draggingClasses} ${disabledClasses}`;
}

function FileDropZone({ 
  onFileSelect, 
  disabled,
  isDragging,
  onDragEnter,
  onDragLeave,
}: { 
  onFileSelect: (file: File | null) => void;
  disabled: boolean;
  isDragging: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneClassName = useDropZoneClassName(isDragging, disabled);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragEnter();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragLeave();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragLeave();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  return (
    <Box
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={dropZoneClassName}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".aab"
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />
      
      <Stack align="center" gap="md">
        {isDragging ? (
          <IconUpload size={52} className="text-blue-500" stroke={1.5} />
        ) : (
          <IconFile size={52} className="text-gray-400" stroke={1.5} />
        )}
        
        <div>
          <Text size="lg" fw={500}>
            Drag Android AAB file here or click to select
          </Text>
          <Text size="sm" c="dimmed" mt="xs">
            File should be a valid signed .aab file, max {MAX_AAB_FILE_SIZE_LABEL}
          </Text>
        </div>
      </Stack>
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UploadAABForm(props: UploadAABFormProps) {
  const { 
    releaseId, 
    onUploadComplete, 
    onUploadError, 
    onClose,
    className,
  } = props;

  const {
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
  } = useUploadState();

  // Handle upload submission
  const handleSubmit = useCallback(() => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('_action', 'upload-aab');
    formData.append('file', selectedFile);

    fetcher.submit(formData, {
      method: 'post',
      encType: 'multipart/form-data',
    });
  }, [selectedFile, fetcher]);

  // Handle success/error callbacks
  if (uploadSuccess && onUploadComplete && fetcher.data?.data) {
    onUploadComplete(fetcher.data.data);
  }

  if (uploadError && onUploadError) {
    onUploadError(uploadError);
  }

  const displayError = validationError ?? uploadError;

  return (
    <Stack gap="md" className={className}>
      {/* Error Alert */}
      {displayError && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color="red" 
          title="Upload Error"
          variant="light"
        >
          {displayError}
        </Alert>
      )}

      {/* Success Alert */}
      {uploadSuccess && (
        <Alert 
          color="green" 
          title="Upload Successful"
          variant="light"
        >
          Android AAB uploaded successfully! The build is now ready for distribution.
        </Alert>
      )}

      {/* File Selection */}
      {!uploadSuccess && (
        <>
          {selectedFile ? (
            <FilePreview file={selectedFile} onClear={clearFile} />
          ) : (
            <FileDropZone
              onFileSelect={handleFileSelect}
              disabled={isUploading}
              isDragging={isDragging}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
            />
          )}

          {/* Upload Progress */}
          {isUploading && (
            <Stack gap="xs">
              <Text size="sm" c="dimmed">Uploading...</Text>
              <Progress value={100} animated striped />
            </Stack>
          )}

          {/* Action Buttons */}
          <Group justify="flex-end" mt="md">
            {onClose && (
              <Button 
                variant="subtle" 
                onClick={onClose}
                disabled={isUploading}
              >
                {BUTTON_LABELS.CANCEL}
              </Button>
            )}
            
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || isUploading}
              loading={isUploading}
              leftSection={<IconUpload size={16} />}
            >
              {BUTTON_LABELS.UPLOAD}
            </Button>
          </Group>
        </>
      )}

      {/* Close button after success */}
      {uploadSuccess && onClose && (
        <Group justify="flex-end">
          <Button onClick={onClose}>{BUTTON_LABELS.CLOSE}</Button>
        </Group>
      )}
    </Stack>
  );
}
