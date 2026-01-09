/**
 * ConsumedBuildsDisplay Component
 * Displays consumed builds from task.builds (read-only)
 * Handles both manual and CI/CD consumed builds
 * Shows CI/CD job links, download links, TestFlight links, etc.
 */

import { useMemo, useState } from 'react';
import {
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconBrandApple,
  IconDownload,
  IconExternalLink,
  IconX,
  IconClock,
  IconCopy,
  IconCheck,
} from '@tabler/icons-react';
import type { BuildInfo, BuildTaskOutput } from '~/types/release-process.types';
import { Platform, TaskStatus, WorkflowStatus, BuildUploadStatus, BuildType } from '~/types/release-process-enums';
import { useDownloadBuildArtifact } from '~/hooks/useReleaseProcess';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { BUILD_DISPLAY_LABELS } from '~/constants/release-process-ui';
import { BUILD_DOWNLOAD_MESSAGES, BUILD_COPY_MESSAGES } from '~/constants/toast-messages';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface ConsumedBuildsDisplayProps {
  builds: BuildInfo[]; // From task.builds (consumed builds)
  taskStatus: TaskStatus;
  isPostRegression: boolean;
  isKickoffRegression: boolean;
  buildOutput?: BuildTaskOutput | null; // For CI/CD job URLs
  expectedPlatforms?: Platform[]; // For CI/CD mode (show all platforms even if no builds)
}

interface BuildDisplayItemProps {
  build: BuildInfo;
  taskStatus: TaskStatus;
  isPostRegression: boolean;
  isKickoffRegression: boolean;
  getTestFlightLink: (testflightNumber: string | null) => string | null;
  jobUrl?: string; // CI/CD job URL for this platform
}

interface PlatformStatusItemProps {
  platform: Platform;
  taskStatus?: TaskStatus;
  isPostRegression: boolean;
  isKickoffRegression: boolean;
  getTestFlightLink: (testflightNumber: string | null) => string | null;
  jobUrl?: string; // CI/CD job URL for this platform
}

function getTestFlightLink(testflightNumber: string | null): string | null {
  if (!testflightNumber) return null;
  return `https://appstoreconnect.apple.com/testflight/builds/${testflightNumber}`;
}



interface BuildBadgesProps {
  platform?: Platform;
  storeType?: string | null;
  buildType?: string | null;
  isCICD: boolean;
  isRunning: boolean;
  isFailed: boolean;
  artifactVersionName?: string | null;
  buildNumber?: string | null;
}

function BuildBadges({ 
  platform, 
  storeType, 
  buildType, 
  isCICD, 
  isRunning, 
  isFailed,
  artifactVersionName,
  buildNumber,
}: BuildBadgesProps) {
  return (
    <Group justify="space-between" align="center" gap="md" wrap="wrap">
      {/* Left side: Badges */}
      <Group gap="xs" wrap="wrap">
        {platform && (
          <Badge size="sm" variant="light" style={{ alignSelf: 'flex-start' }}>
            {platform}
          </Badge>
        )}
        {storeType && (
          <Badge size="sm" variant="light" color="blue">
            {storeType}
          </Badge>
        )}
        {buildType && (
          <Badge size="sm" variant="light" color="gray">
            {buildType}
          </Badge>
        )}
        {/* CI/CD Status Badge */}
        {isCICD && isRunning && (
          <Badge size="sm" variant="light" color="blue" leftSection={<Loader size={12} />}>
            {BUILD_DISPLAY_LABELS.RUNNING}
          </Badge>
        )}
        {isCICD && isFailed && (
          <Badge size="sm" variant="light" color="red" leftSection={<IconX size={12} />}>
            {BUILD_DISPLAY_LABELS.FAILED}
          </Badge>
        )}
      </Group>
      
      {/* Right side: Metadata */}
      <Group gap="md" wrap="wrap">
        {artifactVersionName && (
          <Text size="xs" c="dimmed">
            {BUILD_DISPLAY_LABELS.VERSION_LABEL}: {artifactVersionName}
          </Text>
        )}
        {buildNumber && (
          <Text size="xs" c="dimmed">
            {BUILD_DISPLAY_LABELS.BUILD_LABEL}: {buildNumber}
          </Text>
        )}
      </Group>
    </Group>
  );
}

