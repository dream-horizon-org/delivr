/**
 * Release Details Header Component
 * Displays release title, branch, status badge, and action buttons
 */

import { memo } from 'react';
import { Link } from '@remix-run/react';
import { Paper, Title, Text, Badge, Group, Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { getStatusColor } from '~/utils/release-utils';
import type { BackendReleaseResponse } from '~/.server/services/ReleaseManagement';

interface ReleaseDetailsHeaderProps {
  release: BackendReleaseResponse;
  org: string;
}

export const ReleaseDetailsHeader = memo(function ReleaseDetailsHeader({ release, org }: ReleaseDetailsHeaderProps) {
  return (
    <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
      <Group justify="space-between" align="flex-start">
        <Group>
          <Link to={`/dashboard/${org}/releases`}>
            <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}>
              Back
            </Button>
          </Link>
          <div>
            <Title order={2} className="mb-1">
              {release.releaseId || release.id || 'Unknown Release'}
            </Title>
            {release.branch && (
              <Text size="sm" c="dimmed" className="font-mono">
                {release.branch}
              </Text>
            )}
          </div>
        </Group>
        
        <Group>
          <Badge color={getStatusColor(release.status)} variant="light" size="lg">
            {release.status.replace('_', ' ')}
          </Badge>
          <Button variant="outline">
            Edit Release
          </Button>
        </Group>
      </Group>
    </Paper>
  );
});

