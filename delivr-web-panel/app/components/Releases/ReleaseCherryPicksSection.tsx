/**
 * Release Cherry Picks Section Component
 * Placeholder for future cherry picks functionality
 */

import { memo } from 'react';
import { Paper, Title, Text, Group, Button } from '@mantine/core';

interface ReleaseCherryPicksSectionProps {
  cherryPicks: any[];
}

export const ReleaseCherryPicksSection = memo(function ReleaseCherryPicksSection({ cherryPicks }: ReleaseCherryPicksSectionProps) {
  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" className="mb-4">
        <Title order={3}>Cherry Picks</Title>
        <Button size="sm" variant="outline">Request Cherry Pick</Button>
      </Group>
      
      {cherryPicks.length === 0 ? (
        <Text size="sm" c="dimmed" className="text-center py-8">No cherry picks yet</Text>
      ) : (
        <div>Cherry picks will be displayed here</div>
      )}
    </Paper>
  );
});

