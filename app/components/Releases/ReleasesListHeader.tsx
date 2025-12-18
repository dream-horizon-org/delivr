/**
 * Releases List Header Component
 * Header section for the releases list page with title and create button
 */

import { memo } from 'react';
import { Link, useRouteLoaderData } from '@remix-run/react';
import { Title, Text, Group, Button } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';
import { usePermissions } from '~/hooks/usePermissions';
import type { OrgLayoutLoaderData } from '~/routes/dashboard.$org';

interface ReleasesListHeaderProps {
  org: string;
}

export const ReleasesListHeader = memo(function ReleasesListHeader({
  org,
}: ReleasesListHeaderProps) {
  // Get user data and check permissions
  const orgLayoutData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  const userId = orgLayoutData?.user?.user?.id || '';
  const { isEditor } = usePermissions(org, userId);

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
        {org && isEditor && (
          <Link to={`/dashboard/${org}/releases/create`}>
            <Button leftSection={<IconRocket size={16} />}>Create Release</Button>
          </Link>
        )}
      </Group>
    </div>
  );
});

