/**
 * RejectedSubmissionView - Shows rejection details and recovery options
 * 
 * Per API Spec Section 4.9:
 * When submission status is REJECTED, show:
 * - Rejection reason and details
 * - Two options: Fix metadata OR Upload new build
 */

import { Alert, Button, Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconAlertCircle, IconEdit, IconUpload } from '@tabler/icons-react';
import { PLATFORM_LABELS } from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';

// Per API Spec - Rejection details structure
export type RejectionDetails = {
  guideline?: string;
  description?: string;
  screenshot?: string;
};

export type RejectedSubmissionViewProps = {
  platform: Platform;
  submissionId: string;
  versionName: string;
  rejectionReason: string;
  rejectionDetails: RejectionDetails | null;
  onFixMetadata: () => void;
  onUploadNewBuild: () => void;
};

export function RejectedSubmissionView({
  platform,
  submissionId,
  versionName,
  rejectionReason,
  rejectionDetails,
  onFixMetadata,
  onUploadNewBuild,
}: RejectedSubmissionViewProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group gap="sm">
          <ThemeIcon color="red" variant="light" size="lg">
            <IconAlertCircle size={20} />
          </ThemeIcon>
          <div>
            <Text fw={600}>{PLATFORM_LABELS[platform]} Submission Rejected</Text>
            <Text size="xs" c="dimmed">
              Version {versionName} • ID: {submissionId}
            </Text>
          </div>
        </Group>

        {/* Rejection Reason */}
        <Alert color="red" variant="light" title="Rejection Reason">
          <Text size="sm">{rejectionReason}</Text>
        </Alert>

        {/* Rejection Details (if available) */}
        {rejectionDetails && (
          <Stack gap="xs">
            {rejectionDetails.guideline && (
              <Text size="sm">
                <strong>Guideline Violated:</strong> {rejectionDetails.guideline}
              </Text>
            )}
            {rejectionDetails.description && (
              <Text size="sm">
                <strong>Details:</strong> {rejectionDetails.description}
              </Text>
            )}
            {rejectionDetails.screenshot && (
              <Text size="sm" c="blue" component="a" href={rejectionDetails.screenshot} target="_blank">
                View Screenshot
              </Text>
            )}
          </Stack>
        )}

        {/* Recovery Options */}
        <Text size="sm" fw={500}>
          Choose how to recover:
        </Text>

        <Group grow>
          <Button
            variant="light"
            leftSection={<IconEdit size={16} />}
            onClick={onFixMetadata}
          >
            Fix Metadata & Re-submit
          </Button>
          <Button
            variant="light"
            leftSection={<IconUpload size={16} />}
            onClick={onUploadNewBuild}
          >
            Upload New Build
          </Button>
        </Group>

        <Text size="xs" c="dimmed">
          Fix metadata if only store listing info needs changes. Upload new build if code changes are required.
        </Text>
      </Stack>
    </Card>
  );
}

