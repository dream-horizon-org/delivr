/**
 * Release Details Header Component
 * Displays release title, branch, status badge, and action buttons
 */

import { memo, useState } from 'react';
import { Link } from '@remix-run/react';
import { Paper, Title, Text, Badge, Group, Button } from '@mantine/core';
import { IconArrowLeft, IconEdit } from '@tabler/icons-react';
import { getStatusColor, getReleaseActiveStatus, getActiveStatusColor } from '~/utils/release-utils';
import type { BackendReleaseResponse } from '~/.server/services/ReleaseManagement';
import { UpdateReleaseForm } from './UpdateReleaseForm';

interface ReleaseDetailsHeaderProps {
  release: BackendReleaseResponse;
  org: string;
  onUpdate?: () => void;
}

export const ReleaseDetailsHeader = memo(function ReleaseDetailsHeader({ release, org, onUpdate }: ReleaseDetailsHeaderProps) {
  const [editModalOpened, setEditModalOpened] = useState(false);

  // Get active status
  const activeStatus = getReleaseActiveStatus(release);
  const activeStatusColor = getActiveStatusColor(activeStatus);

  const handleUpdateSuccess = () => {
    // Call parent's refetch callback to refresh release data
    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <>
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
            <Badge color={activeStatusColor} variant="light" size="lg">
              {activeStatus}
            </Badge>
            <Button 
              variant="outline" 
              leftSection={<IconEdit size={16} />}
              onClick={() => setEditModalOpened(true)}
            >
              Edit Release
            </Button>
          </Group>
        </Group>
      </Paper>

      <UpdateReleaseForm
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        release={release}
        tenantId={org}
        onSuccess={handleUpdateSuccess}
      />
    </>
  );
});

