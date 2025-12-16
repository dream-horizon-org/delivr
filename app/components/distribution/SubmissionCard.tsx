/**
 * SubmissionCard - Displays submission details
 * 
 * Features:
 * - Platform and store info
 * - Version and track details
 * - Status with timeline
 * - Submission history audit trail (actionHistory)
 * - Clickable for navigation
 */

import { Badge, Button, Card, Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import {
    IconBrandAndroid,
    IconBrandApple,
    IconCheck,
    IconChevronRight,
    IconClock,
    IconHistory,
    IconPlayerPause,
    IconX,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import {
    DISTRIBUTION_UI_LABELS,
    PLATFORM_LABELS,
    STORE_NAMES,
    SUBMISSION_STATUS_COLORS,
    SUBMISSION_STATUS_LABELS
} from '~/constants/distribution.constants';
import { Platform, SubmissionStatus } from '~/types/distribution.types';
import { RolloutProgressBar } from './RolloutProgressBar';
import { SubmissionHistoryPanel, type HistoryEvent } from './SubmissionHistoryPanel';
import type { SubmissionCardProps } from './distribution.types';
import { getRolloutDisplayStatus } from './distribution.utils';

// ============================================================================
// CONSTANTS
// ============================================================================

const ICON_SIZES = {
  PLATFORM: 18,
  STATUS: 14,
  CHEVRON: 16,
} as const;

const TIMELINE_LABEL_WIDTH = 70;

// ============================================================================
// LOCAL HELPER - Returns JSX (must stay in component file)
// ============================================================================

function getSubmissionStatusIcon(status: SubmissionStatus) {
  if (status === SubmissionStatus.LIVE || status === SubmissionStatus.APPROVED) {
    return <IconCheck size={ICON_SIZES.STATUS} />;
  }
  if (status === SubmissionStatus.PAUSED) {
    return <IconPlayerPause size={ICON_SIZES.STATUS} />;
  }
  if (status === SubmissionStatus.REJECTED || status === SubmissionStatus.HALTED || status === SubmissionStatus.CANCELLED) {
    return <IconX size={ICON_SIZES.STATUS} />;
  }
  return <IconClock size={ICON_SIZES.STATUS} />;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

type PlatformIconProps = {
  platform: Platform;
};

function PlatformIcon({ platform }: PlatformIconProps) {
  const isAndroid = platform === Platform.ANDROID;
  
  return (
    <ThemeIcon 
      size="md" 
      radius="md" 
      variant="light" 
      color={isAndroid ? 'green' : 'blue'}
    >
      {isAndroid ? (
        <IconBrandAndroid size={ICON_SIZES.PLATFORM} />
      ) : (
        <IconBrandApple size={ICON_SIZES.PLATFORM} />
      )}
    </ThemeIcon>
  );
}

type SubmissionTimelineProps = {
  submission: SubmissionCardProps['submission'];
};

function SubmissionTimeline({ submission }: SubmissionTimelineProps) {
  const { submittedAt } = submission;
  // Note: approvedAt and releasedAt are not in the API spec
  
  return (
    <Stack gap={4}>
      {submittedAt && (
        <Group gap="xs">
          <Text size="xs" c="dimmed" w={TIMELINE_LABEL_WIDTH}>
            {DISTRIBUTION_UI_LABELS.TIMELINE_SUBMITTED}
          </Text>
          <Text size="xs">{new Date(submittedAt).toLocaleDateString()}</Text>
        </Group>
      )}
      {/* approvedAt and releasedAt are not available in API spec */}
    </Stack>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmissionCard(props: SubmissionCardProps) {
  const { 
    submission, 
    compact = false,
    onClick,
    className,
  } = props;

  const {
    platform,
    status,
    version,
    rolloutPercentage,
    actionHistory,
  } = submission;
  
  // Extract platform-specific fields
  const versionCode = submission.platform === Platform.ANDROID && 'versionCode' in submission 
    ? submission.versionCode 
    : null;

  const [showHistory, setShowHistory] = useState(false);

  const isRejected = status === SubmissionStatus.REJECTED;
  const storeName = STORE_NAMES[platform];
  const rolloutStatus = useMemo(
    () => getRolloutDisplayStatus(rolloutPercentage, status),
    [rolloutPercentage, status]
  );

  // Transform actionHistory into HistoryEvent format for the panel
  const historyEvents: HistoryEvent[] = useMemo(() => {
    if (!actionHistory || actionHistory.length === 0) return [];
    
    return actionHistory.map((historyItem) => ({
      id: `${historyItem.action}-${historyItem.createdAt}`,
      timestamp: historyItem.createdAt,
      action: historyItem.action,  // PAUSED, RESUMED, CANCELLED, HALTED
      actor: historyItem.createdBy,  // Email of user who performed the action
      actorType: 'user' as const,
      metadata: historyItem.reason ? { reason: historyItem.reason } : undefined,
    }));
  }, [actionHistory]);

  const CardWrapper = onClick ? UnstyledButton : 'div';
  const cardWrapperClass = `w-full ${onClick ? 'hover:bg-gray-50 transition-colors' : ''}`;

  return (
    <CardWrapper 
      onClick={onClick}
      className={cardWrapperClass}
    >
      <Card 
        shadow="sm" 
        padding={compact ? 'md' : 'lg'} 
        radius="md" 
        withBorder 
        className={className}
        data-testid={`submission-card-${platform.toLowerCase()}`}
      >
        {/* Header */}
        <Group justify="space-between" mb={compact ? 'sm' : 'md'}>
          <Group gap="sm">
            <PlatformIcon platform={platform} />
            <div>
              <Group gap="xs">
                <Text fw={600} size={compact ? 'sm' : 'md'}>
                  {PLATFORM_LABELS[platform]}
                </Text>
                {/* track field is not in API spec */}
              </Group>
              <Text size="xs" c="dimmed">{storeName}</Text>
            </div>
          </Group>
          
          <Group gap="sm">
            <Badge 
              color={SUBMISSION_STATUS_COLORS[status]} 
              variant="light"
              leftSection={getSubmissionStatusIcon(status)}
            >
              {SUBMISSION_STATUS_LABELS[status]}
            </Badge>
            
            {onClick && (
              <IconChevronRight size={ICON_SIZES.CHEVRON} className="text-gray-400" />
            )}
          </Group>
        </Group>

        {/* Version Info */}
        <Group gap="lg" mb={compact ? 'sm' : 'md'}>
          <div>
            <Text size="xs" c="dimmed">{DISTRIBUTION_UI_LABELS.VERSION_LABEL}</Text>
            <Text size="sm" fw={500}>{version}</Text>
          </div>
          {versionCode && (
            <div>
              <Text size="xs" c="dimmed">{DISTRIBUTION_UI_LABELS.BUILD_LABEL}</Text>
              <Text size="sm" fw={500}>{versionCode}</Text>
            </div>
          )}
          <div>
            <Text size="xs" c="dimmed">{DISTRIBUTION_UI_LABELS.EXPOSURE_LABEL}</Text>
            <Text size="sm" fw={500}>{rolloutPercentage}%</Text>
          </div>
        </Group>

        {/* Rollout Progress (if not compact) */}
        {!compact && (
          <RolloutProgressBar
            percentage={rolloutPercentage}
            status={rolloutStatus}
            showLabel={false}
            size="sm"
          />
        )}

        {/* Rejection Warning - rejectionReason not in API spec */}
        {isRejected && (
          <div className={`${compact ? 'mt-2' : 'mt-3'} p-2 bg-red-50 rounded border border-red-200`}>
            <Text size="xs" c="red.7" lineClamp={compact ? 1 : 2}>
              <Text span fw={500}>{DISTRIBUTION_UI_LABELS.REJECTION_LABEL}:</Text> Submission was rejected
            </Text>
          </div>
        )}

        {/* Timeline (if not compact) */}
        {!compact && (
          <div className="mt-3 pt-3 border-t">
            <SubmissionTimeline submission={submission} />
            
            {/* View History Button - Shows action history (PAUSED, RESUMED, HALTED, CANCELLED) */}
            {historyEvents.length > 0 && (
              <Group justify="flex-end" mt="sm">
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconHistory size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHistory(true);
                  }}
                >
                  View History
                </Button>
              </Group>
            )}
          </div>
        )}
      </Card>

      {/* History Panel - Shows action history from actionHistory array */}
      <SubmissionHistoryPanel
        opened={showHistory}
        onClose={() => setShowHistory(false)}
        submissionId={submission.id}
        platform={platform}
        version={version}
        events={historyEvents}
      />
    </CardWrapper>
  );
}

