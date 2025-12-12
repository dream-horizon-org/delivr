/**
 * EmptySubmissionsCard - Empty state for no submissions
 * Extracted from dashboard.$org.releases.$releaseId.distribution.tsx
 */

import { Button, Card, Stack, Text } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';

export type EmptySubmissionsCardProps = {
  showButton: boolean;
  onSubmit: () => void;
};

export function EmptySubmissionsCard({ showButton, onSubmit }: EmptySubmissionsCardProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack align="center" py="xl">
        <IconRocket size={48} className="text-gray-300" />
        <Text c="dimmed" ta="center">
          No submissions yet. Submit your builds to the app stores to start distribution.
        </Text>
        {showButton && (
          <Button mt="md" leftSection={<IconRocket size={16} />} onClick={onSubmit}>
            Submit to Stores
          </Button>
        )}
      </Stack>
    </Card>
  );
}

