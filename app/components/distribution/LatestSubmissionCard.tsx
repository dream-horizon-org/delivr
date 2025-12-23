/**
 * Latest Submission Card - Active submission display with full management controls
 * Used in distribution detail page for the current active submission
 */

import {
  ActionIcon,
  Alert,
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
  IconDownload,
  IconExternalLink,
  IconInfoCircle,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconRocket,
  IconX
} from '@tabler/icons-react';
import {
  API_ROUTES
} from '~/constants/distribution/distribution-api.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import {
  DIALOG_UI,
  DISTRIBUTION_MANAGEMENT_UI,
  ROLLOUT_COMPLETE_PERCENT,
  SUBMISSION_STATUS_COLORS
} from '~/constants/distribution/distribution.constants';
import { Platform, type Submission, SubmissionStatus } from '~/types/distribution/distribution.types';
import { getPlatformIcon } from '~/utils/distribution/distribution-icons.utils';
import {
  canCancelSubmission,
  canPauseSubmission,
  canResubmitSubmission as canResubmitUtil,
  canResumeSubmission,
  canUpdateRollout as canUpdateRolloutUtil
} from '~/utils/distribution/distribution-state.utils';
import { formatDateTime, formatStatus } from '~/utils/distribution/distribution-ui.utils';

const { LABELS } = DISTRIBUTION_MANAGEMENT_UI;

export interface LatestSubmissionCardProps {
  submission: Submission;
  tenantId: string;
  onPromote?: () => void;
  onUpdateRollout?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onResubmit?: () => void;
  // Note: No onHalt - use onPause instead (Android→HALTED, iOS→PAUSED)
}

