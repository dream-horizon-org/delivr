/**
 * BuildArtifactsList Component
 * Pure presentation component for displaying build artifacts
 */

import {
  Anchor,
  Button,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconFile,
  IconTrash,
} from '@tabler/icons-react';
import type { BuildArtifact } from '~/types/release-process.types';
import { Platform } from '~/types/release-process-enums';

interface BuildArtifactsListProps {
  artifacts: BuildArtifact[];
  onDelete: (uploadId: string) => void;
  isDeleting?: boolean;
}

export function BuildArtifactsList({
  artifacts,
  onDelete,
  isDeleting = false,
}: BuildArtifactsListProps) {
  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed" fw={500}>
        Build Artifacts
      </Text>
      <Stack gap="xs">
        {artifacts.map((artifact) => (
          <Group key={artifact.id} justify="space-between" align="center" p="sm" 
                 style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px' }}>
            <Group gap="xs">
              <IconFile size={16} />
              <div>
                <Text size="sm" fw={500}>
                  {artifact.platform}
                </Text>
                {artifact.downloadUrl ? (
                  <Anchor href={artifact.downloadUrl} target="_blank" size="xs" c="blue">
                    Download Artifact
                  </Anchor>
                ) : (
                  <Text size="xs" c="dimmed">
                    {artifact.platform === Platform.IOS && !artifact.downloadUrl && artifact.buildNumber
                      ? `TestFlight Build #${artifact.buildNumber}`
                      : 'No download available'}
                  </Text>
                )}
              </div>
            </Group>
            <Tooltip label="Delete artifact">
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<IconTrash size={14} />}
                onClick={() => onDelete(artifact.id)}
                loading={isDeleting}
              >
                Delete
              </Button>
            </Tooltip>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}

