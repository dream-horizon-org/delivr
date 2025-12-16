/**
 * Releases Tab Panel Component
 * Reusable component for displaying releases in a tab panel
 */

import { memo } from 'react';
import { Stack, Paper, Text } from '@mantine/core';
import { ReleaseCard } from './ReleaseCard';
import type { BackendReleaseResponse } from '~/types/release-management.types';

interface ReleasesTabPanelProps {
  releases: BackendReleaseResponse[];
  org: string;
  emptyMessage: string;
}

export const ReleasesTabPanel = memo(function ReleasesTabPanel({
  releases,
  org,
  emptyMessage,
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
        />
      ))}
    </Stack>
  );
});

