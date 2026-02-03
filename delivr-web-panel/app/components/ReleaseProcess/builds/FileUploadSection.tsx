/**
 * FileUploadSection Component
 * Handles file selection and upload for manual builds
 */

import { Alert, Box, Button, Group, Select, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconFile, IconUpload, IconX } from '@tabler/icons-react';
import { useCallback, useRef, useState } from 'react';
import {
  BUILD_UPLOAD_CONSTANTS,
  BUILD_UPLOAD_LABELS,
  BUTTON_LABELS,
  SUCCESS_MESSAGES,
} from '~/constants/release-process-ui';
import { useManualBuildUpload } from '~/hooks/useReleaseProcess';
import type { BuildUploadStage } from '~/types/release-process-enums';
import { Platform } from '~/types/release-process-enums';
import { handleStageError } from '~/utils/stage-error-handling';
import { showSuccessToast } from '~/utils/toast';

interface FileUploadSectionProps {
  appId: string;
  releaseId: string;
  stage: BuildUploadStage;
  availablePlatforms: Platform[];
  fixedPlatform?: Platform;
  onUploadComplete?: (platform?: Platform) => void;
  onRefetchArtifacts: () => Promise<unknown>;
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}

function validateFile(file: File, platform: Platform): string | null {
  const extension = getFileExtension(file.name);
  const allowed = BUILD_UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS[platform] as readonly string[];

  if (!allowed.includes(extension.toLowerCase())) {
    return `Invalid file type. Allowed: ${allowed.join(', ')}`;
  }

  if (file.size > BUILD_UPLOAD_CONSTANTS.MAX_FILE_SIZE_BYTES) {
    return `File too large. Maximum size: ${BUILD_UPLOAD_CONSTANTS.MAX_FILE_SIZE_MB} MB`;
  }

  return null;
}

export function FileUploadSection({
  appId,
  releaseId,
  stage,
  availablePlatforms,
  fixedPlatform,
  onUploadComplete,
  onRefetchArtifacts,
}: FileUploadSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(fixedPlatform || null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useManualBuildUpload(appId, releaseId);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!selectedPlatform) {
        setValidationError('Please select a platform first');
        return;
      }

      const error = validateFile(file, selectedPlatform);
      if (error) {
        setValidationError(error);
        setSelectedFile(null);
      } else {
        setValidationError(null);
        setSelectedFile(file);
      }
    },
    [selectedPlatform]
  );

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile || !selectedPlatform) {
      setValidationError('Please select both a file and platform');
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        platform: selectedPlatform,
        stage,
      });

      showSuccessToast({ message: SUCCESS_MESSAGES.BUILD_UPLOADED });
      setSelectedFile(null);
      setSelectedPlatform(fixedPlatform || null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await onRefetchArtifacts();
      // Pass platform to onUploadComplete so parent can track it
      onUploadComplete?.(selectedPlatform);
    } catch (error) {
      const errorMessage = handleStageError(error, 'upload build');
      setValidationError(errorMessage);
    }
  }, [selectedFile, selectedPlatform, stage, uploadMutation, fixedPlatform, onRefetchArtifacts, onUploadComplete]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const isUploading = uploadMutation.isLoading;
  const canUploadFile = selectedFile && selectedPlatform && !validationError && !isUploading;

  const platformOptions = availablePlatforms.map(p => ({
    value: p,
    label: p === Platform.ANDROID ? 'Android' : p === Platform.IOS ? 'iOS' : 'Web',
  }));

  return (
    <Stack gap="md">
      {/* Platform Selection */}
      {!fixedPlatform && (
        <Select
          label="Platform"
          placeholder="Select platform"
          data={platformOptions}
          value={selectedPlatform}
          onChange={(value) => {
            setSelectedPlatform(value as Platform | null);
            setSelectedFile(null);
            setValidationError(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          disabled={isUploading || availablePlatforms.length === 0}
          description={
            availablePlatforms.length === 0
              ? 'No platforms configured for this release'
              : undefined
          }
        />
      )}

      {/* File Input */}
      <Box>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={!selectedPlatform || isUploading}
          style={{ display: 'none' }}
          accept={selectedPlatform ? BUILD_UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS[selectedPlatform].join(',') : undefined}
        />
        <Button
          leftSection={<IconFile size={16} />}
          variant="light"
          onClick={() => fileInputRef.current?.click()}
          disabled={!selectedPlatform || isUploading}
          fullWidth
        >
          {BUILD_UPLOAD_LABELS.SELECT_FILE}
        </Button>
      </Box>

      {/* File Preview */}
      {selectedFile && (
        <Group justify="space-between" p="sm" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: 'var(--mantine-radius-md)' }}>
          <Group gap="sm">
            <IconFile size={20} className="text-green-600" />
            <div>
              <Text size="sm" fw={500}>
                {selectedFile.name}
              </Text>
              <Text size="xs" c="dimmed">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </Text>
            </div>
          </Group>
          <Button
            variant="subtle"
            color="red"
            size="xs"
            onClick={handleClear}
            disabled={isUploading}
          >
            <IconX size={16} />
          </Button>
        </Group>
      )}

      {/* Error Alert */}
      {validationError && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          {validationError}
        </Alert>
      )}

      {/* Upload Button */}
      <Button
        leftSection={<IconUpload size={16} />}
        onClick={handleFileUpload}
        disabled={!canUploadFile}
        loading={isUploading}
        fullWidth
      >
        {isUploading ? BUILD_UPLOAD_LABELS.UPLOADING : BUTTON_LABELS.UPLOAD_BUILD}
      </Button>
    </Stack>
  );
}

