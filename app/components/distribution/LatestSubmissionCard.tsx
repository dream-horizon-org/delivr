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
    <Card shadow="md" padding="xl" radius="md" withBorder className="bg-gradient-to-br from-white to-gray-50">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Group gap="md">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
              {getPlatformIcon(submission.platform, 24)}
            </div>
            <div>
              <Group gap="xs" mb={4} align="baseline">
                <Title order={3} className="text-gray-800">
                  {submission.version}
                </Title>
                {isAndroid && 'versionCode' in submission && (
                  <Text size="xs" c="dimmed" className="font-mono" opacity={0.6}>
                    Version Code: {submission.versionCode}
                  </Text>
                )}
              </Group>
              <Badge
                size="lg"
                color={SUBMISSION_STATUS_COLORS[submission.status]}
                variant="filled"
                radius="sm"
              >
                {formatStatus(submission.status)}
              </Badge>
            </div>
          </Group>

          {/* Quick Actions */}
          <Group gap="xs">
            {canUpdateRollout && onUpdateRollout && (
              <Tooltip label="Update Rollout">
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="lg"
                  radius="md"
                  onClick={onUpdateRollout}
                >
                  <IconRocket size={18} />
                </ActionIcon>
              </Tooltip>
            )}
            {canPause && onPause && (
              <Tooltip label="Pause Rollout">
                <ActionIcon variant="light" color="orange" size="lg" radius="md" onClick={onPause}>
                  <IconPlayerPause size={18} />
                </ActionIcon>
              </Tooltip>
            )}
            {canResume && onResume && (
              <Tooltip label="Resume Rollout">
                <ActionIcon variant="light" color="green" size="lg" radius="md" onClick={onResume}>
                  <IconPlayerPlay size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        <Divider />

        {/* Rollout Progress */}
        {(isLive || isPaused) && (
          <Paper p="md" radius="md" withBorder className="bg-gradient-to-br from-cyan-50 to-blue-50">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={600} c="dark">
                  {LABELS.ROLLOUT_PROGRESS}
                </Text>
                <Text size="lg" fw={700} c={isComplete ? 'teal' : 'cyan'}>
                  {rolloutPercentage}%
                </Text>
              </Group>
              <Progress
                value={rolloutPercentage}
                size="lg"
                radius="xl"
                color={isComplete ? 'teal' : 'cyan'}
                striped={!isComplete}
                animated={!isComplete}
              />
              {phasedRelease && !isComplete && (
                <Text size="xs" c="dimmed" className="text-center mt-1">
                  {LABELS.IOS_PHASED_ROLLOUT_NOTE}
                </Text>
              )}
            </Stack>
          </Paper>
        )}

        {/* Submission Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Created At (always show) */}
          <Paper p="sm" radius="md" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
              {LABELS.CREATED_AT}
            </Text>
            <Text size="sm" fw={500}>
              {formatDateTime(submission.createdAt)}
            </Text>
          </Paper>

          {/* Submitted At (only show if actually submitted) */}
          {submission.submittedAt && (
            <Paper p="sm" radius="md" withBorder>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                {LABELS.SUBMITTED_AT}
              </Text>
              <Text size="sm" fw={500}>
                {formatDateTime(submission.submittedAt)}
              </Text>
            </Paper>
          )}

          {/* Submitted By */}
          {submission.submittedBy && (
            <Paper p="sm" radius="md" withBorder>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                {LABELS.SUBMITTED_BY}
              </Text>
              <Text size="sm" fw={500} className="truncate">
                {submission.submittedBy}
              </Text>
            </Paper>
          )}

          {/* Status Updated (only show for non-PENDING) */}
          {!isPending && (
            <Paper p="sm" radius="md" withBorder>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                {LABELS.STATUS_UPDATED}
              </Text>
              <Text size="sm" fw={500}>
                {formatDateTime(submission.statusUpdatedAt)}
              </Text>
            </Paper>
          )}

          {/* === Android-Specific Fields === */}
          {isAndroid && !isPending && (
            <>
              {/* Rollout Percentage */}
              <Paper p="sm" radius="md" withBorder>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                  {LABELS.ROLLOUT_PROGRESS}
                </Text>
                <Text size="sm" fw={500}>
                  {submission.rolloutPercentage}%
                </Text>
              </Paper>

              {/* In-App Update Priority */}
              {'inAppUpdatePriority' in submission && (
                <Paper p="sm" radius="md" withBorder>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                    {LABELS.IN_APP_PRIORITY}
                  </Text>
                  <Text size="sm" fw={500}>
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
                <Paper p="sm" radius="md" withBorder>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                    {LABELS.ROLLOUT_PROGRESS}
                  </Text>
                  <Text size="sm" fw={500}>
                    {submission.rolloutPercentage}%
                  </Text>
                </Paper>
              )}

              {/* Release Type (always "After Approval" - even for PENDING) */}
              {'releaseType' in submission && (
                <Paper p="sm" radius="md" withBorder>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                    {LABELS.RELEASE_TYPE}
                  </Text>
                  <Text size="sm" fw={500}>
                    {LABELS.IOS_RELEASE_TYPE_AFTER_APPROVAL}
                  </Text>
                </Paper>
              )}

              {/* Phased Release (only show after submission, when user has chosen) */}
              {!isPending && 'phasedRelease' in submission && submission.phasedRelease !== null && (
                <Paper p="sm" radius="md" withBorder>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                    Phased Release
                  </Text>
                  <Text size="sm" fw={500}>
                    {submission.phasedRelease ? 'Enabled' : 'Disabled'}
                  </Text>
                </Paper>
              )}

              {/* Reset Rating (only show after submission, when user has chosen) */}
              {!isPending && 'resetRating' in submission && submission.resetRating !== null && (
                <Paper p="sm" radius="md" withBorder>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                    Reset Rating
                  </Text>
                  <Text size="sm" fw={500}>
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
            <Paper p="md" radius="md" withBorder className="bg-gray-50">
              <Stack gap="sm">
                {isAndroid && 'artifactPath' in submission.artifact && (
                  <>
                    <Group justify="space-between">
                      <Text size="sm" fw={500}>
                        {LABELS.AAB_FILE}
                      </Text>
                      <Button
                        component="a"
                        href={submission.artifact.artifactPath}
                        target="_blank"
                        variant="light"
                        size="xs"
                        leftSection={<IconDownload size={14} />}
                      >
                        {LABELS.DOWNLOAD}
                      </Button>
                    </Group>
                    {submission.artifact.internalTrackLink && (
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>
                          {LABELS.INTERNAL_TRACK_LINK}
                        </Text>
                        <Button
                          component="a"
                          href={submission.artifact.internalTrackLink}
                          target="_blank"
                          variant="light"
                          size="xs"
                          rightSection={<IconExternalLink size={14} />}
                        >
                          Open
                        </Button>
                      </Group>
                    )}
                  </>
                )}
                {isIOS && 'testflightNumber' in submission.artifact && (
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      {LABELS.TESTFLIGHT_BUILD}
                    </Text>
                    <Badge size="lg" variant="light" color="blue" className="font-mono">
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
            <Paper p="md" radius="md" withBorder className="bg-gray-50">
              <Text size="sm" className="whitespace-pre-wrap">
                {submission.releaseNotes}
              </Text>
            </Paper>
          </>
        )}

        {/* Action Buttons */}
        <Divider />
        <Group justify="flex-end" gap="sm">
          {isPending && onPromote && (
            <Button
              variant="filled"
              color="cyan"
              leftSection={<IconRocket size={16} />}
              onClick={onPromote}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.PROMOTE}
            </Button>
          )}

          {canCancel && onCancel && (
            <Button
              variant="light"
              color="red"
              leftSection={<IconX size={16} />}
              onClick={onCancel}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.CANCEL_SUBMISSION}
            </Button>
          )}

          {canResubmit && onResubmit && (
            <Button
              variant="filled"
              color="blue"
              leftSection={<IconRefresh size={16} />}
              onClick={onResubmit}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.RESUBMIT}
            </Button>
          )}

          {canUpdateRollout && onUpdateRollout && (
            <Button
              variant="filled"
              color="blue"
              leftSection={<IconRocket size={16} />}
              onClick={onUpdateRollout}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.UPDATE_ROLLOUT}
            </Button>
          )}

          {canPause && onPause && (
            <Button
              variant="light"
              color="orange"
              leftSection={<IconPlayerPause size={16} />}
              onClick={onPause}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.PAUSE_ROLLOUT}
            </Button>
          )}

          {canResume && onResume && (
            <Button
              variant="filled"
              color="green"
              leftSection={<IconPlayerPlay size={16} />}
              onClick={onResume}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.RESUME_ROLLOUT}
            </Button>
          )}

          {canHalt && onHalt && (
            <Button
              variant="light"
              color="red"
              leftSection={<IconAlertTriangle size={16} />}
              onClick={onHalt}
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.EMERGENCY_HALT}
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

