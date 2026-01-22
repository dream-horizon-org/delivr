/**
 * ResubmissionDialog - Create NEW submission after rejection/cancellation
 * 
 * Per API Spec (PHASE_4_COMPONENT_INTEGRATION_SPEC.md):
 * - Creates completely NEW submission (new submissionId)
 * - Requires new artifact (AAB file for Android, TestFlight build for iOS)
 * - Pre-fills form with previous submission data
 * - Uses POST /api/v1/distributions/:distributionId/submissions
 */

import {
  Alert,
  Button,
  Checkbox,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useFetcher } from '@remix-run/react';
import { IconAlertCircle, IconEdit, IconUpload } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo } from 'react';
import { API_ROUTES } from '~/constants/distribution/distribution-api.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import {
  DIALOG_ICON_SIZES,
  DIALOG_TITLES,
  MAX_ROLLOUT_PERCENT,
  MIN_ROLLOUT_PERCENT,
  PLATFORM_LABELS
} from '~/constants/distribution/distribution.constants';
import {
  AndroidSubmission,
  IOSSubmission,
  Platform,
  type Submission
} from '~/types/distribution/distribution.types';
import { ErrorAlert } from './ErrorRecovery';

// ============================================================================
// TYPES
// ============================================================================

type AndroidResubmissionFormData = {
  version: string;
  versionCode?: number | undefined;
  aabFile: File | null;
  rolloutPercentage: number;
  inAppUpdatePriority: number;
  releaseNotes: string;
};

type IOSResubmissionFormData = {
  version: string;
  testflightNumber: number | null;  // Renamed from testflightNumber
  phasedRelease: boolean;
  resetRating: boolean;
  releaseNotes: string;
};

