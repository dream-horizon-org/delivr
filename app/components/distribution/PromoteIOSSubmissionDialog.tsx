/**
 * PromoteIOSSubmissionDialog
 * 
 * Submit PENDING iOS submission to Apple App Store
 * - User fills: Phased Release, Reset Rating, Release Notes
 * - Calls: POST /api/v1/submissions/:submissionId/submit?platform=IOS
 * - Transition: PENDING → IN_REVIEW
 */

import {
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useFetcher } from '@remix-run/react';
import { IconBrandApple, IconRocket } from '@tabler/icons-react';
import { useEffect } from 'react';
import { STORE_TYPE_NAMES } from '~/constants/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
  DS_COMPONENTS,
} from '~/constants/distribution-design.constants';
import { type IOSSubmission } from '~/types/distribution.types';
import { ErrorAlert } from './ErrorRecovery';

// ============================================================================
// TYPES
// ============================================================================

interface PromoteIOSSubmissionDialogProps {
  opened: boolean;
  onClose: () => void;
  submission: IOSSubmission;
  onPromoteComplete?: () => void;
}

type FormData = {
  phasedRelease: boolean;
  resetRating: boolean;
  releaseNotes: string;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PromoteIOSSubmissionDialog({
  opened,
  onClose,
  submission,
  onPromoteComplete,
}: PromoteIOSSubmissionDialogProps) {
  const fetcher = useFetcher();

  // Form setup
  const form = useForm<FormData>({
    initialValues: {
      phasedRelease: true, // Default to phased release
      resetRating: false, // Default to not reset rating
      releaseNotes: '',
    },
    validate: {
      releaseNotes: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Release notes are required';
        }
        return null;
      },
    },
  });

  // Handle form submission
  const handleSubmit = (values: FormData) => {
    const formData = new FormData();
    formData.append('intent', 'promoteSubmission');
    formData.append('submissionId', submission.id);
    formData.append('platform', submission.platform);
    formData.append('phasedRelease', String(values.phasedRelease));
    formData.append('resetRating', String(values.resetRating));
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
  const isFormValid = form.values.releaseNotes.trim().length > 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={DS_SPACING.SM}>
          <IconRocket size={24} />
          <Title order={3}>Submit to App Store</Title>
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
                <Badge size="lg" leftSection={<IconBrandApple size={14} />} color={DS_COLORS.PLATFORM.IOS}>
                  IOS
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
                  Release Type
                </Text>
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                  After Approval
                </Text>
              </Group>

              {/* Artifact Info */}
              {submission.artifact && 'testflightNumber' in submission.artifact && (
                <>
                  <Divider my={DS_SPACING.XS} />

                  <Group justify="space-between" align="center">
                    <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} c={DS_COLORS.TEXT.PRIMARY}>
                      TestFlight Build
                    </Text>
                    <Badge size="lg" variant="light" color={DS_COLORS.PLATFORM.IOS} className="font-mono">
                      #{submission.artifact.testflightNumber}
                    </Badge>
                  </Group>
                </>
              )}
            </Stack>
          </Paper>

          <Divider label="Submission Details" labelPosition="center" />

          {/* Editable Section */}
          <Stack gap={DS_SPACING.MD}>
            {/* Phased Release */}
            <Checkbox
              label="Enable Phased Release"
              description="7-day automatic rollout by Apple (can be paused/resumed)"
              {...form.getInputProps('phasedRelease', { type: 'checkbox' })}
            />

            {/* Reset Rating */}
            <Checkbox
              label="Reset App Rating"
              description="Reset app ratings to zero for this version"
              {...form.getInputProps('resetRating', { type: 'checkbox' })}
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
              Submit to App Store
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

