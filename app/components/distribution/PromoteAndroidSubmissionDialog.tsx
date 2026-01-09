/**
 * PromoteAndroidSubmissionDialog
 * 
 * Submit PENDING Android submission to Google Play Store
 * - User fills: Rollout %, In-App Update Priority, Release Notes
 * - Calls: POST /api/v1/submissions/:submissionId/submit?platform=ANDROID
 * - Transition: PENDING → IN_REVIEW
 */

import {
  Badge,
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
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useFetcher } from '@remix-run/react';
import { IconBrandAndroid, IconDownload, IconExternalLink, IconRocket } from '@tabler/icons-react';
import { useEffect } from 'react';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import {
  IN_APP_UPDATE_PRIORITY_OPTIONS,
  MAX_ROLLOUT_PERCENT,
  MIN_ROLLOUT_PERCENT,
  STORE_TYPE_NAMES,
} from '~/constants/distribution/distribution.constants';
import { type AndroidSubmission } from '~/types/distribution/distribution.types';
import {
  isAndroidPromoteFormValid,
  isFetcherSubmitting,
  parseFetcherResponse,
  validateInAppUpdatePriority,
  validateReleaseNotes,
  validateRolloutPercentage,
} from '~/utils/distribution';
import { ErrorAlert } from './ErrorRecovery';

// ============================================================================
// TYPES
// ============================================================================

export interface PromoteAndroidSubmissionDialogProps {
  opened: boolean;
  onClose: () => void;
  submission: AndroidSubmission;
  releaseId: string; // Required for backend ownership validation
  onPromoteComplete?: () => void;
  action?: string; // Optional: custom form action URL (defaults to current route)
}

interface AndroidPromoteFormData {
  rolloutPercentage: number;
  inAppUpdatePriority: number;
  releaseNotes: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PromoteAndroidSubmissionDialog({
  opened,
  onClose,
  submission,
  releaseId,
  onPromoteComplete,
  action,
}: PromoteAndroidSubmissionDialogProps) {
  const fetcher = useFetcher();
  const { isSuccess, error } = parseFetcherResponse(fetcher.data);
  const isSubmitting = isFetcherSubmitting(fetcher.state);

  const form = useForm<AndroidPromoteFormData>({
    initialValues: {
      rolloutPercentage: 5,
      inAppUpdatePriority: 0,
      releaseNotes: '',
    },
    validate: {
      rolloutPercentage: validateRolloutPercentage,
      inAppUpdatePriority: validateInAppUpdatePriority,
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

  const handleSubmit = (values: AndroidPromoteFormData) => {
    const formData = new FormData();
    formData.append('intent', 'promoteSubmission');
    formData.append('submissionId', submission.id);
    formData.append('releaseId', releaseId);
    formData.append('platform', submission.platform);
    formData.append('rolloutPercentage', values.rolloutPercentage.toString());
    formData.append('inAppUpdatePriority', values.inAppUpdatePriority.toString());
    formData.append('releaseNotes', values.releaseNotes);
    
    // Submit to custom action URL if provided, otherwise current route
    fetcher.submit(formData, { 
      method: 'post',
      ...(action && { action })
    });
  };

  const isFormValid = isAndroidPromoteFormValid(form.values);

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
          {error && <ErrorAlert error={error} />}

          <Divider label="Build Information" labelPosition="center" />

          <BuildInfoSection submission={submission} />

          <Divider label="Submission Details" labelPosition="center" />

          <SubmissionFormSection form={form} />

          <DialogActions
            onClose={onClose}
            isSubmitting={isSubmitting}
            isFormValid={isFormValid}
            submitLabel="Submit to Play Store"
          />
        </Stack>
      </form>
    </Modal>
  );
}

// ============================================================================
// SUB-COMPONENTS (Presentation only)
// ============================================================================

function BuildInfoSection({ submission }: { submission: AndroidSubmission }) {
  return (
    <Paper p={DS_SPACING.MD} withBorder radius={DS_SPACING.BORDER_RADIUS} bg={DS_COLORS.BACKGROUND.CARD}>
      <Stack gap={DS_SPACING.SM}>
        <InfoRow label="Platform">
          <Badge size="lg" leftSection={<IconBrandAndroid size={14} />} color={DS_COLORS.PLATFORM.ANDROID}>
            ANDROID
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

        <InfoRow label="Version Code">
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} className="font-mono">
            {submission.versionCode}
          </Text>
        </InfoRow>

        {submission.artifact && <ArtifactSection artifact={submission.artifact} />}
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

function ArtifactSection({ artifact }: { artifact: AndroidSubmission['artifact'] }) {
  return (
    <>
      <Divider my={DS_SPACING.XS} />

      {artifact.artifactPath && (
        <InfoRow label="AAB File">
          <Button
            component="a"
            href={artifact.artifactPath}
            target="_blank"
            variant="subtle"
            size="xs"
            leftSection={<IconDownload size={14} />}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            Download
          </Button>
        </InfoRow>
      )}

      {artifact.internalTrackLink && (
        <InfoRow label="Internal Track Link">
          <Button
            component="a"
            href={artifact.internalTrackLink}
            target="_blank"
            variant="subtle"
            size="xs"
            rightSection={<IconExternalLink size={14} />}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            Open
          </Button>
        </InfoRow>
      )}
    </>
  );
}

function SubmissionFormSection({ form }: { form: ReturnType<typeof useForm<AndroidPromoteFormData>> }) {
  return (
    <Stack gap={DS_SPACING.MD}>
      <NumberInput
        label="Initial Rollout Percentage"
        description="Start with a small percentage and gradually increase"
        placeholder="Enter rollout percentage"
        min={MIN_ROLLOUT_PERCENT}
        max={MAX_ROLLOUT_PERCENT}
        suffix="%"
        withAsterisk
        error={form.errors.rolloutPercentage}
        {...form.getInputProps('rolloutPercentage')}
      />

      <Select
        label="In-App Update Priority"
        description="Priority for in-app updates (0 = lowest, 5 = highest)"
        placeholder="Select priority"
        data={[...IN_APP_UPDATE_PRIORITY_OPTIONS]}
        withAsterisk
        error={form.errors.inAppUpdatePriority}
        {...form.getInputProps('inAppUpdatePriority')}
        value={form.values.inAppUpdatePriority.toString()}
        onChange={(value) => form.setFieldValue('inAppUpdatePriority', parseInt(value ?? '0'))}
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
