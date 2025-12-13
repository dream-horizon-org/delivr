/**
 * ReSubmissionDialog - Form to fix metadata and retry rejected submission
 * 
 * Per API Spec Section 4.11:
 * Allows editing metadata before retry
 */

import { Button, Group, Modal, Stack, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { PLATFORM_LABELS } from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';

export type ReSubmissionFormData = {
  releaseNotes: string;
  shortDescription: string;
  fullDescription: string;
  keywords: string;
};

export type ReSubmissionDialogProps = {
  opened: boolean;
  onClose: () => void;
  platform: Platform;
  submissionId: string;
  currentValues?: Partial<ReSubmissionFormData>;
  onSubmit: (data: ReSubmissionFormData) => void;
  isLoading?: boolean;
};

export function ReSubmissionDialog({
  opened,
  onClose,
  platform,
  submissionId,
  currentValues,
  onSubmit,
  isLoading,
}: ReSubmissionDialogProps) {
  const form = useForm<ReSubmissionFormData>({
    initialValues: {
      releaseNotes: currentValues?.releaseNotes || '',
      shortDescription: currentValues?.shortDescription || '',
      fullDescription: currentValues?.fullDescription || '',
      keywords: currentValues?.keywords || '',
    },
  });

  const handleSubmit = (values: ReSubmissionFormData) => {
    onSubmit(values);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Fix Metadata - ${PLATFORM_LABELS[platform]}`}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Short Description"
            placeholder="Brief description of your app"
            description={platform === Platform.ANDROID ? 'Max 80 characters' : 'Max 170 characters'}
            {...form.getInputProps('shortDescription')}
          />

          <Textarea
            label="Full Description"
            placeholder="Detailed description of your app"
            minRows={4}
            {...form.getInputProps('fullDescription')}
          />

          <Textarea
            label="Release Notes (What's New)"
            placeholder="What's new in this version..."
            minRows={3}
            {...form.getInputProps('releaseNotes')}
          />

          <TextInput
            label="Keywords"
            placeholder="Comma-separated keywords"
            description="Keywords for app store search"
            {...form.getInputProps('keywords')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Re-submit to Store
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

