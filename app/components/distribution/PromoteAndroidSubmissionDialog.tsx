/**
 * PromoteAndroidSubmissionDialog
 * 
 * Submit PENDING Android submission to Google Play Store
 * - User fills: Rollout %, In-App Update Priority, Release Notes
 * - Calls: POST /api/v1/submissions/:submissionId/submit?platform=ANDROID
 * - Transition: PENDING → IN_REVIEW
 */

import {
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
  Badge,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useFetcher } from '@remix-run/react';
import { IconBrandAndroid, IconDownload, IconExternalLink, IconRocket } from '@tabler/icons-react';
import { useEffect } from 'react';
import {
  MAX_ROLLOUT_PERCENT,
  MIN_ROLLOUT_PERCENT,
  STORE_TYPE_NAMES,
} from '~/constants/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
  DS_COMPONENTS,
} from '~/constants/distribution-design.constants';
import { type AndroidSubmission } from '~/types/distribution.types';
import { ErrorAlert } from './ErrorRecovery';

// ============================================================================
// TYPES
// ============================================================================

interface PromoteAndroidSubmissionDialogProps {
  opened: boolean;
  onClose: () => void;
  submission: AndroidSubmission;
  onPromoteComplete?: () => void;
}

type FormData = {
  rolloutPercentage: number;
  inAppUpdatePriority: number;
  releaseNotes: string;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PromoteAndroidSubmissionDialog({
  opened,
  onClose,
  submission,
  onPromoteComplete,
}: PromoteAndroidSubmissionDialogProps) {
  const fetcher = useFetcher();

  // Form setup
  const form = useForm<FormData>({
    initialValues: {
      rolloutPercentage: 5, // Default 5%
      inAppUpdatePriority: 0, // Default 0
      releaseNotes: '',
    },
    validate: {
      rolloutPercentage: (value) => {
        if (typeof value !== 'number' || isNaN(value)) {
          return 'Rollout percentage is required';
        }
        if (value < MIN_ROLLOUT_PERCENT || value > MAX_ROLLOUT_PERCENT) {
          return `Must be between ${MIN_ROLLOUT_PERCENT}% and ${MAX_ROLLOUT_PERCENT}%`;
        }
        return null;
      },
      inAppUpdatePriority: (value) => {
        if (typeof value !== 'number' || isNaN(value)) {
          return 'Priority is required';
        }
        if (value < 0 || value > 5) {
          return 'Must be between 0 and 5';
        }
        return null;
      },
      releaseNotes: (value) =>
        !value || value.trim().length === 0 ? 'Release notes are required' : null,
    },
  });

  // Handle form submission
  const handleSubmit = (values: FormData) => {
    const formData = new FormData();
    formData.append('intent', 'promoteSubmission');
    formData.append('submissionId', submission.id);
    formData.append('platform', submission.platform);
    formData.append('rolloutPercentage', values.rolloutPercentage.toString());
    formData.append('inAppUpdatePriority', values.inAppUpdatePriority.toString());
    formData.append('releaseNotes', values.releaseNotes);

    fetcher.submit(formData, { method: 'post' });
  };

  // Handle successful submission
  useEffect(() => {
    if (fetcher.state === 'idle' && (fetcher.data as any)?.success) {
      form.reset();
      onPromoteComplete?.();
    }
  }, [fetcher.state, fetcher.data, form, onPromoteComplete]);

  const isSubmitting = fetcher.state === 'submitting';
  const error = (fetcher.data as any)?.error;

  // Check if form is valid for submit button
  const isFormValid =
    form.values.releaseNotes.trim().length > 0 &&
    typeof form.values.rolloutPercentage === 'number' &&
    !isNaN(form.values.rolloutPercentage) &&
    form.values.rolloutPercentage >= MIN_ROLLOUT_PERCENT &&
    form.values.rolloutPercentage <= MAX_ROLLOUT_PERCENT &&
    typeof form.values.inAppUpdatePriority === 'number' &&
    !isNaN(form.values.inAppUpdatePriority) &&
    form.values.inAppUpdatePriority >= 0 &&
    form.values.inAppUpdatePriority <= 5;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={DS_SPACING.SM}>
          <IconRocket size={24} />
          <Title order={3}>Submit to Play Store</Title>
        </Group>
      }
      size="lg"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap={DS_SPACING.LG}>
          {/* Error Alert */}
          {error && <ErrorAlert error={error} />}

          <Divider label="Build Information" labelPosition="center" />

          {/* Read-Only Section */}
          <Paper p={DS_SPACING.MD} withBorder radius={DS_SPACING.BORDER_RADIUS} bg={DS_COLORS.BACKGROUND.CARD}>
            <Stack gap={DS_SPACING.SM}>
              <Group justify="space-between" align="center">
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} c={DS_COLORS.TEXT.PRIMARY}>
                  Platform
                </Text>
                <Badge size="lg" leftSection={<IconBrandAndroid size={14} />} color={DS_COLORS.PLATFORM.ANDROID}>
                  ANDROID
                </Badge>
              </Group>

              <Group justify="space-between" align="center">
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} c={DS_COLORS.TEXT.PRIMARY}>
                  Store Type
                </Text>
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                  {STORE_TYPE_NAMES[submission.storeType]}
                </Text>
              </Group>

              <Group justify="space-between" align="center">
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} c={DS_COLORS.TEXT.PRIMARY}>
                  Version
                </Text>
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} className="font-mono">
                  {submission.version}
                </Text>
              </Group>

              <Group justify="space-between" align="center">
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} c={DS_COLORS.TEXT.PRIMARY}>
                  Version Code
                </Text>
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} className="font-mono">
                  {submission.versionCode}
                </Text>
              </Group>

              {/* Artifact Info */}
              {submission.artifact && (
                <>
                  <Divider my={DS_SPACING.XS} />

                  {submission.artifact.artifactPath && (
                    <Group justify="space-between" align="center">
                      <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} c={DS_COLORS.TEXT.PRIMARY}>
                        AAB File
                      </Text>
                      <Button
                        component="a"
                        href={submission.artifact.artifactPath}
                        target="_blank"
                        variant="subtle"
                        size="xs"
                        leftSection={<IconDownload size={14} />}
                        radius={DS_SPACING.BORDER_RADIUS}
                      >
                        Download
                      </Button>
                    </Group>
                  )}

                  {submission.artifact.internalTrackLink && (
                    <Group justify="space-between" align="center">
                      <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} c={DS_COLORS.TEXT.PRIMARY}>
                        Internal Track Link
                      </Text>
                      <Button
                        component="a"
                        href={submission.artifact.internalTrackLink}
                        target="_blank"
                        variant="subtle"
                        size="xs"
                        rightSection={<IconExternalLink size={14} />}
                        radius={DS_SPACING.BORDER_RADIUS}
                      >
                        Open
                      </Button>
                    </Group>
                  )}
                </>
              )}
            </Stack>
          </Paper>

          <Divider label="Submission Details" labelPosition="center" />

          {/* Editable Section */}
          <Stack gap={DS_SPACING.MD}>
            {/* Rollout Percentage */}
            <NumberInput
              label="Initial Rollout Percentage"
              description="Start with a small percentage and gradually increase"
              placeholder="Enter rollout percentage"
              min={MIN_ROLLOUT_PERCENT}
              max={MAX_ROLLOUT_PERCENT}
              suffix="%"
              required
              {...form.getInputProps('rolloutPercentage')}
            />

            {/* In-App Update Priority */}
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
              required
              {...form.getInputProps('inAppUpdatePriority')}
              value={form.values.inAppUpdatePriority.toString()}
              onChange={(value) =>
                form.setFieldValue('inAppUpdatePriority', parseInt(value || '0'))
              }
            />

            {/* Release Notes */}
            <Textarea
              label="Release Notes"
              description="What's new in this version (visible to users)"
              placeholder="Enter release notes..."
              minRows={4}
              maxRows={8}
              required
              {...form.getInputProps('releaseNotes')}
            />
          </Stack>

          {/* Actions */}
          <Group justify="flex-end" gap={DS_SPACING.SM} mt={DS_SPACING.LG}>
            <Button 
              variant="subtle" 
              onClick={onClose} 
              disabled={isSubmitting}
              radius={DS_SPACING.BORDER_RADIUS}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!isFormValid || isSubmitting}
              leftSection={<IconRocket size={16} />}
              color={DS_COLORS.ACTION.PRIMARY}
              radius={DS_SPACING.BORDER_RADIUS}
            >
              Submit to Play Store
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