interface PlatformStatusBadgesProps {
  platform: Platform;
  isRunningWithJob: boolean;
  isQueued: boolean;
  isFailed: boolean;
}

function PlatformStatusBadges({ platform, isRunningWithJob, isQueued, isFailed }: PlatformStatusBadgesProps) {
  return (
    <Group gap="xs" wrap="wrap">
      <Badge size="sm" variant="light" style={{ alignSelf: 'flex-start' }}>
        {platform}
      </Badge>
      {isRunningWithJob && (
        <Badge size="sm" variant="light" color="blue" leftSection={<Loader size={12} />}>
          {BUILD_DISPLAY_LABELS.RUNNING}
        </Badge>
      )}
      {isQueued && (
        <Badge size="sm" variant="light" color="gray" leftSection={<IconClock size={12} />}>
          {BUILD_DISPLAY_LABELS.QUEUED}
        </Badge>
      )}
      {isFailed && (
        <Badge size="sm" variant="light" color="red" leftSection={<IconX size={12} />}>
          {BUILD_DISPLAY_LABELS.FAILED}
        </Badge>
      )}
    </Group>
  );
}

// ============================================================================
// Sub-Components: Links & Actions
// ============================================================================

interface PreReleaseLinksProps {
  build: BuildInfo;
  getTestFlightLink: (testflightNumber: string | null) => string | null;
}

function PreReleaseLinks({ build, getTestFlightLink }: PreReleaseLinksProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyInternalTrackLink = async () => {
    if (!build.internalTrackLink) return;
    
    try {
      await navigator.clipboard.writeText(build.internalTrackLink);
      setCopiedLink(true);
      showSuccessToast(BUILD_COPY_MESSAGES.COPY_SUCCESS);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      showErrorToast(BUILD_COPY_MESSAGES.COPY_FAILED);
    }
  };

  return (
    <>
      {/* iOS TestFlight Link */}
      {build.platform === Platform.IOS && build.testflightNumber && (
        <Group gap={4}>
          <IconBrandApple size={14} />
          <Text size="sm">{BUILD_DISPLAY_LABELS.TESTFLIGHT_BUILD}{build.testflightNumber}</Text>
        </Group>
      )}
      
      {/* Android Internal Track Link - Copy Button */}
      {build.platform === Platform.ANDROID && build.internalTrackLink && (
        <Button
          onClick={handleCopyInternalTrackLink}
          variant="light"
          size="xs"
          rightSection={copiedLink ? <IconCheck size={14} /> : <IconCopy size={14} />}
          color={copiedLink ? 'green' : undefined}
        >
          {copiedLink ? BUILD_DISPLAY_LABELS.COPIED : BUILD_DISPLAY_LABELS.COPY_PLAY_STORE_LINK}
        </Button>
      )}
    </>
  );
}

interface KickoffRegressionLinksProps {
  jobUrl?: string;
  taskStatus: TaskStatus;
  build: BuildInfo;
  onDownload: () => void;
  isDownloading: boolean;
}

function KickoffRegressionLinks({ 
  jobUrl, 
  taskStatus, 
  build, 
  onDownload, 
  isDownloading 
}: KickoffRegressionLinksProps) {
  const shouldShowJobLink = jobUrl && (
    taskStatus === TaskStatus.IN_PROGRESS ||
    taskStatus === TaskStatus.AWAITING_CALLBACK ||
    taskStatus === TaskStatus.COMPLETED ||
    taskStatus === TaskStatus.FAILED
  );

  return (
    <Group justify="space-between" align="center" gap="md" wrap="wrap" style={{ width: '100%' }}>
      {/* CI/CD Job Link */}
      {build.artifactPath && (
        <Button
          size="xs"
          variant="light"
          leftSection={<IconDownload size={14} />}
          onClick={onDownload}
          loading={isDownloading}
          disabled={isDownloading}
        >
          {BUILD_DISPLAY_LABELS.DOWNLOAD_ARTIFACT}
        </Button>
      )}
      {shouldShowJobLink && (
        <Anchor 
          href={jobUrl} 
          target="_blank" 
          size="sm" 
          c="blue"
        >
          <Group gap={4}>
            <IconExternalLink size={14} />
            <Text size="sm">{BUILD_DISPLAY_LABELS.VIEW_CI_CD_JOB}</Text>
          </Group>
        </Anchor>
      )}
      {/* Download Artifact Button */}

    </Group>
  );
}

