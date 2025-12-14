/**
 * BuildUploadSelector - For resubmissions (rejected/cancelled)
 * 
 * Allows user to:
 * - Android: Upload new AAB file
 * - iOS: Provide new TestFlight build number
 * 
 * Goes directly to Production (no internal track)
 */

import {
  Alert,
  Button,
  Card,
  FileInput,
  Group,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconBrandAndroid,
  IconBrandApple,
  IconFileUpload,
  IconRocket,
} from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DISTRIBUTION_UI_LABELS,
  FORM_ICON_SIZES,
  PLATFORM_LABELS,
} from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';

type BuildUploadSelectorProps = {
  platform: Platform;
  releaseId: string;
  onBuildReady: (buildId: string) => void;
  disabled?: boolean;
};

// Size display helper
function formatFileSize(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2);
}

export function BuildUploadSelector({
  platform,
  releaseId,
  onBuildReady,
  disabled,
}: BuildUploadSelectorProps) {
  const [aabFile, setAabFile] = useState<File | null>(null);
  const [testflightBuildNumber, setTestflightBuildNumber] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const isAndroid = platform === Platform.ANDROID;
  const platformColor = isAndroid ? 'green' : 'blue';
  const platformLabel = PLATFORM_LABELS[platform];

  const handleAabUpload = useCallback(async () => {
    if (!aabFile) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', aabFile);
      formData.append('releaseId', releaseId);

      const response = await fetch(`/api/v1/releases/${releaseId}/builds/upload-aab`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        onBuildReady(data.data.build.id);
      } else {
        setUploadError(data.error?.message || DISTRIBUTION_UI_LABELS.UPLOAD_FAILED);
      }
    } catch (error) {
      setUploadError(DISTRIBUTION_UI_LABELS.NETWORK_ERROR);
    } finally {
      setIsUploading(false);
    }
  }, [aabFile, releaseId, onBuildReady]);

  const handleTestflightVerify = useCallback(async () => {
    if (!testflightBuildNumber.trim()) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const response = await fetch(`/api/v1/releases/${releaseId}/builds/verify-testflight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testflightBuildNumber: testflightBuildNumber.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        onBuildReady(data.data.build.id);
      } else {
        setUploadError(data.error?.message || DISTRIBUTION_UI_LABELS.VERIFICATION_FAILED);
      }
    } catch (error) {
      setUploadError(DISTRIBUTION_UI_LABELS.NETWORK_ERROR);
    } finally {
      setIsUploading(false);
    }
  }, [testflightBuildNumber, releaseId, onBuildReady]);

  const handleTestflightInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTestflightBuildNumber(e.currentTarget.value);
  }, []);

  const handleClearError = useCallback(() => {
    setUploadError('');
  }, []);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group>
          <ThemeIcon size="xl" variant="light" color={platformColor} radius="md">
            {isAndroid ? (
              <IconBrandAndroid size={DIALOG_ICON_SIZES.TITLE} />
            ) : (
              <IconBrandApple size={DIALOG_ICON_SIZES.TITLE} />
            )}
          </ThemeIcon>
          <div>
            <Text fw={600} size="lg">
              {DISTRIBUTION_UI_LABELS.UPLOAD_NEW_BUILD(platformLabel)}
            </Text>
            <Text size="sm" c="dimmed">
              {isAndroid
                ? DISTRIBUTION_UI_LABELS.UPLOAD_AAB_FILE
                : DISTRIBUTION_UI_LABELS.PROVIDE_TESTFLIGHT_BUILD}
            </Text>
          </div>
        </Group>

        <Alert
          icon={<IconAlertCircle size={DIALOG_ICON_SIZES.ALERT} />}
          title={DISTRIBUTION_UI_LABELS.DIRECT_TO_PRODUCTION}
          color="orange"
          variant="light"
        >
          <Text size="sm">{DISTRIBUTION_UI_LABELS.DIRECT_TO_PRODUCTION_DESC}</Text>
        </Alert>

        {isAndroid ? (
          <>
            {/* Android AAB Upload */}
            <FileInput
              label={DISTRIBUTION_UI_LABELS.SELECT_AAB_FILE}
              placeholder={DISTRIBUTION_UI_LABELS.AAB_FILE_PLACEHOLDER}
              accept=".aab"
              leftSection={<IconFileUpload size={FORM_ICON_SIZES.INPUT} />}
              value={aabFile}
              onChange={setAabFile}
              disabled={disabled || isUploading}
              required
            />

            {aabFile && (
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  {DISTRIBUTION_UI_LABELS.SELECTED_FILE}: {aabFile.name} ({formatFileSize(aabFile.size)} MB)
                </Text>
              </Group>
            )}

            <Button
              leftSection={<IconRocket size={FORM_ICON_SIZES.BUTTON} />}
              onClick={handleAabUpload}
              disabled={!aabFile || disabled}
              loading={isUploading}
              color="green"
              fullWidth
            >
              {BUTTON_LABELS.UPLOAD_AAB}
            </Button>
          </>
        ) : (
          <>
            {/* iOS TestFlight Build Number */}
            <TextInput
              label={DISTRIBUTION_UI_LABELS.TESTFLIGHT_BUILD_NUMBER}
              placeholder={DISTRIBUTION_UI_LABELS.TESTFLIGHT_BUILD_PLACEHOLDER}
              leftSection={<IconRocket size={FORM_ICON_SIZES.INPUT} />}
              value={testflightBuildNumber}
              onChange={handleTestflightInputChange}
              disabled={disabled || isUploading}
              required
            />

            <Text size="xs" c="dimmed">
              {DISTRIBUTION_UI_LABELS.TESTFLIGHT_BUILD_DESC}
            </Text>

            <Button
              leftSection={<IconRocket size={FORM_ICON_SIZES.BUTTON} />}
              onClick={handleTestflightVerify}
              disabled={!testflightBuildNumber.trim() || disabled}
              loading={isUploading}
              color="blue"
              fullWidth
            >
              {BUTTON_LABELS.VERIFY_AND_USE}
            </Button>
          </>
        )}

        {uploadError && (
          <Alert
            icon={<IconAlertCircle size={DIALOG_ICON_SIZES.ALERT} />}
            title={DISTRIBUTION_UI_LABELS.ERROR_TITLE}
            color="red"
            variant="light"
            withCloseButton
            onClose={handleClearError}
          >
            <Text size="sm">{uploadError}</Text>
          </Alert>
        )}
      </Stack>
    </Card>
  );
}

