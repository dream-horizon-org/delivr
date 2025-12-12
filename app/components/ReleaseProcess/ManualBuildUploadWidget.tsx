/**
 * ManualBuildUploadWidget Component
 * Unified widget for uploading manual builds (file upload or TestFlight verification)
 * Supports all build task types: TRIGGER_PRE_REGRESSION_BUILDS, TRIGGER_REGRESSION_BUILDS,
 * TRIGGER_TEST_FLIGHT_BUILD, CREATE_AAB_BUILD
 */

import { Alert, Box, Button, Card, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconBrandApple, IconCheck, IconFile, IconUpload, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BUILD_UPLOAD_LABELS,
  BUTTON_LABELS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '~/constants/release-process-ui';
import { BuildsService } from '~/services/builds.service';
import { useManualBuildUpload } from '~/hooks/useReleaseProcess';
import { useRelease } from '~/hooks/useRelease';
import type { BuildUploadStage, Platform } from '~/types/release-process-enums';
import { TaskType } from '~/types/release-process-enums';
import { getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';

interface ManualBuildUploadWidgetProps {
  tenantId: string;
  releaseId: string;
  stage: BuildUploadStage;
  taskType: TaskType;
  platform?: Platform; // Optional: if provided, widget is locked to this platform
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
  taskType,
  platform: fixedPlatform,
  onUploadComplete,
  className,
}: ManualBuildUploadWidgetProps) {
  // Get release to extract platforms from platformTargetMappings
  const { release } = useRelease(tenantId, releaseId);

  // Determine upload mode based on taskType
  const isTestFlightVerification = taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD;
  const isFileUpload = !isTestFlightVerification;

  // Extract available platforms from release
  const availablePlatforms = useMemo(() => {
    // If platform is fixed (single-platform widget), return only that platform
    if (fixedPlatform) {
      return [fixedPlatform];
    }
    
    if (!release?.platformTargetMappings) return [];
    
    const platforms = release.platformTargetMappings
      .map(m => m.platform)
      .filter((p, i, arr) => arr.indexOf(p) === i); // Get unique platforms
    
    // For TestFlight, only show iOS
    if (isTestFlightVerification) {
      return platforms.filter(p => p === 'IOS');
    }
    
    return platforms;
  }, [release?.platformTargetMappings, isTestFlightVerification, fixedPlatform]);
  
  // If platform is fixed, pre-select it
  const initialPlatform = fixedPlatform || null;

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(initialPlatform);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Update selected platform when fixedPlatform changes
  useEffect(() => {
    if (fixedPlatform) {
      setSelectedPlatform(fixedPlatform);
    }
  }, [fixedPlatform]);

  // TestFlight verification state
  const [testflightBuildNumber, setTestflightBuildNumber] = useState('');
  const [versionName, setVersionName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const uploadMutation = useManualBuildUpload(tenantId, releaseId);

  // Pre-fill version from release if available
  useEffect(() => {
    if (isTestFlightVerification && release?.platformTargetMappings) {
      const iosMapping = release.platformTargetMappings.find(m => m.platform === 'IOS');
      if (iosMapping?.version && !versionName) {
        setVersionName(iosMapping.version);
      }
    }
  }, [isTestFlightVerification, release?.platformTargetMappings, versionName]);

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

  // Handle file upload
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

  // Handle TestFlight verification
  const handleTestFlightVerify = useCallback(async () => {
    if (!testflightBuildNumber.trim()) {
      setValidationError('TestFlight build number is required');
      return;
    }
    if (!versionName.trim()) {
      setValidationError('Version name is required');
      return;
    }

    setIsVerifying(true);
    setValidationError(null);

    try {
      await BuildsService.verifyTestFlight(releaseId, {
        releaseId,
        testflightBuildNumber: testflightBuildNumber.trim(),
        versionName: versionName.trim(),
      });

      showSuccessToast({ message: 'TestFlight build verified successfully' });
      setTestflightBuildNumber('');
      setVersionName('');
      onUploadComplete?.();
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to verify TestFlight build');
      showErrorToast({ message: errorMessage });
      setValidationError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  }, [testflightBuildNumber, versionName, releaseId, onUploadComplete]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const isUploading = uploadMutation.isLoading;
  const isLoading = isUploading || isVerifying;

  // File upload validation
  const canUploadFile = selectedFile && selectedPlatform && !validationError && !isLoading;
  
  // TestFlight verification validation
  const canVerifyTestFlight = 
    testflightBuildNumber.trim() && 
    versionName.trim() && 
    !validationError && 
    !isLoading;

  // Platform options for Select
  const platformOptions = availablePlatforms.map(p => ({
    value: p,
    label: p === 'ANDROID' ? 'Android' : p === 'IOS' ? 'iOS' : 'Web',
  }));

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder className={className}>
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Text fw={600} size="lg" mb="xs">
              {isTestFlightVerification ? 'Verify TestFlight Build' : BUILD_UPLOAD_LABELS.TITLE}
            </Text>
            <Text size="sm" c="dimmed">
              {isTestFlightVerification
                ? 'Enter the TestFlight build number to verify it exists'
                : 'Upload build files for this stage'}
            </Text>
          </div>
          {isTestFlightVerification && (
            <IconBrandApple size={24} className="text-blue-600" />
          )}
        </Group>

        {/* TestFlight Verification Mode */}
        {isTestFlightVerification ? (
          <>
            <TextInput
              label="TestFlight Build Number"
              description="The build number shown in App Store Connect / TestFlight"
              placeholder="e.g., 17965"
              value={testflightBuildNumber}
              onChange={(e) => {
                setTestflightBuildNumber(e.target.value);
                setValidationError(null);
              }}
              disabled={isLoading}
              required
            />

            <TextInput
              label="Version Name"
              description="The version string (must match release version)"
              placeholder="e.g., 6.5.0"
              value={versionName}
              onChange={(e) => {
                setVersionName(e.target.value);
                setValidationError(null);
              }}
              disabled={isLoading}
              required
            />

            {/* Error Alert */}
            {validationError && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                {validationError}
              </Alert>
            )}

            {/* Verify Button */}
            <Button
              leftSection={<IconCheck size={16} />}
              onClick={handleTestFlightVerify}
              disabled={!canVerifyTestFlight}
              loading={isVerifying}
              fullWidth
            >
              {isVerifying ? 'Verifying...' : 'Verify TestFlight Build'}
            </Button>
          </>
        ) : (
          <>
            {/* Platform Selection - File Upload Mode */}
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
                disabled={isLoading || availablePlatforms.length === 0}
                description={
                  availablePlatforms.length === 0
                    ? 'No platforms configured for this release'
                    : undefined
                }
              />
            )}
            {fixedPlatform && (
              <Text size="sm" c="dimmed" fw={500}>
                Platform: {fixedPlatform === 'ANDROID' ? 'Android' : fixedPlatform === 'IOS' ? 'iOS' : 'Web'}
              </Text>
            )}

            {/* File Input */}
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                disabled={!selectedPlatform || isLoading}
                style={{ display: 'none' }}
                accept={selectedPlatform ? ALLOWED_EXTENSIONS[selectedPlatform].join(',') : undefined}
              />
              <Button
                leftSection={<IconFile size={16} />}
                variant="light"
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedPlatform || isLoading}
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
                  disabled={isLoading}
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
          </>
        )}
      </Stack>
    </Card>
  );
}

