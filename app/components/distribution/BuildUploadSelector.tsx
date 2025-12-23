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
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DISTRIBUTION_UI_LABELS,
  FORM_ICON_SIZES,
  PLATFORM_LABELS,
} from '~/constants/distribution/distribution.constants';
import { Platform } from '~/types/distribution/distribution.types';

export type BuildUploadSelectorProps = {
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
  const [testflightNumber, setTestflightNumber] = useState('');  // Renamed from testflightNumber
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
        setUploadError(data.error?.message ?? DISTRIBUTION_UI_LABELS.UPLOAD_FAILED);
      }
    } catch (error) {
      setUploadError(DISTRIBUTION_UI_LABELS.NETWORK_ERROR);
    } finally {
      setIsUploading(false);
    }
  }, [aabFile, releaseId, onBuildReady]);

  const handleTestflightVerify = useCallback(async () => {
    if (!testflightNumber.trim()) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const response = await fetch(`/api/v1/releases/${releaseId}/builds/verify-testflight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testflightNumber: testflightNumber.trim(),  // Renamed from testflightNumber
        }),
      });

      const data = await response.json();

      if (data.success) {
        onBuildReady(data.data.build.id);
      } else {
        setUploadError(data.error?.message ?? DISTRIBUTION_UI_LABELS.VERIFICATION_FAILED);
      }
    } catch (error) {
      setUploadError(DISTRIBUTION_UI_LABELS.NETWORK_ERROR);
    } finally {
      setIsUploading(false);
    }
  }, [testflightNumber, releaseId, onBuildReady]);

  const handleTestflightInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTestflightNumber(e.currentTarget.value);
  }, []);

  const handleClearError = useCallback(() => {
    setUploadError('');
  }, []);

  return (
    <Card shadow="sm" padding="lg" radius={DS_SPACING.BORDER_RADIUS} withBorder>
      <Stack gap={DS_SPACING.MD}>
        <Group>
          <ThemeIcon size={DS_TYPOGRAPHY.SIZE.XL} variant="light" color={platformColor} radius={DS_SPACING.BORDER_RADIUS}>
            {isAndroid ? (
              <IconBrandAndroid size={DIALOG_ICON_SIZES.TITLE} />
            ) : (
              <IconBrandApple size={DIALOG_ICON_SIZES.TITLE} />
            )}
          </ThemeIcon>
          <div>
            <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} size={DS_TYPOGRAPHY.SIZE.LG}>
              {DISTRIBUTION_UI_LABELS.UPLOAD_NEW_BUILD(platformLabel)}
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
              {isAndroid
                ? DISTRIBUTION_UI_LABELS.UPLOAD_AAB_FILE
                : DISTRIBUTION_UI_LABELS.PROVIDE_TESTFLIGHT_BUILD}
            </Text>
          </div>
        </Group>

        <Alert
          icon={<IconAlertCircle size={DIALOG_ICON_SIZES.ALERT} />}
          title={DISTRIBUTION_UI_LABELS.DIRECT_TO_PRODUCTION}
          color={DS_COLORS.STATUS.WARNING}
          variant="light"
        >
          <Text size={DS_TYPOGRAPHY.SIZE.SM}>{DISTRIBUTION_UI_LABELS.DIRECT_TO_PRODUCTION_DESC}</Text>
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
              <Group gap={DS_SPACING.XS}>
                <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
                  {DISTRIBUTION_UI_LABELS.SELECTED_FILE}: {aabFile.name} ({formatFileSize(aabFile.size)} MB)
                </Text>
              </Group>
            )}

            <Button
              leftSection={<IconRocket size={FORM_ICON_SIZES.BUTTON} />}
              onClick={handleAabUpload}
              disabled={!aabFile || disabled}
              loading={isUploading}
              color={DS_COLORS.STATUS.SUCCESS}
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
              value={testflightNumber}  // Renamed from testflightNumber
              onChange={handleTestflightInputChange}
              disabled={disabled || isUploading}
              required
            />

            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
              {DISTRIBUTION_UI_LABELS.TESTFLIGHT_BUILD_DESC}
            </Text>

            <Button
              leftSection={<IconRocket size={FORM_ICON_SIZES.BUTTON} />}
              onClick={handleTestflightVerify}
              disabled={!testflightNumber.trim() || disabled}  // Renamed from testflightNumber
              loading={isUploading}
              color={DS_COLORS.ACTION.PRIMARY}
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
            color={DS_COLORS.STATUS.ERROR}
            variant="light"
            withCloseButton
            onClose={handleClearError}
          >
            <Text size={DS_TYPOGRAPHY.SIZE.SM}>{uploadError}</Text>
          </Alert>
        )}
      </Stack>
    </Card>
  );
}