export function LatestSubmissionCard({
  submission,
  tenantId,
  onPromote,
  onUpdateRollout,
  onPause,
  onResume,
  onCancel,
  onResubmit,
}: LatestSubmissionCardProps) {
  const isAndroid = submission.platform === Platform.ANDROID;
  const isIOS = submission.platform === Platform.IOS;

  // Status checks (Only statuses actually used in this component)
  const isPending = submission.status === SubmissionStatus.PENDING;
  const isInProgress = submission.status === SubmissionStatus.IN_PROGRESS;
  const isCompleted = submission.status === SubmissionStatus.COMPLETED;
  const isHalted = submission.status === SubmissionStatus.HALTED; // Android paused state
  const isLive = submission.status === SubmissionStatus.LIVE;
  const isPaused = submission.status === SubmissionStatus.PAUSED; // iOS paused state

  // Rollout checks
  const rolloutPercentage = submission.rolloutPercentage;
  const isComplete = 
    isCompleted ||  // Android: COMPLETED status
    rolloutPercentage === ROLLOUT_COMPLETE_PERCENT;

  // Platform-specific checks
  const phasedRelease = isIOS && 'phasedRelease' in submission ? submission.phasedRelease : false;
  
  // Derive action availability using utility functions (clean, testable logic)
  let canUpdateRollout = canUpdateRolloutUtil(submission.status, submission.platform);
  let canPause = canPauseSubmission(submission.status, submission.platform);
  const canResume = canResumeSubmission(submission.status, submission.platform);
  const canCancel = canCancelSubmission(submission.status, submission.platform);
  const canResubmit = canResubmitUtil(submission.status);
  
  // Frontend safeguards: iOS Manual Release (phasedRelease=false) has NO rollout controls
  if (isIOS && phasedRelease === false) {
    canUpdateRollout = false;
    canPause = false;
  }
  
  // Frontend safeguards: Cannot pause or update at 100% (already complete)
  if (isComplete) {
    canUpdateRollout = false;
    canPause = false;
  }
  
  // Note: HALT = PAUSE for Android (no separate halt functionality)

  // UI Display Logic (No Logic in JSX Rule - extract complex expressions)
  const showPausedWarning = isPaused || isHalted;
  const showRolloutProgress = isInProgress || isCompleted || isHalted || isLive || isPaused;
  const showPhasedRolloutNote = phasedRelease && !isComplete;
  const showStatusUpdated = !isPending;
  const showAndroidRolloutDetails = isAndroid && !isPending;
  const showIOSRolloutPercentage = isIOS && (isLive || isPaused);
  const showIOSPhasedRelease = isIOS && !isPending && 'phasedRelease' in submission && submission.phasedRelease !== null;
  const showIOSResetRating = isIOS && !isPending && 'resetRating' in submission && submission.resetRating !== null;
  
  // Styling Logic (extract ternary expressions)
  const rolloutProgressColor = isComplete ? DS_COLORS.STATUS.SUCCESS : DS_COLORS.ACTION.PRIMARY;
  const progressBarAnimated = !isComplete && !isHalted && !isPaused;

  // Artifact download handler - uses centralized API route builder
  const handleDownloadArtifact = async () => {
    try {
      const apiUrl = API_ROUTES.getArtifactDownloadUrl(submission.id, submission.platform, tenantId);
      const response = await fetch(apiUrl);
      
      if (!response.ok) throw new Error('Failed to get download URL');
      
      const data = await response.json();
      if (data.success && data.data.presignedUrl) {
        window.open(data.data.presignedUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to download artifact:', error);
      alert('Failed to download artifact. Please try again.');
    }
  };

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
              <Group gap={DS_SPACING.XS} mb={DS_SPACING.XS} align="baseline">
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

        {/* Paused State Warning (Both Platforms) */}
        {showPausedWarning && (
          <Alert color={DS_COLORS.STATUS.WARNING} variant="light" icon={<IconInfoCircle size={16} />}>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} mb={DS_SPACING.XS}>
              {isAndroid && 'Android rollout paused. Users at current percentage.'}
              {isIOS && DIALOG_UI.PAUSE.IOS_WARNING_LINE1}
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
              {isAndroid && 'Click Resume to continue rollout.'}
              {isIOS && DIALOG_UI.PAUSE.IOS_WARNING_LINE2}
            </Text>
          </Alert>
        )}

        {/* Rollout Progress */}
        {showRolloutProgress && (
          <Paper p={DS_SPACING.MD} radius={DS_SPACING.BORDER_RADIUS} withBorder className="bg-gradient-to-br from-cyan-50 to-blue-50">
            <Stack gap={DS_SPACING.XS}>
              <Group justify="space-between">
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
                  {LABELS.ROLLOUT_PROGRESS}
                </Text>
                <Text size={DS_TYPOGRAPHY.SIZE.LG} fw={DS_TYPOGRAPHY.WEIGHT.BOLD} c={rolloutProgressColor}>
                  {rolloutPercentage}%
                </Text>
              </Group>
              <Progress
                value={rolloutPercentage}
                size="lg"
                radius={DS_SPACING.BORDER_RADIUS}
                color={rolloutProgressColor}
                striped={!isComplete}
                animated={progressBarAnimated}
              />
              {showPhasedRolloutNote && (
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
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
              {LABELS.CREATED_AT}
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
              {formatDateTime(submission.createdAt)}
            </Text>
          </Paper>

          {/* Submitted At (only show if actually submitted) */}
          {submission.submittedAt && (
            <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
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
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
                {LABELS.SUBMITTED_BY}
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} className="truncate">
                {submission.submittedBy}
              </Text>
            </Paper>
          )}

          {/* Status Updated (only show for non-PENDING) */}
          {showStatusUpdated && (
            <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
                {LABELS.STATUS_UPDATED}
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                {formatDateTime(submission.statusUpdatedAt)}
              </Text>
            </Paper>
          )}

          {/* === Android-Specific Fields === */}
          {showAndroidRolloutDetails && (
            <>
              {/* Rollout Percentage */}
              <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
                <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
                  {LABELS.ROLLOUT_PROGRESS}
                </Text>
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                  {submission.rolloutPercentage}%
                </Text>
              </Paper>

              {/* In-App Update Priority */}
              {'inAppUpdatePriority' in submission && (
                <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
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
              {showIOSRolloutPercentage && (
                <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
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
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
                    {LABELS.RELEASE_TYPE}
                  </Text>
                  <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                    {LABELS.IOS_RELEASE_TYPE_AFTER_APPROVAL}
                  </Text>
                </Paper>
              )}

              {/* Phased Release (only show after submission, when user has chosen) */}
              {showIOSPhasedRelease && (
                <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
                    Phased Release
                  </Text>
                  <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                    {submission.phasedRelease ? 'Enabled' : 'Disabled'}
                  </Text>
                </Paper>
              )}

              {/* Reset Rating (only show after submission, when user has chosen) */}
              {showIOSResetRating && (
                <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} withBorder>
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
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
                        onClick={handleDownloadArtifact}
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
        </Group>
      </Stack>
    </Card>
  );
}

