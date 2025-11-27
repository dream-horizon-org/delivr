/**
 * Releases List Header Component
 * Header section for the releases list page with title and create button
 */

import { memo } from 'react';
import { Link } from '@remix-run/react';
import { Title, Text, Group, Button } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';

interface ReleasesListHeaderProps {
  org: string;
}

export const ReleasesListHeader = memo(function ReleasesListHeader({
  org,
}: ReleasesListHeaderProps) {
  return (
    <div className="mb-8">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1} className="mb-2">
            Releases
          </Title>
          <Text size="md" c="dimmed">
            Manage and track your release pipeline
          </Text>
        </div>
        {org && (
          <Link to={`/dashboard/${org}/releases/create`}>
            <Button leftSection={<IconRocket size={16} />}>Create Release</Button>
          </Link>
        )}
      </Group>
    </div>
  );
});

