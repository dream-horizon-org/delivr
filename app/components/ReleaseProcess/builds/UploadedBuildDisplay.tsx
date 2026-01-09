/**
 * UploadedBuildDisplay Component
 * Displays an uploaded build (not yet consumed) with change button
 * Shows build metadata and allows changing the build
 * 
 * Special handling for TestFlight builds:
 * - Shows TestFlight number and "Verified" status instead of download link
 */

import { Anchor, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { IconBrandApple, IconCheck, IconExternalLink, IconFile, IconPencil } from '@tabler/icons-react';
import type { BuildInfo } from '~/types/release-process.types';
import { Platform } from '~/types/release-process-enums';

interface UploadedBuildDisplayProps {
  build: BuildInfo;
  onChangeBuild: () => void;
  canChangeBuild?: boolean; // Whether user has permission to change build
}

export function UploadedBuildDisplay({
  build,
  onChangeBuild,
  canChangeBuild = true, // Default to true for backward compatibility
}: UploadedBuildDisplayProps) {
  // Check if this is a TestFlight build (iOS with testflightNumber and no artifactPath)
  const isTestFlightBuild = 
    build.platform === Platform.IOS && 
    build.testflightNumber && 
    !build.artifactPath;

  return (
    <Group justify="space-between" align="flex-start" p="sm" 
           style={{ 
             border: '1px solid var(--mantine-color-gray-3)', 
             borderRadius: '4px',
           }}>
      <Group gap="xs" style={{ flex: 1 }}>
        {/* <IconFile size={16} /> */}
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
          </Group>
          
          {/* TestFlight Build Display */}
          {isTestFlightBuild ? (
            <Stack gap="xs">
              <Group gap="xs">
                <IconBrandApple size={16} />
                <Text size="sm" fw={500}>
                  TestFlight Build #{build.testflightNumber}
                </Text>
              </Group>
              <Group gap="xs">
                <IconCheck size={14} color="green" />
                <Text size="xs" c="green" fw={500}>
                  Verified
                </Text>
              </Group>
            </Stack>
          ) : (
            <>
              {/* Regular artifact download link */}
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
              
              {/* Android Internal Track Link */}
              {build.platform === Platform.ANDROID && build.internalTrackLink && (
                <Anchor 
                  href={build.internalTrackLink} 
                  target="_blank" 
                  size="sm" 
                  c="blue"
                >
                  <Group gap={4}>
                    <IconExternalLink size={14} />
                    <Text size="sm">Play Store Internal Track</Text>
                  </Group>
                </Anchor>
              )}
            </>
          )}
          
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
      {canChangeBuild && (
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPencil size={14} />}
          onClick={onChangeBuild}
        >
          Change Build
        </Button>
      )}
    </Group>
  );
}

