/**
 * PlatformTabContent - Tab content for Android/iOS platform management
 * Extracted from dashboard.$org.distributions.$releaseId.tsx
 */

import { Button, Card, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import type { useFetcher } from '@remix-run/react';
import { IconBrandAndroid, IconBrandApple, IconRocket } from '@tabler/icons-react';
import { useCallback } from 'react';
import { RejectedSubmissionView, RolloutControls } from '~/components/Distribution';
import { DS_COLORS, DS_SPACING, DS_TYPOGRAPHY } from '~/constants/distribution/distribution-design.constants';
import { PLATFORM_LABELS } from '~/constants/distribution/distribution.constants';
import type { Submission } from '~/types/distribution/distribution.types';
import { Platform } from '~/types/distribution/distribution.types';
import { shouldShowRejectedView, shouldShowRolloutControls } from '~/utils/distribution/distribution-state.utils';
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
  
  // Derive UI state using utility functions (clean, testable logic)
  const showRolloutControls = submission ? shouldShowRolloutControls(submission.status, submission.platform, submission.rolloutPercentage) : false;
  const showRejectedView = submission ? shouldShowRejectedView(submission.status) : false;

  // Extract phasedRelease prop (iOS only, convert null to omitted prop)
  const rolloutControlsProps = submission && submission.platform === Platform.IOS && 'phasedRelease' in submission && submission.phasedRelease !== null
    ? { phasedRelease: submission.phasedRelease }
    : {};

  // Memoized callbacks (avoid inline functions in JSX)
  const handlePause = useCallback(() => {
    if (submission) onOpenPauseDialog(submission);
  }, [submission, onOpenPauseDialog]);

  const handleResume = useCallback(() => {
    if (submission) onOpenResumeDialog(submission);
  }, [submission, onOpenResumeDialog]);

  const handleHalt = useCallback(() => {
    if (submission) onOpenHaltDialog(submission);
  }, [submission, onOpenHaltDialog]);

  const handleRetry = useCallback(() => {
    if (submission) onOpenRetryDialog(submission);
  }, [submission, onOpenRetryDialog]);

  const handleViewHistory = useCallback(() => {
    if (submission) onOpenHistoryPanel(submission);
  }, [submission, onOpenHistoryPanel]);

  const handleUpdateRollout = useCallback((percentage: number) => {
    if (!submission) return;
    
    fetcher.submit(
      { 
        intent: 'updateRollout', 
        submissionId: submission.id, 
        percentage: String(percentage),
        platform: submission.platform
      },
      { method: 'post' }
    );
  }, [submission, fetcher]);

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
        onPause={handlePause}
        onResume={handleResume}
        onHalt={handleHalt}
        onRetry={handleRetry}
        onViewHistory={handleViewHistory}
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
            {...rolloutControlsProps}
            currentPercentage={submission.rolloutPercentage}
            status={submission.status}
            availableActions={[]}
            onUpdateRollout={handleUpdateRollout}
            onPause={handlePause}
            onHalt={handleHalt}
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
          onFixMetadata={handleRetry}
          onUploadNewBuild={handleRetry}
        />
      )}
    </Stack>
  );
}

