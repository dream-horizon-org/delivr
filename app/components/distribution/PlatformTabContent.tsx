/**
 * PlatformTabContent - Tab content for Android/iOS platform management
 * Extracted from dashboard.$org.distributions.$releaseId.tsx
 */

import { Button, Card, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import type { useFetcher } from '@remix-run/react';
import { IconBrandAndroid, IconBrandApple, IconRocket } from '@tabler/icons-react';
import { RejectedSubmissionView, RolloutControls } from '~/components/Distribution';
import { DS_COLORS, DS_SPACING, DS_TYPOGRAPHY } from '~/constants/distribution/distribution-design.constants';
import { PLATFORM_LABELS, ROLLOUT_COMPLETE_PERCENT } from '~/constants/distribution/distribution.constants';
import type { Submission } from '~/types/distribution/distribution.types';
import { Platform, SubmissionStatus } from '~/types/distribution/distribution.types';
import { SubmissionManagementCard } from './SubmissionManagementCard';

export type PlatformTabContentProps = {
  platform: Platform;
  submission: Submission | undefined;
  onOpenSubmitDialog: () => void;
  onOpenPauseDialog: (submission: Submission) => void;
  onOpenResumeDialog: (submission: Submission) => void;
  onOpenHaltDialog: (submission: Submission) => void;
  onOpenRetryDialog: (submission: Submission) => void;
  onOpenHistoryPanel: (submission: Submission) => void;
  fetcher: ReturnType<typeof useFetcher>;
};

export function PlatformTabContent({
  platform,
  submission,
  onOpenSubmitDialog,
  onOpenPauseDialog,
  onOpenResumeDialog,
  onOpenHaltDialog,
  onOpenRetryDialog,
  onOpenHistoryPanel,
  fetcher,
}: PlatformTabContentProps) {

  const storeName = platform === Platform.ANDROID ? 'Google Play Store' : 'Apple App Store';
  const isAndroid = platform === Platform.ANDROID;
  const showRolloutControls = submission && isAndroid && (
    submission.status === SubmissionStatus.APPROVED ||
    (submission.status === SubmissionStatus.LIVE && submission.rolloutPercentage < ROLLOUT_COMPLETE_PERCENT)
  );
  const showRejectedView = submission?.status === SubmissionStatus.REJECTED;

  // No submission yet
  if (!submission) {
    return (
      <Card shadow="sm" padding={DS_SPACING.XL} radius="md" withBorder>
        <Stack align="center" gap={DS_SPACING.MD} py={DS_SPACING.XL}>
          <ThemeIcon
            size={64}
            radius="xl"
            variant="light"
            color={isAndroid ? DS_COLORS.PLATFORM.ANDROID : DS_COLORS.PLATFORM.IOS}
          >
            {isAndroid ? (
              <IconBrandAndroid size={32} />
            ) : (
              <IconBrandApple size={32} />
            )}
          </ThemeIcon>
          <div style={{ textAlign: 'center' }}>
            <Text size="lg" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
              No submission yet for {PLATFORM_LABELS[platform]}
            </Text>
            <Text c={DS_COLORS.TEXT.MUTED}>Ready to submit this release to {storeName}</Text>
          </div>
          <Button
            leftSection={<IconRocket size={16} />}
            onClick={onOpenSubmitDialog}
            size="md"
            mt={DS_SPACING.MD}
          >
            Submit to {storeName}
          </Button>
        </Stack>
      </Card>
    );
  }

  // Has submission - show full management
  return (
    <Stack gap={DS_SPACING.LG}>
      {/* Submission Status Card */}
      <SubmissionManagementCard
        submission={submission}
        onPause={() => onOpenPauseDialog(submission)}
        onResume={() => onOpenResumeDialog(submission)}
        onHalt={() => onOpenHaltDialog(submission)}
        onRetry={() => onOpenRetryDialog(submission)}
        onViewHistory={() => onOpenHistoryPanel(submission)}
      />

      {/* Rollout Controls (if applicable) */}
      {showRolloutControls && (
        <Card shadow="sm" padding={DS_SPACING.LG} radius="md" withBorder>
          <Title order={4} mb={DS_SPACING.MD}>
            Rollout Controls
          </Title>
          <RolloutControls
            submissionId={submission.id}
            platform={submission.platform}
            phasedRelease={(submission.platform === Platform.IOS && 'phasedRelease' in submission) ? submission.phasedRelease ?? undefined : undefined}
            currentPercentage={submission.rolloutPercentage}
            status={submission.status}
            availableActions={[]}
            onUpdateRollout={(percentage: number) => {
              fetcher.submit(
                { 
                  intent: 'updateRollout', 
                  submissionId: submission.id, 
                  percentage: String(percentage),
                  platform: submission.platform
                },
                { method: 'post' }
              );
            }}
            onPause={() => onOpenPauseDialog(submission)}
            onHalt={() => onOpenHaltDialog(submission)}
            isLoading={false}
          />
        </Card>
      )}

      {/* 
        Rejected View
        
        KNOWN LIMITATION: Rejection fields not yet implemented by backend.
        Reference: docs/distribution/DISTRIBUTION_API_SPEC.md (Known Gap section)
        Currently using hardcoded fallback for rejectionReason.
      */}
      {showRejectedView && (
        <RejectedSubmissionView
          platform={submission.platform}
          submissionId={submission.id}
          versionName={submission.version}
          rejectionReason={'Submission was rejected by the store'}
          rejectionDetails={null}
          onFixMetadata={() => onOpenRetryDialog(submission)}
          onUploadNewBuild={() => onOpenRetryDialog(submission)}
        />
      )}
    </Stack>
  );
}

