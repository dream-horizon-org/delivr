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
    DIST_BADGE_PROPS,
    DIST_BUTTON_PROPS,
    DIST_CARD_PROPS,
    DIST_FONT_WEIGHTS,
    DIST_ICON_PROPS,
    DIST_ICON_SIZES,
    DS_COLORS,
    DS_SPACING,
    DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import { SUBMISSION_STATUS_CONFIG } from '~/constants/distribution/distribution-status-config.constants';
import {
    DISTRIBUTION_UI_LABELS,
    PLATFORM_LABELS,
    STORE_NAMES,
    SUBMISSION_STATUS_COLORS,
    SUBMISSION_STATUS_LABELS,
    SUBMISSION_TIMELINE_LABEL_WIDTH,
} from '~/constants/distribution/distribution.constants';
import type { SubmissionCardProps } from '~/types/distribution/distribution-component.types';
import { Platform, SubmissionStatus } from '~/types/distribution/distribution.types';
import { getRolloutDisplayStatus } from '~/utils/distribution';
import { isSubmissionInErrorState } from '~/utils/distribution/distribution-state.utils';
import { RolloutProgressBar } from './RolloutProgressBar';
import { SubmissionHistoryPanel, type HistoryEvent } from './SubmissionHistoryPanel';

// ============================================================================
// LOCAL HELPER - Returns JSX (must stay in component file)
// ============================================================================

/**
 * Get status icon by directly querying SSOT configuration flags.
 * Returns JSX so must stay in component file.
 */
function getSubmissionStatusIcon(status: SubmissionStatus) {
  const config = SUBMISSION_STATUS_CONFIG[status];
  
  // Directly query SSOT flags instead of intermediate category
  if (config.flags.isActive || status === SubmissionStatus.APPROVED || status === SubmissionStatus.COMPLETED) {
    return <IconCheck size={DIST_ICON_SIZES.SM} />;
  }
  if (config.flags.isPaused) {
    return <IconPlayerPause size={DIST_ICON_SIZES.SM} />;
  }
  if (config.flags.isError || config.flags.isTerminal) {
    return <IconX size={DIST_ICON_SIZES.SM} />;
  }
  // Default: pending/reviewing states
  return <IconClock size={DIST_ICON_SIZES.SM} />;
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
      {...DIST_ICON_PROPS.DEFAULT}
      color={isAndroid ? DS_COLORS.PLATFORM.ANDROID : DS_COLORS.PLATFORM.IOS}
    >
      {isAndroid ? (
        <IconBrandAndroid size={DIST_ICON_SIZES.LG} />
      ) : (
        <IconBrandApple size={DIST_ICON_SIZES.LG} />
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
    <Stack gap={DS_SPACING.XS}>
      {submittedAt && (
        <Group gap={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY} w={SUBMISSION_TIMELINE_LABEL_WIDTH}>
            {DISTRIBUTION_UI_LABELS.TIMELINE_SUBMITTED}
          </Text>
          <Text size={DS_TYPOGRAPHY.SIZE.XS}>{new Date(submittedAt).toLocaleDateString()}</Text>
        </Group>
      )}
      {/* approvedAt and releasedAt are not available in API spec */}
    </Stack>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmissionCard({ 
  submission, 
  compact = false,
  onClick,
  className,
}: SubmissionCardProps) {

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

  // Query SSOT configuration instead of hardcoded status checks
  const isRejected = isSubmissionInErrorState(status);
  
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
      ...(historyItem.reason && { metadata: { reason: historyItem.reason } }),
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
        {...(compact ? DIST_CARD_PROPS.COMPACT : DIST_CARD_PROPS.DEFAULT)}
        className={className}
        data-testid={`submission-card-${platform.toLowerCase()}`}
      >
        {/* Header */}
        <Group justify="space-between" mb={compact ? DS_SPACING.SM : DS_SPACING.MD}>
          <Group gap={DS_SPACING.SM}>
            <PlatformIcon platform={platform} />
            <div>
              <Group gap={DS_SPACING.XS}>
                <Text fw={DIST_FONT_WEIGHTS.SEMIBOLD} size={compact ? DS_TYPOGRAPHY.SIZE.SM : DS_TYPOGRAPHY.SIZE.MD}>
                  {PLATFORM_LABELS[platform]}
                </Text>
                {/* track field is not in API spec */}
              </Group>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}>{storeName}</Text>
            </div>
          </Group>
          
          <Group gap={DS_SPACING.SM}>
            <Badge 
              color={SUBMISSION_STATUS_COLORS[status]} 
              {...DIST_BADGE_PROPS.DEFAULT}
              leftSection={getSubmissionStatusIcon(status)}
            >
              {SUBMISSION_STATUS_LABELS[status]}
            </Badge>
            
            {onClick && (
              <IconChevronRight size={DIST_ICON_SIZES.MD} className="text-gray-400" />
            )}
          </Group>
        </Group>

        {/* Version Info */}
        <Group gap={DS_SPACING.LG} mb={compact ? DS_SPACING.SM : DS_SPACING.MD}>
          <div>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}>{DISTRIBUTION_UI_LABELS.VERSION_LABEL}</Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.MEDIUM}>{version}</Text>
          </div>
          {versionCode && (
            <div>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}>{DISTRIBUTION_UI_LABELS.BUILD_LABEL}</Text>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.MEDIUM}>{versionCode}</Text>
            </div>
          )}
          <div>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}>{DISTRIBUTION_UI_LABELS.EXPOSURE_LABEL}</Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.MEDIUM}>{rolloutPercentage}%</Text>
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
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.STATUS.ERROR} lineClamp={compact ? 1 : 2}>
              <Text span fw={DIST_FONT_WEIGHTS.MEDIUM}>{DISTRIBUTION_UI_LABELS.REJECTION_LABEL}:</Text> Submission was rejected
            </Text>
          </div>
        )}

        {/* Timeline (if not compact) */}
        {!compact && (
          <div className="mt-3 pt-3 border-t">
            <SubmissionTimeline submission={submission} />
            
            {/* View History Button - Shows action history (PAUSED, RESUMED, HALTED, CANCELLED) */}
            {historyEvents.length > 0 && (
              <Group justify="flex-end" mt={DS_SPACING.SM}>
                <Button
                  {...DIST_BUTTON_PROPS.SUBTLE}
                  leftSection={<IconHistory size={DIST_ICON_SIZES.SM} />}
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

