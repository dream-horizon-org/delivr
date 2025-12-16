/**
 * PlatformTabContent - Tab content for Android/iOS platform management
 * Extracted from dashboard.$org.distributions.$releaseId.tsx
 */

import { Button, Card, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import type { useFetcher } from '@remix-run/react';
import { IconBrandAndroid, IconBrandApple, IconRocket } from '@tabler/icons-react';
import { RejectedSubmissionView, RolloutControls } from '~/components/distribution';
import { PLATFORM_LABELS, ROLLOUT_COMPLETE_PERCENT } from '~/constants/distribution.constants';
import type { AvailableAction, RolloutAction, Submission } from '~/types/distribution.types';
import { Platform, SubmissionAction, SubmissionStatus } from '~/types/distribution.types';
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

export function PlatformTabContent(props: PlatformTabContentProps) {
  const {
    platform,
    submission,
    onOpenSubmitDialog,
    onOpenPauseDialog,
    onOpenResumeDialog,
    onOpenHaltDialog,
    onOpenRetryDialog,
    onOpenHistoryPanel,
    fetcher,
  } = props;

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
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Stack align="center" gap="md" py="xl">
          <ThemeIcon
            size={64}
            radius="xl"
            variant="light"
            color={isAndroid ? 'green' : 'blue'}
          >
            {isAndroid ? (
              <IconBrandAndroid size={32} />
            ) : (
              <IconBrandApple size={32} />
            )}
          </ThemeIcon>
          <div style={{ textAlign: 'center' }}>
            <Text size="lg" fw={600} mb="xs">
              No submission yet for {PLATFORM_LABELS[platform]}
            </Text>
            <Text c="dimmed">Ready to submit this release to {storeName}</Text>
          </div>
          <Button
            leftSection={<IconRocket size={16} />}
            onClick={onOpenSubmitDialog}
            size="md"
            mt="md"
          >
            Submit to {storeName}
          </Button>
        </Stack>
      </Card>
    );
  }

  // Has submission - show full management
  return (
    <Stack gap="lg">
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
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">
            Rollout Controls
          </Title>
          <RolloutControls
            submissionId={submission.id}
            platform={submission.platform}
            phasedRelease={(submission.platform === Platform.IOS && 'phasedRelease' in submission) ? submission.phasedRelease : undefined}
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

      {/* Rejected View */}
      {showRejectedView && (
        <RejectedSubmissionView
          platform={submission.platform}
          submissionId={submission.id}
          versionName={submission.version}
          {/* 
            TODO: Replace with real data once backend implements rejection fields
            Backend team notified - see docs/distribution/BACKEND_API_DATA_GAPS.md
            Using hardcoded fallback until backend adds:
            - submission.rejectionReason
            - submission.rejectionDetails
          */}
          rejectionReason={'Submission was rejected by the store'}
          rejectionDetails={null}
          onFixMetadata={() => onOpenRetryDialog(submission)}
          onUploadNewBuild={() => onOpenRetryDialog(submission)}
        />
      )}
    </Stack>
  );
}

