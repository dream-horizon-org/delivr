/**
 * PlatformSubmissionCard - Shows submission status for a single platform
 * 
 * Features:
 * - Platform-specific icons and branding
 * - Submission status with timeline
 * - Quick actions (view details, retry)
 */

import { Card, Group, Stack, Text, Badge, Button, ThemeIcon, Anchor } from '@mantine/core';
import { 
  IconBrandAndroid,
  IconBrandApple, 
  IconApple, 
  IconExternalLink, 
  IconRefresh,
  IconCheck,
  IconClock,
  IconX,
  IconEye,
} from '@tabler/icons-react';
import { Platform, SubmissionStatus, StoreType } from '~/types/distribution.types';
import { 
  PLATFORM_LABELS,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_COLORS,
  BUTTON_LABELS,
} from '~/constants/distribution.constants';
import type { PlatformSubmissionCardProps } from './distribution.types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusIcon(status: SubmissionStatus | null) {
  if (!status) return <IconClock size={14} />;
  
  switch (status) {
    case SubmissionStatus.LIVE:
    case SubmissionStatus.APPROVED:
      return <IconCheck size={14} />;
    case SubmissionStatus.REJECTED:
    case SubmissionStatus.HALTED:
      return <IconX size={14} />;
    default:
      return <IconClock size={14} />;
  }
}

function getStoreUrl(platform: Platform): string {
  return platform === Platform.ANDROID
    ? 'https://play.google.com/console'
    : 'https://appstoreconnect.apple.com';
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PlatformIcon({ platform }: { platform: Platform }) {
  const isAndroid = platform === Platform.ANDROID;
  
  return (
    <ThemeIcon 
      size="lg" 
      radius="md" 
      variant="light" 
      color={isAndroid ? 'green' : 'blue'}
    >
      {isAndroid ? <IconBrandAndroid size={20} /> : <IconBrandApple size={20} />}
    </ThemeIcon>
  );
}

function EmptyState({ platform }: { platform: Platform }) {
  return (
    <Stack gap="sm" align="center" py="md">
      <Text c="dimmed" size="sm" ta="center">
        Not submitted to {platform === Platform.ANDROID ? 'Play Store' : 'App Store'} yet.
      </Text>
    </Stack>
  );
}

function SubmissionDetails({ 
  submission 
}: { 
  submission: NonNullable<PlatformSubmissionCardProps['submission']>;
}) {
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Text size="sm" c="dimmed">Version:</Text>
        <Text size="sm" fw={500}>
          {submission.versionName} ({submission.versionCode})
        </Text>
      </Group>
      
      {submission.track && (
        <Group gap="xs">
          <Text size="sm" c="dimmed">Track:</Text>
          <Badge size="xs" variant="light">{submission.track}</Badge>
        </Group>
      )}

      <Group gap="xs">
        <Text size="sm" c="dimmed">Exposure:</Text>
        <Text size="sm" fw={500}>{submission.exposurePercent}%</Text>
      </Group>

      {submission.submittedAt && (
        <Group gap="xs">
          <Text size="sm" c="dimmed">Submitted:</Text>
          <Text size="sm">{new Date(submission.submittedAt).toLocaleDateString()}</Text>
        </Group>
      )}
    </Stack>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
  const isRejected = submission?.submissionStatus === SubmissionStatus.REJECTED;
  const isReleased = submission?.submissionStatus === SubmissionStatus.LIVE;
  const storeName = platform === Platform.ANDROID ? 'Play Store' : 'App Store';

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
            color={SUBMISSION_STATUS_COLORS[submission.submissionStatus]} 
            variant="light"
            leftSection={getStatusIcon(submission.submissionStatus)}
          >
            {SUBMISSION_STATUS_LABELS[submission.submissionStatus]}
          </Badge>
        )}
      </Group>

      {/* Content */}
      {hasSubmission ? (
        <>
          <SubmissionDetails submission={submission} />

          {/* Rejection Warning */}
          {isRejected && submission.rejectionReason && (
            <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
              <Text size="xs" c="red.7" fw={500}>
                Rejection: {submission.rejectionReason}
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
              href={getStoreUrl(platform)}
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
        <EmptyState platform={platform} />
      )}
    </Card>
  );
}

