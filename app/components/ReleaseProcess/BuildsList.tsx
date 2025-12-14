/**
 * BuildsList Component
 * Pure presentation component for displaying builds array grouped by platform
 * For CI/CD mode: Shows all expected platforms with their status (running, failed, completed)
 */

import { useMemo } from 'react';
import {
  Anchor,
  Badge,
  Group,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconBrandApple,
  IconExternalLink,
  IconFile,
  IconX,
} from '@tabler/icons-react';
import type { BuildInfo } from '~/types/release-process.types';
import { Platform, TaskStatus } from '~/types/release-process-enums';

interface BuildsListProps {
  builds: BuildInfo[];
  expectedPlatforms?: Platform[]; // For CI/CD: Show all platforms even if no builds
  taskStatus?: TaskStatus; // Task status to determine if showing running/failed states
  isPostRegression: boolean;
  isKickoffRegression: boolean;
}

export function BuildsList({ 
  builds, 
  expectedPlatforms,
  taskStatus,
  isPostRegression, 
  isKickoffRegression 
}: BuildsListProps) {
  // Helper to generate TestFlight link
  const getTestFlightLink = (testflightNumber: string | null): string | null => {
    if (!testflightNumber) return null;
    return `https://appstoreconnect.apple.com/testflight/builds/${testflightNumber}`;
  };

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

  // Determine if task is failed
  const isTaskFailed = taskStatus === TaskStatus.FAILED;

  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed" fw={500}>
        Builds
      </Text>
      <Stack gap="xs">
        {platformsToShow.map((platform) => {
          const platformBuilds = buildsByPlatform[platform] || [];
          const platformKey = platform as Platform;
          
          // If no builds for this platform but we're showing expected platforms (CI/CD mode or failed task)
          if (platformBuilds.length === 0 && expectedPlatforms) {
            return (
              <PlatformStatusItem
                key={platform}
                platform={platformKey}
                taskStatus={taskStatus}
                isPostRegression={isPostRegression}
                isKickoffRegression={isKickoffRegression}
                getTestFlightLink={getTestFlightLink}
              />
            );
          }
          
          // If task failed, show failed status even if build exists (unless it has artifact link)
          // Builds with artifact links will be shown normally
          
          // Show builds for this platform
          return (
            <Stack key={platform} gap="xs">
              <Badge size="sm" variant="light" style={{ alignSelf: 'flex-start' }}>
                {platform}
              </Badge>
              {platformBuilds.map((build) => (
                <BuildItem
                  key={build.id}
                  build={build}
                  taskStatus={taskStatus}
                  isPostRegression={isPostRegression}
                  isKickoffRegression={isKickoffRegression}
                  getTestFlightLink={getTestFlightLink}
                />
              ))}
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}

interface BuildItemProps {
  build: BuildInfo;
  taskStatus?: TaskStatus;
  isPostRegression: boolean;
  isKickoffRegression: boolean;
  getTestFlightLink: (testflightNumber: string | null) => string | null;
}

function BuildItem({
  build,
  taskStatus,
  isPostRegression,
  isKickoffRegression,
  getTestFlightLink,
}: BuildItemProps) {
  // Determine build status for CI/CD builds
  const isCICD = build.buildType === 'CI_CD';
  const isRunning = build.workflowStatus === 'RUNNING';
  const buildFailed = build.workflowStatus === 'FAILED' || build.buildUploadStatus === 'FAILED';
  const taskFailed = taskStatus === TaskStatus.FAILED;
  const hasArtifact = !!build.artifactPath;
  const hasTestFlightLink = build.platform === Platform.IOS && build.testflightNumber;
  const hasInternalTrackLink = build.platform === Platform.ANDROID && build.internalTrackLink;
  
  // If task failed but build has artifact link, show it normally
  // If task failed and build has no artifact link, show as failed
  const shouldShowAsFailed = taskFailed && !hasArtifact && !hasTestFlightLink && !hasInternalTrackLink;
  const isFailed = buildFailed || shouldShowAsFailed;

  return (
    <Group justify="space-between" align="flex-start" p="sm" 
           style={{ 
             border: '1px solid var(--mantine-color-gray-3)', 
             borderRadius: '4px',
             backgroundColor: isFailed ? 'var(--mantine-color-red-0)' : undefined,
           }}>
      <Group gap="xs" style={{ flex: 1 }}>
        <IconFile size={16} />
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group gap="xs">
            {build.storeType && (
              <Badge size="sm" variant="light" color="blue">
                {build.storeType}
              </Badge>
            )}
            {build.buildType && (
              <Badge size="sm" variant="light" color="gray">
                {build.buildType}
              </Badge>
            )}
            {/* CI/CD Status Badge */}
            {isCICD && isRunning && (
              <Badge size="sm" variant="light" color="blue" leftSection={<Loader size={12} />}>
                Running
              </Badge>
            )}
            {isCICD && isFailed && (
              <Badge size="sm" variant="light" color="red" leftSection={<IconX size={12} />}>
                Failed
              </Badge>
            )}
          </Group>
          
          {/* For Post-Regression: Show TestFlight or Internal Track links */}
          {isPostRegression && (
            <Stack gap="xs">
              {/* iOS TestFlight Link */}
              {build.platform === Platform.IOS && build.testflightNumber && (
                <Group gap="xs">
                  <IconBrandApple size={14} />
                  <Anchor 
                    href={getTestFlightLink(build.testflightNumber) || '#'} 
                    target="_blank" 
                    size="sm" 
                    c="blue"
                  >
                    TestFlight Build #{build.testflightNumber}
                  </Anchor>
                </Group>
              )}
              {/* Show warning if TestFlight build is missing testflightNumber */}
              {build.platform === Platform.IOS && !build.testflightNumber && taskStatus === TaskStatus.COMPLETED && (
                <Text size="xs" c="red">
                  TestFlight build number missing
                </Text>
              )}
              
              {/* Android Internal Track Link */}
              {build.platform === Platform.ANDROID && build.internalTrackLink && (
                <Group gap="xs">
                  <IconExternalLink size={14} />
                  <Anchor 
                    href={build.internalTrackLink} 
                    target="_blank" 
                    size="sm" 
                    c="blue"
                  >
                    Play Store Internal Track
                  </Anchor>
                </Group>
              )}
              {/* Show warning if AAB build is missing internalTrackLink */}
              {build.platform === Platform.ANDROID && !build.internalTrackLink && taskStatus === TaskStatus.COMPLETED && (
                <Text size="xs" c="red">
                  Play Store link missing
                </Text>
              )}
            </Stack>
          )}
          
          {/* For Kickoff/Regression: Show download links */}
          {isKickoffRegression && (
            <Stack gap="xs">
              {build.artifactPath && (
                <Anchor 
                  href={build.artifactPath} 
                  target="_blank" 
                  size="sm" 
                  c="blue"
                >
                  <Group gap={4}>
                    <IconExternalLink size={14} />
                    <Text size="sm">Download Artifact</Text>
                  </Group>
                </Anchor>
              )}
            </Stack>
          )}
          
          {/* Build metadata */}
          <Group gap="xs">
            {build.artifactVersionName && (
              <Text size="xs" c="dimmed">
                Version: {build.artifactVersionName}
              </Text>
            )}
            {build.buildNumber && (
              <Text size="xs" c="dimmed">
                Build: {build.buildNumber}
              </Text>
            )}
          </Group>
        </Stack>
      </Group>
    </Group>
  );
}

interface PlatformStatusItemProps {
  platform: Platform;
  taskStatus?: TaskStatus;
  isPostRegression: boolean;
  isKickoffRegression: boolean;
  getTestFlightLink: (testflightNumber: string | null) => string | null;
}

/**
 * PlatformStatusItem - Shows platform status when no build exists yet (CI/CD mode)
 * Displays "Running" or "Failed" based on task status
 */
function PlatformStatusItem({
  platform,
  taskStatus,
  isPostRegression,
  isKickoffRegression,
  getTestFlightLink,
}: PlatformStatusItemProps) {
  const isFailed = taskStatus === TaskStatus.FAILED;
  const isRunning = taskStatus === TaskStatus.IN_PROGRESS || taskStatus === TaskStatus.AWAITING_CALLBACK;

  return (
    <Group justify="space-between" align="flex-start" p="sm" 
           style={{ 
             border: '1px solid var(--mantine-color-gray-3)', 
             borderRadius: '4px',
             backgroundColor: isFailed ? 'var(--mantine-color-red-0)' : undefined,
           }}>
      <Group gap="xs" style={{ flex: 1 }}>
        <IconFile size={16} />
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group gap="xs">
            <Badge size="sm" variant="light" style={{ alignSelf: 'flex-start' }}>
              {platform}
            </Badge>
            {isRunning && (
              <Badge size="sm" variant="light" color="blue" leftSection={<Loader size={12} />}>
                Running
              </Badge>
            )}
            {isFailed && (
              <Badge size="sm" variant="light" color="red" leftSection={<IconX size={12} />}>
                Failed
              </Badge>
            )}
          </Group>
          <Text size="sm" c={isFailed ? 'red' : 'dimmed'}>
            {isFailed ? 'Build failed' : 'Build in progress...'}
          </Text>
        </Stack>
      </Group>
    </Group>
  );
}