interface PreReleaseJobLinkProps {
  jobUrl?: string;
  taskStatus: TaskStatus;
}

function PreReleaseJobLink({ jobUrl, taskStatus }: PreReleaseJobLinkProps) {
  const shouldShow = jobUrl && (
    taskStatus === TaskStatus.IN_PROGRESS ||
    taskStatus === TaskStatus.AWAITING_CALLBACK ||
    taskStatus === TaskStatus.COMPLETED ||
    taskStatus === TaskStatus.FAILED
  );

  if (!shouldShow) return null;

  return (
    <Anchor 
      href={jobUrl} 
      target="_blank" 
      size="sm" 
      c="blue"
    >
      <Group gap={4}>
        <IconExternalLink size={14} />
        <Text size="sm">{BUILD_DISPLAY_LABELS.VIEW_CI_CD_JOB}</Text>
      </Group>
    </Anchor>
  );
}

// ============================================================================
// Sub-Components: Warnings & Metadata
// ============================================================================

interface BuildWarningsProps {
  build: BuildInfo;
  taskStatus: TaskStatus;
}

function BuildWarnings({ build, taskStatus }: BuildWarningsProps) {
  if (taskStatus !== TaskStatus.COMPLETED) {
    return null;
  }

  return (
    <>
      {build.platform === Platform.IOS && !build.testflightNumber && (
        <Text size="xs" c="red">
          {BUILD_DISPLAY_LABELS.TESTFLIGHT_BUILD_NUMBER_MISSING}
        </Text>
      )}
      {build.platform === Platform.ANDROID && !build.internalTrackLink && (
        <Text size="xs" c="red">
          {BUILD_DISPLAY_LABELS.PLAY_STORE_LINK_MISSING}
        </Text>
      )}
    </>
  );
}

interface BuildMetadataProps {
  artifactVersionName?: string | null;
  buildNumber?: string | null;
}

function BuildMetadata({ artifactVersionName, buildNumber }: BuildMetadataProps) {
  return (
    <Group gap="md">
      {artifactVersionName && (
        <Text size="xs" c="dimmed">
          Version: {artifactVersionName}
        </Text>
      )}
      {buildNumber && (
        <Text size="xs" c="dimmed">
          Build: {buildNumber}
        </Text>
      )}
    </Group>
  );
}

// ============================================================================
// Main Components
// ============================================================================

/**
 * BuildDisplayItem - Displays a single build with all its information
 */