export type ResubmissionDialogProps = {
  opened: boolean;
  onClose: () => void;
  tenantId: string;
  releaseId: string;
  distributionId: string;
  previousSubmission: Submission;
  onResubmitComplete?: () => void;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResubmissionDialog({
  opened,
  onClose,
  tenantId,
  releaseId,
  distributionId,
  previousSubmission,
  onResubmitComplete,
}: ResubmissionDialogProps) {
  const fetcher = useFetcher<{ success?: boolean; error?: { message: string } }>();
  const isSubmitting = fetcher.state === 'submitting';
  const isAndroid = previousSubmission.platform === Platform.ANDROID;
  const platformLabel = useMemo(() => PLATFORM_LABELS[previousSubmission.platform], [previousSubmission.platform]);

  // Android form
  const androidSubmission = previousSubmission.platform === Platform.ANDROID 
    ? previousSubmission as AndroidSubmission 
    : null;
  
  const androidForm = useForm<AndroidResubmissionFormData>({
    initialValues: {
      version: previousSubmission.version ?? '',
      versionCode: androidSubmission?.versionCode,
      aabFile: null,
      rolloutPercentage: previousSubmission.rolloutPercentage ?? 5,
      inAppUpdatePriority: androidSubmission?.inAppUpdatePriority ?? 0,
      releaseNotes: previousSubmission.releaseNotes ?? '',
    },
    validate: {
      aabFile: (value) => (!value ? 'Please select an AAB file to upload' : null),
      version: (value) => {
        if (!value) return 'Version is required';
        // Semantic versioning validation (e.g., 2.7.1, 1.0.0, 3.2.1-beta)
        if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(value)) {
          return 'Version must follow semantic versioning (e.g., 2.7.1)';
        }
        return null;
      },
      rolloutPercentage: (value) => {
        if (value < MIN_ROLLOUT_PERCENT || value > MAX_ROLLOUT_PERCENT) {
          return `Rollout percentage must be between ${MIN_ROLLOUT_PERCENT}% and ${MAX_ROLLOUT_PERCENT}%`;
        }
        return null;
      },
      inAppUpdatePriority: (value) => {
        if (value < 0 || value > 5) return 'Priority must be between 0 and 5';
        return null;
      },
      releaseNotes: (value) => (!value?.trim() ? 'Release notes are required' : null),
    },
  });

  // iOS form
  const iosSubmission = previousSubmission.platform === Platform.IOS
    ? previousSubmission as IOSSubmission
    : null;
  
  const iosForm = useForm<IOSResubmissionFormData>({
    initialValues: {
      version: previousSubmission.version ?? '',
      testflightNumber: null,  // Renamed from testflightNumber
      phasedRelease: iosSubmission?.phasedRelease ?? true,
      resetRating: iosSubmission?.resetRating ?? false,
      releaseNotes: previousSubmission.releaseNotes ?? '',
    },
    validate: {
      version: (value) => {
        if (!value) return 'Version is required';
        // Semantic versioning validation (e.g., 2.7.1, 1.0.0, 3.2.1-beta)
        if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(value)) {
          return 'Version must follow semantic versioning (e.g., 2.7.1)';
        }
        return null;
      },
      testflightNumber: (value) => {
        if (!value) return 'Please enter a valid TestFlight build number';
        if (value < 1) return 'TestFlight build number must be a positive number';
        return null;
      },
      releaseNotes: (value) => (!value?.trim() ? 'Release notes are required' : null),
    },
  });

  // Handle Android submission
  const handleAndroidSubmit = useCallback((values: AndroidResubmissionFormData, _event?: React.FormEvent<HTMLFormElement>) => {
    if (!values.aabFile) return;

    const formData = new FormData();
    formData.append('platform', Platform.ANDROID);
    formData.append('version', values.version);
    formData.append('aabFile', values.aabFile);
    if (values.versionCode) formData.append('versionCode', values.versionCode.toString());
    formData.append('rolloutPercentage', values.rolloutPercentage.toString());
    formData.append('inAppUpdatePriority', values.inAppUpdatePriority.toString());
    formData.append('releaseNotes', values.releaseNotes);

    fetcher.submit(formData, {
      method: 'POST',
      action: API_ROUTES.createSubmission(tenantId, releaseId, distributionId),
      encType: 'multipart/form-data',
    });
  }, [tenantId, releaseId, distributionId, fetcher]);

  // Handle iOS submission
  const handleIOSSubmit = useCallback((values: IOSResubmissionFormData, _event?: React.FormEvent<HTMLFormElement>) => {
    if (!values.testflightNumber) return;

    const payload = {
      platform: Platform.IOS,
      version: values.version,
      testflightNumber: values.testflightNumber,  // Renamed from testflightNumber
      phasedRelease: values.phasedRelease,
      resetRating: values.resetRating,
      releaseNotes: values.releaseNotes,
    };

    fetcher.submit(JSON.stringify(payload), {
      method: 'POST',
      action: API_ROUTES.createSubmission(tenantId, releaseId, distributionId),
      encType: 'application/json',
    });
  }, [tenantId, releaseId, distributionId, fetcher]);

  // Handle success - trigger revalidation, parent will close dialog after data is fresh
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      // Reset forms
      if (isAndroid) {
        androidForm.reset();
      } else {
        iosForm.reset();
      }
      // Trigger revalidation in parent - parent will close dialog after revalidation completes
      onResubmitComplete?.();
      // Note: Don't call onClose() here - let parent close after revalidation completes
    }
    // On error, dialog stays open so user can see error message and retry
  }, [fetcher.state, fetcher.data, isAndroid, onResubmitComplete]);

  const handleClose = useCallback(() => {
    if (isAndroid) {
      androidForm.reset();
    } else {
      iosForm.reset();
    }
    onClose();
  }, [isAndroid, androidForm, iosForm, onClose]);

  const handleRetry = useCallback(() => {
    if (isAndroid) {
      androidForm.onSubmit(handleAndroidSubmit)();
    } else {
      iosForm.onSubmit(handleIOSSubmit)();
    }
  }, [isAndroid, androidForm, iosForm, handleAndroidSubmit, handleIOSSubmit]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.ACTION.PRIMARY} variant="light" size="lg" radius={DS_SPACING.BORDER_RADIUS}>
            <IconEdit size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
            {DIALOG_TITLES.RESUBMIT} {platformLabel}
          </Text>
        </Group>
      }
      size="lg"
    >
      <form onSubmit={isAndroid ? androidForm.onSubmit(handleAndroidSubmit) : iosForm.onSubmit(handleIOSSubmit)}>
        <Stack gap={DS_SPACING.MD}>
          {/* Info Alert */}
          <Alert color={DS_COLORS.ACTION.PRIMARY} variant="light" icon={<IconAlertCircle size={16} />} radius={DS_SPACING.BORDER_RADIUS}>
            {isAndroid 
              ? 'This will create a new production submission with the provided AAB file.'
              : 'This will create a new production submission with the provided TestFlight build.'}
          </Alert>

          {/* New Artifact Upload */}
          {isAndroid ? (
            <FileInput
              label="Upload AAB File"
              placeholder="Select AAB file"
              accept=".aab"
              withAsterisk
              disabled={isSubmitting}
              leftSection={<IconUpload size={16} />}
              error={androidForm.errors.aabFile}
              {...androidForm.getInputProps('aabFile')}
            />
          ) : (
            <NumberInput
              label="TestFlight Build Number"
              placeholder="New TestFlight Build Number"
              withAsterisk
              min={1}
              disabled={isSubmitting}
              error={iosForm.errors.testflightNumber}
              {...iosForm.getInputProps('testflightNumber')}
            />
          )}

          {/* Version */}
          <TextInput
            label="Version"
            placeholder="e.g., 2.7.1"
            withAsterisk
            disabled={isSubmitting}
            error={isAndroid ? androidForm.errors.version : iosForm.errors.version}
            {...(isAndroid ? androidForm.getInputProps('version') : iosForm.getInputProps('version'))}
          />

          {/* Platform-specific fields */}
          {isAndroid ? (
            <>
              <NumberInput
                label="Version Code (Optional)"
                description="Will be extracted from AAB if not provided"
                placeholder="e.g., 271"
                min={1}
                disabled={isSubmitting}
                {...androidForm.getInputProps('versionCode')}
              />

              <NumberInput
                label="Initial Rollout Percentage"
                description="Start with a small percentage and gradually increase"
                placeholder="Enter rollout percentage"
                min={MIN_ROLLOUT_PERCENT}
                max={MAX_ROLLOUT_PERCENT}
                suffix="%"
                withAsterisk
                disabled={isSubmitting}
                error={androidForm.errors.rolloutPercentage}
                {...androidForm.getInputProps('rolloutPercentage')}
              />

              <Select
                label="In-App Update Priority"
                description="Priority for in-app updates (0 = lowest, 5 = highest)"
                placeholder="Select priority"
                data={[
                  { value: '0', label: '0 - Lowest' },
                  { value: '1', label: '1 - Low' },
                  { value: '2', label: '2 - Medium' },
                  { value: '3', label: '3 - High' },
                  { value: '4', label: '4 - Higher' },
                  { value: '5', label: '5 - Highest (Immediate)' },
                ]}
                withAsterisk
                disabled={isSubmitting}
                error={androidForm.errors.inAppUpdatePriority}
                value={androidForm.values.inAppUpdatePriority.toString()}
                onChange={(value) => androidForm.setFieldValue('inAppUpdatePriority', parseInt(value ?? '0'))}
              />
            </>
          ) : (
            <>
              <Checkbox
                label="Enable Phased Release"
                description="7-day automatic rollout by Apple (can be paused/resumed)"
                disabled={isSubmitting}
                {...iosForm.getInputProps('phasedRelease', { type: 'checkbox' })}
              />

              <Checkbox
                label="Reset App Rating"
                description="Reset app ratings to zero for this version"
                disabled={isSubmitting}
                {...iosForm.getInputProps('resetRating', { type: 'checkbox' })}
              />
            </>
          )}

          {/* Release Notes */}
          <Textarea
            label="Release Notes"
            placeholder="What's new in this version?"
            withAsterisk
            minRows={3}
            disabled={isSubmitting}
            error={isAndroid ? androidForm.errors.releaseNotes : iosForm.errors.releaseNotes}
            {...(isAndroid ? androidForm.getInputProps('releaseNotes') : iosForm.getInputProps('releaseNotes'))}
          />

          {/* Error Display */}
          {fetcher.data?.error && (
            <ErrorAlert
              error={typeof fetcher.data.error === 'string' ? fetcher.data.error : fetcher.data.error.message || 'An error occurred'}
              onRetry={handleRetry}
              onDismiss={() => fetcher.load('/')}
            />
          )}

          {/* Action Buttons */}
          <Group justify="flex-end" mt={DS_SPACING.LG}>
            <Button 
              variant="subtle" 
              onClick={handleClose} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={isSubmitting}
              leftSection={<IconUpload size={DIALOG_ICON_SIZES.ACTION} />}
              color={DS_COLORS.ACTION.PRIMARY}
              radius={DS_SPACING.BORDER_RADIUS}
            >
              Submit
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
