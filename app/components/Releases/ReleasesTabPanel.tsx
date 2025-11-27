/**
 * Releases Tab Panel Component
 * Reusable component for displaying releases in a tab panel
 */

import { memo } from 'react';
import { Stack, Paper, Text } from '@mantine/core';
import { ReleaseCard } from './ReleaseCard';
import type { BackendReleaseResponse } from '~/.server/services/ReleaseManagement/release-retrieval.service';

interface ReleasesTabPanelProps {
  releases: BackendReleaseResponse[];
  org: string;
  emptyMessage: string;
  onDelete: (releaseId: string) => void;
}

export const ReleasesTabPanel = memo(function ReleasesTabPanel({
  releases,
  org,
  emptyMessage,
  onDelete,
}: ReleasesTabPanelProps) {
  if (releases.length === 0) {
    return (
      <Paper p="xl" withBorder className="text-center">
        <Text c="dimmed">{emptyMessage}</Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {releases.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          org={release.tenantId}
          onDelete={onDelete}
        />
      ))}
    </Stack>
  );
});