function BuildDisplayItem({
  build,
  taskStatus,
  isPostRegression,
  isKickoffRegression,
  getTestFlightLink,
  jobUrl,
}: BuildDisplayItemProps) {
  const downloadMutation = useDownloadBuildArtifact();

  // Determine build status for CI/CD builds
  const isCICD = build.buildType === BuildType.CI_CD;
  const isRunning = build.workflowStatus === WorkflowStatus.RUNNING;
  const buildFailed = build.workflowStatus === WorkflowStatus.FAILED || build.buildUploadStatus === BuildUploadStatus.FAILED;
  const taskFailed = taskStatus === TaskStatus.FAILED;
  const hasArtifact = !!build.artifactPath;
  const hasTestFlightLink = build.platform === Platform.IOS && build.testflightNumber;
  const hasInternalTrackLink = build.platform === Platform.ANDROID && build.internalTrackLink;
  
  // If task failed but build has artifact link, show it normally
  // If task failed and build has no artifact link, show as failed
  const shouldShowAsFailed = taskFailed && !hasArtifact && !hasTestFlightLink && !hasInternalTrackLink;
  const isFailed = buildFailed || shouldShowAsFailed;

  // Use build.ciRunId as fallback for jobUrl if not provided from buildOutput
  const effectiveJobUrl = jobUrl || build.ciRunId || undefined;

  const handleDownload = async () => {
    if (!build.artifactPath || !build.tenantId) {
      showErrorToast(BUILD_DOWNLOAD_MESSAGES.DOWNLOAD_ERROR);
      return;
    }

    try {
      await downloadMutation.mutateAsync({
        tenantId: build.tenantId,
        buildId: build.id,
      });
    } catch (error) {
      showErrorToast({ 
        ...BUILD_DOWNLOAD_MESSAGES.DOWNLOAD_FAILED,
        message: error instanceof Error ? error.message : BUILD_DOWNLOAD_MESSAGES.DOWNLOAD_FAILED.message
      });
    }
  };

  return (
    <Paper p="sm" 
           style={{ 
             border: '1px solid var(--mantine-color-gray-3)', 
             borderRadius: '4px',
             backgroundColor: isFailed ? 'var(--mantine-color-red-0)' : undefined,
           }}>
      <Stack gap="sm">
        {/* Badges and Metadata Row - Top (space-between with wrap) */}
        <BuildBadges
          platform={build.platform}
          storeType={build.storeType}
          buildType={build.buildType}
          isCICD={isCICD}
          isRunning={isRunning}
          isFailed={isFailed}
          artifactVersionName={build.artifactVersionName}
          buildNumber={build.buildNumber}
        />
        
        {/* Links and Actions Row - Middle */}
        <Group gap="md" wrap="wrap" style={{ width: '100%' }}>
          {/* For Pre-Release: Show TestFlight or Internal Track links */}
          {isPostRegression && (
            <PreReleaseLinks build={build} getTestFlightLink={getTestFlightLink} />
          )}
          
          {/* For Kickoff/Regression: Show download links and CI/CD job links */}
          {isKickoffRegression && (
            <KickoffRegressionLinks
              jobUrl={effectiveJobUrl}
              taskStatus={taskStatus}
              build={build}
              onDownload={handleDownload}
              isDownloading={downloadMutation.isLoading}
            />
          )}
          
          {/* For Pre-Release: Show CI/CD job links if available */}
          {isPostRegression && (
            <PreReleaseJobLink jobUrl={effectiveJobUrl} taskStatus={taskStatus} />
          )}
          
        </Group>
        
        {/* Warnings */}
        {isPostRegression && (
          <BuildWarnings build={build} taskStatus={taskStatus} />
        )}
      </Stack>
    </Paper>
  );
}

/**
 * PlatformStatusItem - Shows platform status when no build exists yet (CI/CD mode)
 * Displays "Running", "Queued", or "Failed" based on task status
 */
