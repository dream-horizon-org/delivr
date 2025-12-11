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

import { Anchor, Badge, Button, Card, Group, Loader, Progress, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBrandAndroid, IconBrandApple, IconCheck, IconClock, IconExternalLink, IconRefresh, IconUpload, IconX } from '@tabler/icons-react';
import { BUTTON_LABELS, PLATFORM_LABELS } from '~/constants/distribution.constants';
import { BuildStrategy, BuildUploadStatus, Platform, WorkflowStatus } from '~/types/distribution.types';
import type { BuildStatusCardProps } from './distribution.types';
import { deriveBuildState } from './distribution.utils';

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

function StatusIcon({ status }: { status: BuildUploadStatus | null }) {
  if (!status) {
    return <IconClock size={16} className="text-gray-400" />;
  }

  switch (status) {
    case BuildUploadStatus.UPLOADED:
      return <IconCheck size={16} className="text-green-500" />;
    case BuildUploadStatus.UPLOADING:
      return <IconClock size={16} className="text-blue-500" />;
    case BuildUploadStatus.FAILED:
      return <IconX size={16} className="text-red-500" />;
    case BuildUploadStatus.PENDING:
    default:
      return <IconClock size={16} className="text-gray-400" />;
  }
}

function CIJobStatus({ build }: { build: NonNullable<BuildStatusCardProps['build']> }) {
  const workflowStatus = build.workflowStatus;
  
  if (!workflowStatus) return null;
  
  const getStatusColor = (status: WorkflowStatus) => {
    switch (status) {
      case WorkflowStatus.COMPLETED: return 'green';
      case WorkflowStatus.RUNNING: return 'blue';
      case WorkflowStatus.QUEUED: return 'yellow';
      case WorkflowStatus.FAILED: return 'red';
      default: return 'gray';
    }
  };
  
  const getStatusIcon = (status: WorkflowStatus) => {
    switch (status) {
      case WorkflowStatus.COMPLETED: return <IconCheck size={12} />;
      case WorkflowStatus.RUNNING: return <Loader size={12} />;
      case WorkflowStatus.QUEUED: return <IconClock size={12} />;
      case WorkflowStatus.FAILED: return <IconX size={12} />;
      default: return null;
    }
  };
  
  return (
    <Group gap="xs">
      <Text size="sm" c="dimmed">CI Status:</Text>
      <Badge 
        size="sm" 
        variant="light" 
        color={getStatusColor(workflowStatus)}
        leftSection={getStatusIcon(workflowStatus)}
      >
        {workflowStatus}
      </Badge>
    </Group>
  );
}

function BuildDetails({ build, isAndroid }: { build: NonNullable<BuildStatusCardProps['build']>; isAndroid: boolean }) {
  const isCICD = build.buildStrategy === BuildStrategy.CICD;
  
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Text size="sm" c="dimmed">Version:</Text>
        <Text size="sm" fw={500}>{build.versionName}</Text>
        <Text size="xs" c="dimmed">({build.versionCode})</Text>
      </Group>
      
      {isCICD && build.ciRunType && (
        <Group gap="xs">
          <Text size="sm" c="dimmed">Built via:</Text>
          <Text size="sm">{build.ciRunType}</Text>
        </Group>
      )}
      
      {/* CI Job Status - only for CICD builds */}
      {isCICD && <CIJobStatus build={build} />}

      {isAndroid && build.internalTrackLink && (
        <Anchor
          href={build.internalTrackLink}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
        >
          <Group gap={4}>
            <IconExternalLink size={14} />
            Internal Testing Link
          </Group>
        </Anchor>
      )}

      {!isAndroid && build.testflightNumber && (
        <Group gap="xs">
          <Text size="sm" c="dimmed">TestFlight:</Text>
          <Text size="sm">Build #{build.testflightNumber}</Text>
        </Group>
      )}
    </Stack>
  );
}

function EmptyState({ 
  platform, 
  isManualMode, 
  onUpload, 
  onVerify,
}: { 
  platform: Platform;
  isManualMode: boolean;
  onUpload?: () => void;
  onVerify?: () => void;
}) {
  const isAndroid = platform === Platform.ANDROID;
  
  return (
    <Stack gap="md" align="center" py="md">
      <Text c="dimmed" size="sm" ta="center">
        {isManualMode 
          ? `No ${PLATFORM_LABELS[platform]} build uploaded yet.`
          : `Waiting for CI/CD to build ${PLATFORM_LABELS[platform]}...`
        }
      </Text>
      
      {isManualMode ? (
        <Button
          variant="light"
          leftSection={<IconUpload size={16} />}
          onClick={isAndroid ? onUpload : onVerify}
        >
          {isAndroid ? BUTTON_LABELS.UPLOAD : BUTTON_LABELS.VERIFY}
        </Button>
      ) : (
        // CICD mode: Builds are auto-triggered by Release Orchestrator
        // Frontend just tracks status - no trigger button needed
        <Badge color="blue" variant="light" size="lg">
          <Group gap={6}>
            <Loader size={12} />
            <Text size="sm">CI build will start automatically</Text>
          </Group>
        </Badge>
      )}
    </Stack>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BuildStatusCard(props: BuildStatusCardProps) {
  const { 
    platform, 
    build, 
    isLoading, 
    buildStrategy,
    onUploadRequested, 
    onVerifyRequested,
    ciRetryUrl,
    className,
  } = props;

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

  return (
    <Card 
      shadow="sm" 
      padding="lg" 
      radius="md" 
      withBorder 
      className={className}
      data-testid={`build-status-card-${platform.toLowerCase()}`}
    >
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <PlatformIcon platform={platform} />
          <div>
            <Text fw={600}>{PLATFORM_LABELS[platform]}</Text>
            <Text size="xs" c="dimmed">
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
        <Progress value={50} animated striped mb="md" />
      ) : hasBuild && build ? (
        <>
          <BuildDetails build={build} isAndroid={isAndroid} />
          
          {/* CI Job Running Progress */}
          {(isCIRunning || isCIQueued) && (
            <Stack gap="xs" mt="md">
              <Progress value={isCIRunning ? 50 : 10} animated striped />
              <Text size="xs" c="dimmed" ta="center">
                {isCIQueued ? 'Build queued, waiting to start...' : 'Build in progress...'}
              </Text>
            </Stack>
          )}
          
          {/* Upload Progress (if uploading) */}
          {isUploading && (
            <Progress value={75} animated striped mt="md" />
          )}

          {/* Action Buttons */}
          <Group mt="md" gap="sm">
            {isUploaded && (
              <Badge color="green" variant="filled" size="sm">
                Ready for Distribution
              </Badge>
            )}

            {/* Manual mode: Retry upload/verify */}
            {isFailed && isManualMode && (
              <Button
                variant="light"
                color="red"
                size="xs"
                leftSection={<IconUpload size={14} />}
                onClick={isAndroid ? onUploadRequested : onVerifyRequested}
              >
                Retry {isAndroid ? 'Upload' : 'Verification'}
              </Button>
            )}
            
            {/* CICD mode: Link to CI system to retry (we don't retry, CI system does) */}
            {isCIFailed && isCICD && ciRunUrl && (
              <Anchor
                href={ciRunUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="light"
                  color="red"
                  size="xs"
                  leftSection={<IconRefresh size={14} />}
                >
                  Retry in CI System
                </Button>
              </Anchor>
            )}
          </Group>
        </>
      ) : (
        <EmptyState 
          platform={platform}
          isManualMode={isManualMode}
          onUpload={onUploadRequested}
          onVerify={onVerifyRequested}
        />
      )}
    </Card>
  );
}

