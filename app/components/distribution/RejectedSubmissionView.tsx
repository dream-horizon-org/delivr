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
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
  DS_COMPONENTS,
} from '~/constants/distribution-design.constants';
import { Platform, RejectionDetails } from '~/types/distribution.types';

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
    <Card shadow="sm" padding={DS_SPACING.LG} radius={DS_SPACING.BORDER_RADIUS} withBorder>
      <Stack gap={DS_SPACING.MD}>
        {/* Header */}
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.STATUS.ERROR} variant="light" size="lg" radius={DS_SPACING.BORDER_RADIUS}>
            <IconAlertCircle size={20} />
          </ThemeIcon>
          <div>
            <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>{PLATFORM_LABELS[platform]} Submission Rejected</Text>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
              Version {versionName} • ID: {submissionId}
            </Text>
          </div>
        </Group>

        {/* Rejection Reason */}
        <Alert color={DS_COLORS.STATUS.ERROR} variant="light" title="Rejection Reason" radius={DS_SPACING.BORDER_RADIUS}>
          <Text size={DS_TYPOGRAPHY.SIZE.SM}>{rejectionReason}</Text>
        </Alert>

        {/* Rejection Details (if available) */}
        {rejectionDetails && (
          <Stack gap={DS_SPACING.XS}>
            {rejectionDetails.guideline && (
              <Text size={DS_TYPOGRAPHY.SIZE.SM}>
                <strong>Guideline Violated:</strong> {rejectionDetails.guideline}
              </Text>
            )}
            {rejectionDetails.description && (
              <Text size={DS_TYPOGRAPHY.SIZE.SM}>
                <strong>Details:</strong> {rejectionDetails.description}
              </Text>
            )}
            {rejectionDetails.screenshot && (
              <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.ACTION.PRIMARY} component="a" href={rejectionDetails.screenshot} target="_blank">
                View Screenshot
              </Text>
            )}
          </Stack>
        )}

        {/* Recovery Options */}
        <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
          Choose how to recover:
        </Text>

        <Group grow>
          <Button
            variant="light"
            leftSection={<IconEdit size={16} />}
            onClick={onFixMetadata}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            Fix Metadata & Re-submit
          </Button>
          <Button
            variant="light"
            leftSection={<IconUpload size={16} />}
            onClick={onUploadNewBuild}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            Upload New Build
          </Button>
        </Group>

        <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
          Fix metadata if only store listing info needs changes. Upload new build if code changes are required.
        </Text>
      </Stack>
    </Card>
  );
}