function PlatformStatusItem({
  platform,
  taskStatus,
  jobUrl,
}: PlatformStatusItemProps) {
  const isFailed = taskStatus === TaskStatus.FAILED;
  const isRunning = taskStatus === TaskStatus.IN_PROGRESS || taskStatus === TaskStatus.AWAITING_CALLBACK;
  
  // Determine if we should show Running (has jobUrl) or Queued (no jobUrl)
  const isQueued = isRunning && !jobUrl;
  const isRunningWithJob = isRunning && !!jobUrl;
  
  // Show CI/CD job link if available and task is in a state that allows it
  const shouldShowJobLink = jobUrl && (
    taskStatus === TaskStatus.IN_PROGRESS ||
    taskStatus === TaskStatus.AWAITING_CALLBACK ||
    taskStatus === TaskStatus.COMPLETED ||
    taskStatus === TaskStatus.FAILED
  );

  return (
    <Paper p="sm" 
           style={{ 
             border: '1px solid var(--mantine-color-gray-3)', 
             borderRadius: '4px',
             backgroundColor: isFailed ? 'var(--mantine-color-red-0)' : undefined,
           }}>
      <Stack gap="sm">
        {/* Badges Row - Top */}
        <PlatformStatusBadges
          platform={platform}
          isRunningWithJob={isRunningWithJob}
          isQueued={isQueued}
          isFailed={isFailed}
        />
        
        {/* Status text and CI/CD Job Link on same row with space-between */}
        <Group justify="space-between" align="center" gap="md" wrap="wrap">
          <Text size="sm" c={isFailed ? 'red' : 'dimmed'}>
            {isFailed ? BUILD_DISPLAY_LABELS.BUILD_FAILED : isQueued ? BUILD_DISPLAY_LABELS.BUILD_QUEUED : BUILD_DISPLAY_LABELS.BUILD_IN_PROGRESS}
          </Text>
          {/* CI/CD Job Link - Show in the card */}
          {shouldShowJobLink && (
            <Anchor 
              href={jobUrl} 
              target="_blank" 
              size="sm" 
              c="blue"
            >
              <Group gap={4}>
                <IconExternalLink size={14} />
                <Text size="sm">{BUILD_DISPLAY_LABELS.VIEW_CI_CD_JOB}</Text>
              </Group>
            </Anchor>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}

// ============================================================================
// Main Exported Component
// ============================================================================

/**
 * ConsumedBuildsDisplay - Main component that displays all consumed builds
 * Groups builds by platform and handles both manual and CI/CD modes
 */
export function ConsumedBuildsDisplay({
  builds,
  taskStatus,
  isPostRegression,
  isKickoffRegression,
  buildOutput,
  expectedPlatforms,
}: ConsumedBuildsDisplayProps) {
  // Group builds by platform for better display
  const buildsByPlatform = useMemo(() => {
    const grouped: Record<string, BuildInfo[]> = {};
    builds.forEach((build) => {
      const platform = build.platform;
      if (!grouped[platform]) {
        grouped[platform] = [];
      }
      grouped[platform].push(build);
    });
    return grouped;
  }, [builds]);

  // For CI/CD mode: Show all expected platforms, even if no builds yet
  // For failed tasks: Show all expected platforms to show which ones failed
  const platformsToShow = useMemo(() => {
    if (expectedPlatforms && expectedPlatforms.length > 0) {
      // Show all expected platforms (CI/CD mode or failed task)
      return expectedPlatforms;
    }
    // Manual mode: Only show platforms that have builds
    return Object.keys(buildsByPlatform);
  }, [expectedPlatforms, buildsByPlatform]);

  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed" fw={500}>
        {BUILD_DISPLAY_LABELS.SECTION_TITLE}
      </Text>
      <Stack gap="xs">
        {platformsToShow.map((platform) => {
          const platformBuilds = buildsByPlatform[platform] || [];
          const platformKey = platform as Platform;
          
          // If no builds for this platform but we're showing expected platforms (CI/CD mode or failed task)
          if (platformBuilds.length === 0 && expectedPlatforms) {
            // Find job URL for this platform from buildOutput
            const platformJobUrl = buildOutput?.platforms?.find(p => p.platform === platform)?.jobUrl;
            return (
              <PlatformStatusItem
                key={platform}
                platform={platformKey}
                taskStatus={taskStatus}
                isPostRegression={isPostRegression}
                isKickoffRegression={isKickoffRegression}
                getTestFlightLink={getTestFlightLink}
                jobUrl={platformJobUrl}
              />
            );
          }
          
          // Show builds for this platform
          return (
            <Stack key={platform} gap="xs">
              {platformBuilds.map((build) => {
                // Find job URL for this platform from buildOutput, fallback to build.ciRunId
                const platformJobUrl = buildOutput?.platforms?.find(p => p.platform === build.platform)?.jobUrl || build.ciRunId || undefined;
                return (
                  <BuildDisplayItem
                    key={build.id}
                    build={build}
                    taskStatus={taskStatus}
                    isPostRegression={isPostRegression}
                    isKickoffRegression={isKickoffRegression}
                    getTestFlightLink={getTestFlightLink}
                    jobUrl={platformJobUrl}
                  />
                );
              })}
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}
