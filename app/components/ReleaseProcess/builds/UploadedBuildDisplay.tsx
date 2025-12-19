/**
 * UploadedBuildDisplay Component
 * Displays an uploaded build (not yet consumed) with change button
 * Shows build metadata and allows changing the build
 */

import { Anchor, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { IconExternalLink, IconFile, IconPencil } from '@tabler/icons-react';
import type { BuildInfo } from '~/types/release-process.types';

interface UploadedBuildDisplayProps {
  build: BuildInfo;
  onChangeBuild: () => void;
}

export function UploadedBuildDisplay({
  build,
  onChangeBuild,
}: UploadedBuildDisplayProps) {
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
      <Button
        size="xs"
        variant="light"
        leftSection={<IconPencil size={14} />}
        onClick={onChangeBuild}
      >
        Change Build
      </Button>
    </Group>
  );
}

