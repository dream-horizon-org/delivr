/**
 * PlatformSubmissionCard - Shows submission status for a single platform
 * 
 * Features:
 * - Platform-specific icons and branding
 * - Submission status with timeline
 * - Quick actions (view details, retry)
 */

import { Anchor, Badge, Button, Card, Group, Text } from '@mantine/core';
import {
  IconCheck,
  IconClock,
  IconExternalLink,
  IconEye,
  IconPlayerPause,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import {
  BUTTON_LABELS,
  PLATFORM_LABELS,
  STORE_NAMES,
  STORE_URLS,
  SUBMISSION_STATUS_COLORS,
  SUBMISSION_STATUS_LABELS,
} from '~/constants/distribution.constants';
import { Platform, SubmissionStatus } from '~/types/distribution.types';
import type { PlatformSubmissionCardProps } from './distribution.types';
import { PlatformIcon } from './PlatformIcon';
import { PlatformSubmissionEmptyState } from './PlatformSubmissionEmptyState';
import { SubmissionDetails } from './SubmissionDetails';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusIcon(status: SubmissionStatus | null) {
  if (!status) return <IconClock size={14} />;
  
  switch (status) {
    case SubmissionStatus.LIVE:
    case SubmissionStatus.APPROVED:
      return <IconCheck size={14} />;
    case SubmissionStatus.PAUSED:
      return <IconPlayerPause size={14} />;
    case SubmissionStatus.REJECTED:
    case SubmissionStatus.HALTED:
    case SubmissionStatus.CANCELLED:
      return <IconX size={14} />;
    default:
      return <IconClock size={14} />;
  }
}

export function PlatformSubmissionCard(props: PlatformSubmissionCardProps) {
  const { 
    platform, 
    submission, 
    isSubmitting,
    onViewDetails,
    onRetry,
    className,
  } = props;

  const hasSubmission = submission !== null;
  const isRejected = submission?.status === SubmissionStatus.REJECTED;
  const isReleased = submission?.status === SubmissionStatus.LIVE;
  const storeName = STORE_NAMES[platform];

  return (
    <Card 
      shadow="sm" 
      padding="lg" 
      radius="md" 
      withBorder 
      className={className}
      data-testid={`submission-card-${platform.toLowerCase()}`}
    >
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <PlatformIcon platform={platform} />
          <div>
            <Text fw={600}>{PLATFORM_LABELS[platform]}</Text>
            <Text size="xs" c="dimmed">{storeName}</Text>
          </div>
        </Group>
        
        {hasSubmission && (
          <Badge 
            color={SUBMISSION_STATUS_COLORS[submission.status]} 
            variant="light"
            leftSection={getStatusIcon(submission.status)}
          >
            {SUBMISSION_STATUS_LABELS[submission.status]}
          </Badge>
        )}
      </Group>

      {/* Content */}
      {hasSubmission ? (
        <>
          <SubmissionDetails submission={submission} />

          {/* Rejection Warning - Not in API spec, but keeping for now */}
          {isRejected && (
            <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
              <Text size="xs" c="red.7" fw={500}>
                Rejection detected
              </Text>
            </div>
          )}

          {/* Actions */}
          <Group mt="md" gap="sm">
            {onViewDetails && (
              <Button
                variant="light"
                size="xs"
                leftSection={<IconEye size={14} />}
                onClick={onViewDetails}
              >
                View Details
              </Button>
            )}

            {isRejected && onRetry && (
              <Button
                variant="light"
                color="red"
                size="xs"
                leftSection={<IconRefresh size={14} />}
                onClick={onRetry}
                loading={isSubmitting}
              >
                {BUTTON_LABELS.RETRY}
              </Button>
            )}

            <Anchor
              href={STORE_URLS[platform]}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
            >
              <Group gap={4}>
                <IconExternalLink size={12} />
                Open Console
              </Group>
            </Anchor>
          </Group>
        </>
      ) : (
        <PlatformSubmissionEmptyState platform={platform} />
      )}
    </Card>
  );
}

