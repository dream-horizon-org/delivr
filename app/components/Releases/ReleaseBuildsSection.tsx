/**
 * Release Builds Section Component
 * Placeholder for future builds functionality
 */

import { memo } from 'react';
import { Paper, Title, Text, Group, Button } from '@mantine/core';

interface ReleaseBuildsSectionProps {
  builds: any[];
}

export const ReleaseBuildsSection = memo(function ReleaseBuildsSection({ builds }: ReleaseBuildsSectionProps) {
  return (
    <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
      <Group justify="space-between" className="mb-4">
        <Title order={3}>Builds</Title>
        <Button size="sm">Trigger Build</Button>
      </Group>
      
      {builds.length === 0 ? (
        <Text size="sm" c="dimmed" className="text-center py-8">No builds yet</Text>
      ) : (
        <div>Builds will be displayed here</div>
      )}
    </Paper>
  );
});

