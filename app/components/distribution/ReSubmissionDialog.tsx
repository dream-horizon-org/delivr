/**
 * ReSubmissionDialog - Create NEW submission after rejection/cancellation
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
    Divider,
    FileInput,
    Group,
    Modal,
    NumberInput,
    Paper,
    Select,
    Slider,
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
import {
    BUTTON_LABELS,
    DIALOG_ICON_SIZES,
    DIALOG_TITLES,
    MAX_ROLLOUT_PERCENT,
    MIN_ROLLOUT_PERCENT,
    PLATFORM_LABELS
} from '~/constants/distribution.constants';
import {
    AndroidSubmission,
    IOSSubmission,
    Platform,
    type Submission
} from '~/types/distribution.types';
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
  testflightNumber: number | null;  // Renamed from testflightBuildNumber
  phasedRelease: boolean;
  resetRating: boolean;
  releaseNotes: string;
};

export type ReSubmissionDialogProps = {
  opened: boolean;
  onClose: () => void;
  distributionId: string;
  previousSubmission: Submission;
  onResubmitComplete?: () => void;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReSubmissionDialog({
  opened,
  onClose,
  distributionId,
  previousSubmission,
  onResubmitComplete,
}: ReSubmissionDialogProps) {
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
      version: previousSubmission.version || '',
      versionCode: androidSubmission?.versionCode,
      aabFile: null,
      rolloutPercentage: previousSubmission.rolloutPercentage || 5,
      inAppUpdatePriority: androidSubmission?.inAppUpdatePriority ?? 0,
      releaseNotes: previousSubmission.releaseNotes || '',
    },
    validate: {
      aabFile: (value) => (!value ? 'Please upload an AAB file' : null),
      version: (value) => (!value ? 'Version is required' : null),
      rolloutPercentage: (value) => {
        if (value < MIN_ROLLOUT_PERCENT || value > MAX_ROLLOUT_PERCENT) return `Must be between ${MIN_ROLLOUT_PERCENT} and ${MAX_ROLLOUT_PERCENT}`;
        return null;
      },
      inAppUpdatePriority: (value) => {
        if (value < 0 || value > 5) return 'Must be between 0 and 5';
        return null;
      },
      releaseNotes: (value) => (!value ? 'Release notes are required' : null),
    },
  });

  // iOS form
  const iosSubmission = previousSubmission.platform === Platform.IOS
    ? previousSubmission as IOSSubmission
    : null;
  
  const iosForm = useForm<IOSResubmissionFormData>({
    initialValues: {
      version: previousSubmission.version || '',
      testflightNumber: null,  // Renamed from testflightBuildNumber
      phasedRelease: iosSubmission?.phasedRelease ?? true,
      resetRating: iosSubmission?.resetRating ?? false,
      releaseNotes: previousSubmission.releaseNotes || '',
    },
    validate: {
      version: (value) => (!value ? 'Version is required' : null),
      testflightNumber: (value) => (!value ? 'TestFlight build number is required' : null),  // Renamed from testflightBuildNumber
      releaseNotes: (value) => (!value ? 'Release notes are required' : null),
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
      action: `/api/v1/distributions/${distributionId}/submissions`,
      encType: 'multipart/form-data',
    });
  }, [distributionId, fetcher]);

  // Handle iOS submission
  const handleIOSSubmit = useCallback((values: IOSResubmissionFormData, _event?: React.FormEvent<HTMLFormElement>) => {
    if (!values.testflightNumber) return;

    const payload = {
      platform: Platform.IOS,
      version: values.version,
      testflightNumber: values.testflightNumber,  // Renamed from testflightBuildNumber
      phasedRelease: values.phasedRelease,
      resetRating: values.resetRating,
      releaseNotes: values.releaseNotes,
    };

    fetcher.submit(JSON.stringify(payload), {
      method: 'POST',
      action: `/api/v1/distributions/${distributionId}/submissions`,
      encType: 'application/json',
    });
  }, [distributionId, fetcher]);

  // Handle success
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && onResubmitComplete) {
      onResubmitComplete();
      onClose();
    }
  }, [fetcher.state, fetcher.data, onResubmitComplete, onClose]);

  const handleClose = useCallback(() => {
    if (isAndroid) {
      androidForm.reset();
    } else {
      iosForm.reset();
    }
    onClose();
  }, [isAndroid, androidForm, iosForm, onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="blue" variant="light" size="lg">
            <IconEdit size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={600}>
            {DIALOG_TITLES.RESUBMIT} {platformLabel}
          </Text>
        </Group>
      }
      size="lg"
    >
      <form onSubmit={isAndroid ? androidForm.onSubmit(handleAndroidSubmit) : iosForm.onSubmit(handleIOSSubmit)}>
        <Stack gap="md">
          {/* Info Alert */}
          <Alert color="blue" variant="light" icon={<IconAlertCircle size={16} />}>
            This will create a new submission. You must provide a new artifact (AAB or TestFlight build).
          </Alert>

          {/* Previous Artifact Info */}
          <div>
            <Text size="sm" fw={500} mb="xs">Previous Artifact (Read-Only)</Text>
            <Paper p="xs" withBorder bg="gray.0">
              {isAndroid ? (
                <Text size="xs" c="dimmed">
                  AAB: {previousSubmission.artifact?.artifactPath || 'N/A'}
                </Text>
              ) : (
                <Text size="xs" c="dimmed">
                  TestFlight Build: {previousSubmission.artifact?.testflightNumber || 'N/A'}
                </Text>
              )}
            </Paper>
          </div>

          <Divider />

          {/* New Artifact Upload */}
          <div>
            <Text size="sm" fw={500} mb="xs">New Artifact (Required)</Text>
            
            {isAndroid ? (
              <FileInput
                label="Upload New AAB File"
                placeholder="Select AAB file"
                accept=".aab"
                required
                disabled={isSubmitting}
                leftSection={<IconUpload size={16} />}
                {...androidForm.getInputProps('aabFile')}
              />
            ) : (
              <NumberInput
                label="New TestFlight Build Number"
                placeholder="Enter build number"
                required
                min={1}
                disabled={isSubmitting}
                {...iosForm.getInputProps('testflightNumber')}
              />
            )}
          </div>

          <Divider />

          {/* Version */}
          <TextInput
            label="Version"
            placeholder="e.g., 2.7.1"
            required
            disabled={isSubmitting}
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

              <div>
                <Text size="sm" fw={500} mb="xs">
                  Initial Rollout Percentage
                </Text>
                <Slider
                  min={0}
                  max={100}
                  step={0.1}
                  marks={[
                    { value: 1, label: '1%' },
                    { value: 5, label: '5%' },
                    { value: 10, label: '10%' },
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' },
                  ]}
                  disabled={isSubmitting}
                  {...androidForm.getInputProps('rolloutPercentage')}
                />
                <Text size="xs" c="dimmed" mt="xs">
                  Current: {androidForm.values.rolloutPercentage}%
                </Text>
              </div>

              <Select
                label="In-App Update Priority"
                description="0 = Normal, 5 = Critical"
                data={[
                  { value: '0', label: '0 - Normal' },
                  { value: '1', label: '1' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                  { value: '4', label: '4' },
                  { value: '5', label: '5 - Critical' },
                ]}
                disabled={isSubmitting}
                value={androidForm.values.inAppUpdatePriority.toString()}
                onChange={(value) => androidForm.setFieldValue('inAppUpdatePriority', parseInt(value || '0'))}
              />
            </>
          ) : (
            <>
              <Select
                label="Release Type"
                description="Phased Release (7-day rollout) or Manual Release (immediate)"
                data={[
                  { value: 'true', label: 'Phased Release (7-day automatic)' },
                  { value: 'false', label: 'Manual Release (immediate 100%)' },
                ]}
                disabled={isSubmitting}
                value={iosForm.values.phasedRelease.toString()}
                onChange={(value) => iosForm.setFieldValue('phasedRelease', value === 'true')}
              />

              <Select
                label="Reset Rating"
                description="Whether to reset the app rating for this release"
                data={[
                  { value: 'false', label: 'Keep existing rating' },
                  { value: 'true', label: 'Reset rating to zero' },
                ]}
                disabled={isSubmitting}
                value={iosForm.values.resetRating.toString()}
                onChange={(value) => iosForm.setFieldValue('resetRating', value === 'true')}
              />
            </>
          )}

          {/* Release Notes */}
          <Textarea
            label="Release Notes"
            placeholder="What's new in this version?"
            required
            minRows={3}
            disabled={isSubmitting}
            {...(isAndroid ? androidForm.getInputProps('releaseNotes') : iosForm.getInputProps('releaseNotes'))}
          />

          {/* Error Display */}
          {fetcher.data?.error && (
            <ErrorAlert
              error={typeof fetcher.data.error === 'string' ? fetcher.data.error : fetcher.data.error.message || 'An error occurred'}
              onRetry={isAndroid ? () => androidForm.onSubmit(handleAndroidSubmit)() : () => iosForm.onSubmit(handleIOSSubmit)()}
              onDismiss={() => fetcher.load('/')}
            />
          )}

          {/* Action Buttons */}
          <Group justify="flex-end" mt="md">
            <Button 
              variant="subtle" 
              onClick={handleClose} 
              disabled={isSubmitting}
            >
              {BUTTON_LABELS.CANCEL}
            </Button>
            <Button 
              type="submit" 
              loading={isSubmitting}
              leftSection={<IconUpload size={DIALOG_ICON_SIZES.ACTION} />}
            >
              {BUTTON_LABELS.RESUBMIT}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
