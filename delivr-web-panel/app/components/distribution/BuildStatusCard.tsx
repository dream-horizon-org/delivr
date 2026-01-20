/**
 * BuildStatusCard - Shows build status for Android or iOS
 * 
 * Features:
 * - Displays build version and status
 * - CICD Mode: Trigger build, track CI job status, retry on failure
 * - Manual Mode: Upload AAB (Android) or verify TestFlight (iOS)
 * - Links to Internal Testing (Android) or TestFlight (iOS)
 * - Per-platform status (Android can succeed while iOS fails)
 */

import { Anchor, Badge, Button, Card, Group, Progress, Stack, Text } from '@mantine/core';
import { IconExternalLink, IconRefresh, IconUpload } from '@tabler/icons-react';
import { useCallback } from 'react';
import { DISTRIBUTION_UI_LABELS, PLATFORM_LABELS } from '~/constants/distribution/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import { BuildStrategy, WorkflowStatus } from '~/types/distribution/distribution.types';
import { BuildDetails } from './BuildDetails';
import { BuildEmptyState } from './BuildEmptyState';
import type { BuildStatusCardProps } from '~/types/distribution/distribution-component.types';
import { deriveBuildState } from '~/utils/distribution';
import { PlatformIcon } from './PlatformIcon';
import { StatusIcon } from './StatusIcon';

export function BuildStatusCard({ 
  platform, 
  build, 
  isLoading, 
  buildStrategy,
  onUploadRequested, 
  onVerifyRequested,
  onRetryBuild,
  ciRetryUrl,
  className,
}: BuildStatusCardProps) {

  const {
    hasBuild,
    isUploaded,
    isUploading,
    isFailed,
    isManualMode,
    isAndroid,
    statusLabel,
    statusColor,
  } = deriveBuildState(build, platform, buildStrategy);

  // CICD-specific state
  // Note: CICD builds are auto-triggered by Release Orchestrator
  // If CI fails, user retries via their CI system (we just show a link)
  const isCICD = buildStrategy === BuildStrategy.CICD;
  const isCIRunning = build?.workflowStatus === WorkflowStatus.RUNNING;
  const isCIQueued = build?.workflowStatus === WorkflowStatus.QUEUED;
  const isCIFailed = build?.workflowStatus === WorkflowStatus.FAILED;
  
  // Get CI run URL for retry (user clicks to retry in their CI system)
  const ciRunUrl = ciRetryUrl || build?.ciRunUrl;

  const handleRetryBuild = useCallback(() => {
    if (build?.id && onRetryBuild) {
      onRetryBuild(build.id);
    }
  }, [build?.id, onRetryBuild]);

  // Visibility flags for conditional rendering
  const showCIProgress = isCIRunning || isCIQueued;
  const showUploadProgress = isUploading;
  const showReadyBadge = isUploaded;
  const showManualRetry = isFailed && isManualMode;
  const showCICDRetry = isCIFailed && isCICD && !!build && !!onRetryBuild;
  const showCIRunLink = !!ciRunUrl;

  return (
    <Card 
      shadow="sm" 
      padding="lg" 
      radius={DS_SPACING.BORDER_RADIUS} 
      withBorder 
      className={className}
      data-testid={`build-status-card-${platform.toLowerCase()}`}
    >
      {/* Header */}
      <Group justify="space-between" mb={DS_SPACING.MD}>
        <Group gap={DS_SPACING.SM}>
          <PlatformIcon platform={platform} />
          <div>
            <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>{PLATFORM_LABELS[platform]}</Text>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
              {isManualMode ? 'Manual Upload' : 'CI/CD Build'}
            </Text>
          </div>
        </Group>
        
        <Badge 
          color={statusColor} 
          variant="light"
          leftSection={<StatusIcon status={build?.buildUploadStatus ?? null} />}
        >
          {statusLabel}
        </Badge>
      </Group>

      {/* Content */}
      {isLoading ? (
        <Progress value={50} animated striped mb={DS_SPACING.MD} />
      ) : hasBuild && build ? (
        <>
          <BuildDetails build={build} isAndroid={isAndroid} />
          
          {/* CI Job Running Progress */}
          {showCIProgress && (
            <Stack gap={DS_SPACING.XS} mt={DS_SPACING.MD}>
              <Progress value={isCIRunning ? 50 : 10} animated striped />
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} ta="center">
                {isCIQueued ? DISTRIBUTION_UI_LABELS.BUILD_QUEUED : DISTRIBUTION_UI_LABELS.BUILD_IN_PROGRESS}
              </Text>
            </Stack>
          )}
          
          {/* Upload Progress (if uploading) */}
          {showUploadProgress && (
            <Progress value={75} animated striped mt={DS_SPACING.MD} />
          )}

          {/* Action Buttons */}
          <Group mt={DS_SPACING.MD} gap={DS_SPACING.SM}>
            {showReadyBadge && (
              <Badge color={DS_COLORS.STATUS.SUCCESS} variant="filled" size={DS_TYPOGRAPHY.SIZE.SM}>
                {DISTRIBUTION_UI_LABELS.READY_FOR_DISTRIBUTION}
              </Badge>
            )}

            {/* Manual mode: Retry upload/verify */}
            {showManualRetry && (
              <Button
                variant="light"
                color={DS_COLORS.STATUS.ERROR}
                size={DS_TYPOGRAPHY.SIZE.XS}
                leftSection={<IconUpload size={14} />}
                onClick={isAndroid ? onUploadRequested : onVerifyRequested}
              >
                Retry {isAndroid ? 'Upload' : 'Verification'}
              </Button>
            )}
            
            {/* CICD mode: Retry build via API (triggers CI/CD workflow) */}
            {showCICDRetry && (
              <Button
                variant="light"
                color={DS_COLORS.STATUS.ERROR}
                size={DS_TYPOGRAPHY.SIZE.XS}
                leftSection={<IconRefresh size={14} />}
                onClick={handleRetryBuild}
                loading={isLoading}
              >
                {DISTRIBUTION_UI_LABELS.RETRY_BUILD}
              </Button>
            )}
            
            {/* Link to view CI run */}
            {showCIRunLink && (
              <Anchor
                href={ciRunUrl}
                target="_blank"
                rel="noopener noreferrer"
                size={DS_TYPOGRAPHY.SIZE.XS}
              >
                <Group gap={DS_SPACING.XS}>
                  <IconExternalLink size={12} />
                  {DISTRIBUTION_UI_LABELS.VIEW_CI_JOB}
                </Group>
              </Anchor>
            )}
          </Group>
        </>
      ) : (
        <BuildEmptyState 
          platform={platform}
          isManualMode={isManualMode}
          onUpload={onUploadRequested}
          onVerify={onVerifyRequested}
        />
      )}
    </Card>
  );
}

