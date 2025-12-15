/**
 * Release Details Overview Component
 * Displays release information: type, dates, branches, platform targets, and metadata
 */

import { memo } from 'react';
import { Paper, Title, Text, Badge, Group, Stack } from '@mantine/core';
import { formatReleaseDate, getTypeColor } from '~/utils/release-utils';
import type { BackendReleaseResponse } from '~/types/release-management.types';

interface ReleaseDetailsOverviewProps {
  release: BackendReleaseResponse;
}

export const ReleaseDetailsOverview = memo(function ReleaseDetailsOverview({ release }: ReleaseDetailsOverviewProps) {
  return (
    <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
      <Title order={3} className="mb-4">Overview</Title>
      
      <Stack gap="md">
        <Group>
          <div style={{ flex: 1 }}>
            <Text size="sm" c="dimmed" className="mb-1">Release Type</Text>
            <Badge color={getTypeColor(release.type)} variant="light">
              {release.type}
            </Badge>
          </div>
          
          {release.kickOffDate && (
            <div style={{ flex: 1 }}>
              <Text size="sm" c="dimmed" className="mb-1">Kick Off Date</Text>
              <Text size="sm">{formatReleaseDate(release.kickOffDate)}</Text>
            </div>
          )}
        </Group>

        <Group>
          {release.targetReleaseDate && (
            <div style={{ flex: 1 }}>
              <Text size="sm" c="dimmed" className="mb-1">Target Release Date</Text>
              <Text size="sm">{formatReleaseDate(release.targetReleaseDate)}</Text>
            </div>
          )}
          
          {release.releaseDate && (
            <div style={{ flex: 1 }}>
              <Text size="sm" c="dimmed" className="mb-1">Release Date</Text>
              <Text size="sm">{formatReleaseDate(release.releaseDate)}</Text>
            </div>
          )}
        </Group>

        <Group>
          {release.branch && (
            <div style={{ flex: 1 }}>
              <Text size="sm" c="dimmed" className="mb-1">Branch</Text>
              <Text size="sm" className="font-mono">{release.branch}</Text>
            </div>
          )}
          
          {release.baseBranch && (
            <div style={{ flex: 1 }}>
              <Text size="sm" c="dimmed" className="mb-1">Base Branch</Text>
              <Text size="sm" className="font-mono">{release.baseBranch}</Text>
            </div>
          )}
        </Group>

        {/* Platform Targets */}
        {release.platformTargetMappings && release.platformTargetMappings.length > 0 && (
          <div>
            <Text size="sm" c="dimmed" className="mb-2">Platform Targets</Text>
            <Group gap="xs">
              {release.platformTargetMappings.map((mapping: any, idx: number) => (
                <Badge key={idx} size="sm" variant="dot">
                  {mapping.platform} → {mapping.target}
                </Badge>
              ))}
            </Group>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-2 border-t border-gray-200">
          <Group gap="md">
            <Text size="xs" c="dimmed">
              Created {formatReleaseDate(release.createdAt)}
            </Text>
            {release.updatedAt && release.updatedAt !== release.createdAt && (
              <Text size="xs" c="dimmed">
                Updated {formatReleaseDate(release.updatedAt)}
              </Text>
            )}
          </Group>
        </div>
      </Stack>
    </Paper>
  );
});

