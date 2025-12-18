/**
 * UploadAABForm - File upload form for Android AAB files
 * 
 * Features:
 * - File input with drag and drop styling
 * - File validation (type, size)
 * - Upload progress indicator
 * - Version info extraction display
 */

import {
  Alert,
  Box,
  Button,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertCircle, IconFile, IconUpload, IconX } from '@tabler/icons-react';
import { useCallback, useRef } from 'react';
import {
  BUTTON_LABELS,
  MAX_AAB_FILE_SIZE_LABEL
} from '~/constants/distribution/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import type { UploadAABFormProps } from '~/types/distribution/distribution-component.types';
import { useUploadState } from '~/hooks/distribution';
import { getDropZoneClassName } from '~/utils/distribution';


// ============================================================================
// SUB-COMPONENTS
// ============================================================================

export type FilePreviewProps = {
  file: File;
  onClear: () => void;
};

function FilePreview({ file, onClear }: FilePreviewProps) {
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  
  return (
    <Paper p={DS_SPACING.MD} withBorder radius={DS_SPACING.BORDER_RADIUS}>
      <Group justify="space-between">
        <Group gap={DS_SPACING.SM}>
          <IconFile size={24} className="text-green-600" />
          <div>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>{file.name}</Text>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>{fileSizeMB} MB</Text>
          </div>
        </Group>
        
        <Button
          variant="subtle"
          color={DS_COLORS.STATUS.ERROR}
          size={DS_TYPOGRAPHY.SIZE.XS}
          onClick={onClear}
          aria-label="Remove selected file"
        >
          <IconX size={16} />
        </Button>
      </Group>
    </Paper>
  );
}


export type FileDropZoneProps = {
  onFileSelect: (file: File | null) => void;
  disabled: boolean;
  isDragging: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
};

function FileDropZone({ 
  onFileSelect, 
  disabled,
  isDragging,
  onDragEnter,
  onDragLeave,
}: FileDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneClassName = getDropZoneClassName(isDragging, disabled);

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
      
      <Stack align="center" gap={DS_SPACING.MD}>
        {isDragging ? (
          <IconUpload size={52} className="text-blue-500" stroke={1.5} />
        ) : (
          <IconFile size={52} className="text-gray-400" stroke={1.5} />
        )}
        
        <div>
          <Text size={DS_TYPOGRAPHY.SIZE.LG} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
            Drag Android AAB file here or click to select
          </Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED} mt={DS_SPACING.XS}>
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

export function UploadAABForm({ 
  releaseId, 
  onUploadComplete, 
  onUploadError, 
  onClose,
  className,
}: UploadAABFormProps) {

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
    <Stack gap={DS_SPACING.MD} className={className}>
      {/* Error Alert */}
      {displayError && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color={DS_COLORS.STATUS.ERROR} 
          title="Upload Error"
          variant="light"
        >
          {displayError}
        </Alert>
      )}

      {/* Success Alert */}
      {uploadSuccess && (
        <Alert 
          color={DS_COLORS.STATUS.SUCCESS} 
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
            <Stack gap={DS_SPACING.XS}>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>Uploading...</Text>
              <Progress value={100} animated striped />
            </Stack>
          )}

          {/* Action Buttons */}
          <Group justify="flex-end" mt={DS_SPACING.LG}>
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
