/**
 * Latest Submission Card - Active submission display with full management controls
 * Used in distribution detail page for the current active submission
 */

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconDownload,
  IconExternalLink,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconRocket,
  IconX
} from '@tabler/icons-react';
import {
  DISTRIBUTION_MANAGEMENT_UI,
  ROLLOUT_COMPLETE_PERCENT,
  SUBMISSION_STATUS_COLORS
} from '~/constants/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';
import { Platform, type Submission, SubmissionStatus } from '~/types/distribution.types';
import { getPlatformIcon } from '~/utils/distribution-icons.utils';
import { formatDateTime, formatStatus } from '~/utils/distribution-ui.utils';

const { LABELS } = DISTRIBUTION_MANAGEMENT_UI;

export interface LatestSubmissionCardProps {
  submission: Submission;
  org: string;
  onPromote?: () => void;
  onUpdateRollout?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onHalt?: () => void;
  onCancel?: () => void;
  onResubmit?: () => void;
}

export function LatestSubmissionCard({
  submission,
  org,
  onPromote,
  onUpdateRollout,
  onPause,
  onResume,
  onHalt,
  onCancel,
  onResubmit,
}: LatestSubmissionCardProps) {
  const isAndroid = submission.platform === Platform.ANDROID;
  const isIOS = submission.platform === Platform.IOS;

  // Status checks
  const isPending = submission.status === SubmissionStatus.PENDING;
  const isInReview = submission.status === SubmissionStatus.IN_REVIEW;
  const isApproved = submission.status === SubmissionStatus.APPROVED;
  const isLive = submission.status === SubmissionStatus.LIVE;
  const isPaused = submission.status === SubmissionStatus.PAUSED;
  const isRejected = submission.status === SubmissionStatus.REJECTED;
  const isHalted = submission.status === SubmissionStatus.HALTED;
  const isCancelled = submission.status === SubmissionStatus.CANCELLED;

  // Rollout checks
  const rolloutPercentage = submission.rolloutPercentage;
  const isComplete = rolloutPercentage === ROLLOUT_COMPLETE_PERCENT;
  const isPartialRollout = isLive && !isComplete;

  // Platform-specific checks
  const phasedRelease = isIOS && 'phasedRelease' in submission ? submission.phasedRelease : false;
  
  // Action availability per submission lifecycle rules:
  // Submit: PENDING → IN_REVIEW (handled in SubmitToStoresForm)
  // Cancel: IN_REVIEW → CANCELLED
  // Resubmit: REJECTED or CANCELLED → new submission (IN_REVIEW)
  // Pause: LIVE → PAUSED (iOS only, phasedRelease=true)
  // Resume: PAUSED → LIVE (iOS only)
  // Halt: LIVE → HALTED (terminal state, ANDROID ONLY per backend team)
  //
  // ✅ iOS Behavior Matrix (see platform-rules.ts and LIVE_STATE_VERIFICATION.md):
  // ┌───────────────┬───────────┬──────────────┬────────────┐
  // │ phasedRelease │ Rollout % │ Can Update?  │ Can Pause? │
  // ├───────────────┼───────────┼──────────────┼────────────┤
  // │ true          │ 1-99%     │ ✅ Yes       │ ✅ Yes     │
  // │ true          │ 100%      │ ❌ No        │ ❌ No      │
  // │ false         │ 100%      │ ❌ No        │ ❌ No      │
  // │ false         │ <100%     │ ❌ INVALID   │ ❌ INVALID │
  // └───────────────┴───────────┴──────────────┴────────────┘
  //
  // Update Rollout:
  //   - Android: Can update to any percentage until 100%
  //   - iOS: Can ONLY update if phasedRelease=true AND not complete (to complete early to 100%)
  //          If phasedRelease=false, rollout is not controllable (immediate 100%)
  const canUpdateRollout = isLive && !isComplete && (
    isAndroid || (isIOS && phasedRelease)
  );
  const canPause = isIOS && isLive && !isComplete && phasedRelease && !isPaused; // Can't pause if already at 100%
  const canResume = isIOS && isPaused;
  const canHalt = isAndroid && isLive; // ANDROID ONLY: iOS does not support halt
  const canCancel = isInReview;
  const canResubmit = isRejected || isCancelled;

  return (
    <Card shadow="md" padding={DS_SPACING.XL} radius={DS_SPACING.BORDER_RADIUS} withBorder className="bg-gradient-to-br from-white to-gray-50">
      <Stack gap={DS_SPACING.LG}>
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Group gap={DS_SPACING.MD}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
              {getPlatformIcon(submission.platform, 24)}
            </div>
            <div>
              <Group gap={DS_SPACING.XS} mb={4} align="baseline">
                <Title order={3} className="text-gray-800">
                  {submission.version}
                </Title>
                {isAndroid && 'versionCode' in submission && (
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} className="font-mono" opacity={0.6}>
                    Version Code: {submission.versionCode}
                  </Text>
                )}
              </Group>
              <Badge
                size="lg"
                color={SUBMISSION_STATUS_COLORS[submission.status]}
                variant="filled"
                radius={DS_SPACING.BORDER_RADIUS}
              >
                {formatStatus(submission.status)}
              </Badge>
            </div>
          </Group>

          {/* Quick Actions */}
          <Group gap={DS_SPACING.XS}>
            {canUpdateRollout && onUpdateRollout && (
              <Tooltip label="Update Rollout">
                <ActionIcon
                  variant="light"
                  color={DS_COLORS.ACTION.PRIMARY}
                  size="lg"
                  radius={DS_SPACING.BORDER_RADIUS}
                  onClick={onUpdateRollout}
                >
                  <IconRocket size={18} />
                </ActionIcon>
              </Tooltip>
            )}
            {canPause && onPause && (
              <Tooltip label="Pause Rollout">
                <ActionIcon variant="light" color={DS_COLORS.STATUS.WARNING} size="lg" radius={DS_SPACING.BORDER_RADIUS} onClick={onPause}>
                  <IconPlayerPause size={18} />
                </ActionIcon>
              </Tooltip>
            )}
            {canResume && onResume && (
              <Tooltip label="Resume Rollout">
                <ActionIcon variant="light" color={DS_COLORS.STATUS.SUCCESS} size="lg" radius={DS_SPACING.BORDER_RADIUS} onClick={onResume}>
                  <IconPlayerPlay size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        <Divider />

        {/* Rollout Progress */}
        {(isLive || isPaused) && (
          <Paper p={DS_SPACING.MD} radius={DS_SPACING.BORDER_RADIUS} withBorder className="bg-gradient-to-br from-cyan-50 to-blue-50">
            <Stack gap={DS_SPACING.XS}>
              <Group justify="space-between">
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} c={DS_COLORS.TEXT.PRIMARY}>
                  {LABELS.ROLLOUT_PROGRESS}
                </Text>
                <Text size={DS_TYPOGRAPHY.SIZE.LG} fw={DS_TYPOGRAPHY.WEIGHT.BOLD} c={isComplete ? DS_COLORS.STATUS.SUCCESS : DS_COLORS.ACTION.PRIMARY}>
                  {rolloutPercentage}%
                </Text>
              </Group>
              <Progress
                value={rolloutPercentage}
                size="lg"
                radius={DS_SPACING.BORDER_RADIUS}
                color={isComplete ? DS_COLORS.STATUS.SUCCESS : DS_COLORS.ACTION.PRIMARY}
                striped={!isComplete}
                animated={!isComplete}
              />
              {phasedRelease && !isComplete && (
                <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} className="text-center mt-1">
                  {LABELS.IOS_PHASED_ROLLOUT_NOTE}
                </Text>
              )}
            </Stack>
          </Paper>
        )}

        {/* Submission Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Created At (always show) */}
          <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={4}>
              {LABELS.CREATED_AT}
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
              {formatDateTime(submission.createdAt)}
            </Text>
          </Paper>

          {/* Submitted At (only show if actually submitted) */}
          {submission.submittedAt && (
            <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={4}>
                {LABELS.SUBMITTED_AT}
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                {formatDateTime(submission.submittedAt)}
              </Text>
            </Paper>
          )}

          {/* Submitted By */}
          {submission.submittedBy && (
            <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={4}>
                {LABELS.SUBMITTED_BY}
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} className="truncate">
                {submission.submittedBy}
              </Text>
            </Paper>
          )}

          {/* Status Updated (only show for non-PENDING) */}
          {!isPending && (
            <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={4}>
                {LABELS.STATUS_UPDATED}
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                {formatDateTime(submission.statusUpdatedAt)}
              </Text>
            </Paper>
          )}

          {/* === Android-Specific Fields === */}
          {isAndroid && !isPending && (
            <>
              {/* Rollout Percentage */}
              <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
                <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={4}>
                  {LABELS.ROLLOUT_PROGRESS}
                </Text>
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                  {submission.rolloutPercentage}%
                </Text>
              </Paper>

              {/* In-App Update Priority */}
              {'inAppUpdatePriority' in submission && (
                <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={4}>
                    {LABELS.IN_APP_PRIORITY}
                  </Text>
                  <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                    {submission.inAppUpdatePriority} / 5
                  </Text>
                </Paper>
              )}
            </>
          )}

          {/* === iOS-Specific Fields === */}
          {isIOS && (
            <>
              {/* Rollout Percentage (show for LIVE/PAUSED statuses) */}
              {(isLive || isPaused) && (
                <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={4}>
                    {LABELS.ROLLOUT_PROGRESS}
                  </Text>
                  <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                    {submission.rolloutPercentage}%
                  </Text>
                </Paper>
              )}

              {/* Release Type (always "After Approval" - even for PENDING) */}
              {'releaseType' in submission && (
                <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={4}>
                    {LABELS.RELEASE_TYPE}
                  </Text>
                  <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                    {LABELS.IOS_RELEASE_TYPE_AFTER_APPROVAL}
                  </Text>
                </Paper>
              )}

              {/* Phased Release (only show after submission, when user has chosen) */}
              {!isPending && 'phasedRelease' in submission && submission.phasedRelease !== null && (
                <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={4}>
                    Phased Release
                  </Text>
                  <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                    {submission.phasedRelease ? 'Enabled' : 'Disabled'}
                  </Text>
                </Paper>
              )}

              {/* Reset Rating (only show after submission, when user has chosen) */}
              {!isPending && 'resetRating' in submission && submission.resetRating !== null && (
                <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={4}>
                    Reset Rating
                  </Text>
                  <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                    {submission.resetRating ? 'Enabled' : 'Disabled'}
                  </Text>
                </Paper>
              )}
            </>
          )}
        </div>

        {/* Artifacts */}
        {submission.artifact && (
          <>
            <Divider label={LABELS.BUILD_ARTIFACTS} labelPosition="center" />
            <Paper p={DS_SPACING.MD} radius={DS_SPACING.BORDER_RADIUS} withBorder className="bg-gray-50">
              <Stack gap={DS_SPACING.SM}>
                {isAndroid && 'artifactPath' in submission.artifact && (
                  <>
                    <Group justify="space-between">
                      <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                        {LABELS.AAB_FILE}
                      </Text>
                      <Button
                        component="a"
                        href={submission.artifact.artifactPath}
                        target="_blank"
                        variant="light"
                        size="xs"
                        leftSection={<IconDownload size={14} />}
                        radius={DS_SPACING.BORDER_RADIUS}
                      >
                        {LABELS.DOWNLOAD}
                      </Button>
                    </Group>
                    {submission.artifact.internalTrackLink && (
                      <Group justify="space-between">
                        <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                          {LABELS.INTERNAL_TRACK_LINK}
                        </Text>
                        <Button
                          component="a"
                          href={submission.artifact.internalTrackLink}
                          target="_blank"
                          variant="light"
                          size="xs"
                          rightSection={<IconExternalLink size={14} />}
                          radius={DS_SPACING.BORDER_RADIUS}
                        >
                          Open
                        </Button>
                      </Group>
                    )}
                  </>
                )}
                {isIOS && 'testflightNumber' in submission.artifact && (
                  <Group justify="space-between">
                    <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                      {LABELS.TESTFLIGHT_BUILD}
                    </Text>
                    <Badge size="lg" variant="light" color={DS_COLORS.PLATFORM.IOS} className="font-mono">
                      #{submission.artifact.testflightNumber}
                    </Badge>
                  </Group>
                )}
              </Stack>
            </Paper>
          </>
        )}

        {/* Release Notes */}
        {submission.releaseNotes && (
          <>
            <Divider label={LABELS.RELEASE_NOTES} labelPosition="center" />
            <Paper p={DS_SPACING.MD} radius={DS_SPACING.BORDER_RADIUS} withBorder className="bg-gray-50">
              <Text size={DS_TYPOGRAPHY.SIZE.SM} className="whitespace-pre-wrap">
                {submission.releaseNotes}
              </Text>
            </Paper>
          </>
        )}

        {/* Action Buttons */}
        <Divider />
        <Group justify="flex-end" gap={DS_SPACING.SM}>
          {isPending && onPromote && (
            <Button
              variant="filled"
              color={DS_COLORS.ACTION.PRIMARY}
              leftSection={<IconRocket size={16} />}
              onClick={onPromote}
              radius={DS_SPACING.BORDER_RADIUS}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.PROMOTE}
            </Button>
          )}

          {canCancel && onCancel && (
            <Button
              variant="light"
              color={DS_COLORS.STATUS.ERROR}
              leftSection={<IconX size={16} />}
              onClick={onCancel}
              radius={DS_SPACING.BORDER_RADIUS}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.CANCEL_SUBMISSION}
            </Button>
          )}

          {canResubmit && onResubmit && (
            <Button
              variant="filled"
              color={DS_COLORS.ACTION.PRIMARY}
              leftSection={<IconRefresh size={16} />}
              onClick={onResubmit}
              radius={DS_SPACING.BORDER_RADIUS}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.RESUBMIT}
            </Button>
          )}

          {canUpdateRollout && onUpdateRollout && (
            <Button
              variant="filled"
              color={DS_COLORS.ACTION.PRIMARY}
              leftSection={<IconRocket size={16} />}
              onClick={onUpdateRollout}
              radius={DS_SPACING.BORDER_RADIUS}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.UPDATE_ROLLOUT}
            </Button>
          )}

          {canPause && onPause && (
            <Button
              variant="light"
              color={DS_COLORS.STATUS.WARNING}
              leftSection={<IconPlayerPause size={16} />}
              onClick={onPause}
              radius={DS_SPACING.BORDER_RADIUS}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.PAUSE_ROLLOUT}
            </Button>
          )}

          {canResume && onResume && (
            <Button
              variant="filled"
              color={DS_COLORS.STATUS.SUCCESS}
              leftSection={<IconPlayerPlay size={16} />}
              onClick={onResume}
              radius={DS_SPACING.BORDER_RADIUS}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.RESUME_ROLLOUT}
            </Button>
          )}

          {canHalt && onHalt && (
            <Button
              variant="light"
              color={DS_COLORS.STATUS.ERROR}
              leftSection={<IconAlertTriangle size={16} />}
              onClick={onHalt}
              radius={DS_SPACING.BORDER_RADIUS}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.EMERGENCY_HALT}
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

