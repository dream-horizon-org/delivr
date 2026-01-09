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
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import { STORE_TYPE_NAMES } from '~/constants/distribution/distribution.constants';
import { type IOSSubmission } from '~/types/distribution/distribution.types';
import {
  isFetcherSubmitting,
  isIOSPromoteFormValid,
  parseFetcherResponse,
  validateReleaseNotes,
} from '~/utils/distribution';
import { ErrorAlert } from './ErrorRecovery';

// ============================================================================
// TYPES
// ============================================================================

export interface PromoteIOSSubmissionDialogProps {
  opened: boolean;
  onClose: () => void;
  submission: IOSSubmission;
  releaseId: string; // Required for backend ownership validation
  onPromoteComplete?: () => void;
  action?: string; // Optional: custom form action URL (defaults to current route)
}

export interface IOSPromoteFormData {
  phasedRelease: boolean;
  resetRating: boolean;
  releaseNotes: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PromoteIOSSubmissionDialog({
  opened,
  onClose,
  submission,
  releaseId,
  onPromoteComplete,
  action,
}: PromoteIOSSubmissionDialogProps) {
  const fetcher = useFetcher();
  const { isSuccess, error } = parseFetcherResponse(fetcher.data);
  const isSubmitting = isFetcherSubmitting(fetcher.state);

  const form = useForm<IOSPromoteFormData>({
    initialValues: {
      phasedRelease: true,
      resetRating: false,
      releaseNotes: '',
    },
    validate: {
      releaseNotes: validateReleaseNotes,
    },
  });

  // Handle successful submission
  useEffect(() => {
    if (fetcher.state === 'idle' && isSuccess) {
      form.reset();
      onPromoteComplete?.();
    }
  }, [fetcher.state, isSuccess, form, onPromoteComplete]);

  const handleSubmit = (values: IOSPromoteFormData) => {
    const formData = new FormData();
    formData.append('intent', 'promoteSubmission');
    formData.append('submissionId', submission.id);
    formData.append('releaseId', releaseId);
    formData.append('platform', submission.platform);
    formData.append('phasedRelease', String(values.phasedRelease));
    formData.append('resetRating', String(values.resetRating));
    formData.append('releaseNotes', values.releaseNotes);
    
    // Submit to custom action URL if provided, otherwise current route
    fetcher.submit(formData, { 
      method: 'post',
      ...(action && { action })
    });
  };

  const isFormValid = isIOSPromoteFormValid(form.values);

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
          {error && <ErrorAlert error={error} />}

          <Divider label="Build Information" labelPosition="center" />

          <BuildInfoSection submission={submission} />

          <Divider label="Submission Details" labelPosition="center" />

          <SubmissionFormSection form={form} />

          <DialogActions
            onClose={onClose}
            isSubmitting={isSubmitting}
            isFormValid={isFormValid}
            submitLabel="Submit to App Store"
          />
        </Stack>
      </form>
    </Modal>
  );
}

// ============================================================================
// SUB-COMPONENTS (Presentation only)
// ============================================================================

function BuildInfoSection({ submission }: { submission: IOSSubmission }) {
  return (
    <Paper p={DS_SPACING.MD} withBorder radius={DS_SPACING.BORDER_RADIUS} bg={DS_COLORS.BACKGROUND.CARD}>
      <Stack gap={DS_SPACING.SM}>
        <InfoRow label="Platform">
          <Badge size="lg" leftSection={<IconBrandApple size={14} />} color={DS_COLORS.PLATFORM.IOS}>
            IOS
          </Badge>
        </InfoRow>

        <InfoRow label="Store Type">
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
            {STORE_TYPE_NAMES[submission.storeType]}
          </Text>
        </InfoRow>

        <InfoRow label="Version">
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} className="font-mono">
            {submission.version}
          </Text>
        </InfoRow>

        <InfoRow label="Release Type">
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
            After Approval
          </Text>
        </InfoRow>

        {submission.artifact && 'testflightNumber' in submission.artifact && (
          <>
            <Divider my={DS_SPACING.XS} />
            <InfoRow label="TestFlight Build">
              <Badge size="lg" variant="light" color={DS_COLORS.PLATFORM.IOS} className="font-mono">
                #{submission.artifact.testflightNumber}
              </Badge>
            </InfoRow>
          </>
        )}
      </Stack>
    </Paper>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Group justify="space-between" align="center">
      <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
        {label}
      </Text>
      {children}
    </Group>
  );
}

function SubmissionFormSection({ form }: { form: ReturnType<typeof useForm<IOSPromoteFormData>> }) {
  return (
    <Stack gap={DS_SPACING.MD}>
      <Checkbox
        label="Enable Phased Release"
        description="7-day automatic rollout by Apple (can be paused/resumed)"
        {...form.getInputProps('phasedRelease', { type: 'checkbox' })}
      />

      <Checkbox
        label="Reset App Rating"
        description="Reset app ratings to zero for this version"
        {...form.getInputProps('resetRating', { type: 'checkbox' })}
      />

      <Textarea
        label="Release Notes"
        description="What's new in this version (visible to users)"
        placeholder="Enter release notes..."
        minRows={4}
        maxRows={8}
        withAsterisk
        error={form.errors.releaseNotes}
        {...form.getInputProps('releaseNotes')}
      />
    </Stack>
  );
}

function DialogActions({
  onClose,
  isSubmitting,
  isFormValid,
  submitLabel,
}: {
  onClose: () => void;
  isSubmitting: boolean;
  isFormValid: boolean;
  submitLabel: string;
}) {
  return (
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
        {submitLabel}
      </Button>
    </Group>
  );
}
