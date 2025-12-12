/**
 * ManualBuildUploadWidget Component
 * Widget for uploading manual builds (AAB for Android, TestFlight for iOS)
 */

import { Alert, Box, Button, Card, Group, Select, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconFile, IconUpload, IconX } from '@tabler/icons-react';
import { useCallback, useRef, useState } from 'react';
import {
  BUILD_UPLOAD_LABELS,
  BUTTON_LABELS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '~/constants/release-process-ui';
import { useManualBuildUpload } from '~/hooks/useReleaseProcess';
import type { BuildUploadStage, Platform } from '~/types/release-process-enums';
import { getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';

interface ManualBuildUploadWidgetProps {
  tenantId: string;
  releaseId: string;
  stage: BuildUploadStage;
  onUploadComplete?: () => void;
  className?: string;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const ALLOWED_EXTENSIONS = {
  ANDROID: ['.aab', '.apk'],
  IOS: ['.ipa'],
  WEB: ['.zip', '.tar.gz'],
};

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}

function validateFile(file: File, platform: Platform): string | null {
  const extension = getFileExtension(file.name);
  const allowed = ALLOWED_EXTENSIONS[platform];

  if (!allowed.includes(extension.toLowerCase())) {
    return `Invalid file type. Allowed: ${allowed.join(', ')}`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size: ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} MB`;
  }

  return null;
}

export function ManualBuildUploadWidget({
  tenantId,
  releaseId,
  stage,
  onUploadComplete,
  className,
}: ManualBuildUploadWidgetProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useManualBuildUpload(tenantId, releaseId);

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

  const handleUpload = useCallback(async () => {
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
      setSelectedPlatform(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadComplete?.();
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, ERROR_MESSAGES.FAILED_TO_UPLOAD_BUILD);
      showErrorToast({ message: errorMessage });
      setValidationError(errorMessage);
    }
  }, [selectedFile, selectedPlatform, stage, uploadMutation, onUploadComplete]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const isUploading = uploadMutation.isLoading;
  const canUpload = selectedFile && selectedPlatform && !validationError && !isUploading;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder className={className}>
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Text fw={600} size="lg" mb="xs">
              {BUILD_UPLOAD_LABELS.TITLE}
            </Text>
            <Text size="sm" c="dimmed">
              Upload build files for this stage
            </Text>
          </div>
        </Group>

        {/* Platform Selection */}
        <Select
          label="Platform"
          placeholder="Select platform"
          data={[
            { value: 'ANDROID', label: 'Android' },
            { value: 'IOS', label: 'iOS' },
            { value: 'WEB', label: 'Web' },
          ]}
          value={selectedPlatform}
          onChange={(value) => {
            setSelectedPlatform(value as Platform | null);
            setSelectedFile(null);
            setValidationError(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          disabled={isUploading}
        />

        {/* File Input */}
        <Box>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            disabled={!selectedPlatform || isUploading}
            style={{ display: 'none' }}
            accept={selectedPlatform ? ALLOWED_EXTENSIONS[selectedPlatform].join(',') : undefined}
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
          onClick={handleUpload}
          disabled={!canUpload}
          loading={isUploading}
          fullWidth
        >
          {isUploading ? BUILD_UPLOAD_LABELS.UPLOADING : BUTTON_LABELS.UPLOAD_BUILD}
        </Button>
      </Stack>
    </Card>
  );
}

