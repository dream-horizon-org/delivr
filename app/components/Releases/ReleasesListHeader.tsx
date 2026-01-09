/**
 * Releases List Header Component
 * Header section for the releases list page with title and create button
 */

import { memo } from 'react';
import { Link, useRouteLoaderData } from '@remix-run/react';
import { Button } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';
import { usePermissions } from '~/hooks/usePermissions';
import type { OrgLayoutLoaderData } from '~/routes/dashboard.$org';
import { RELEASES_PAGE_HEADER } from '~/constants/page-headers';
import { PageHeader } from '~/components/Common/PageHeader';

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
    <PageHeader
      title={RELEASES_PAGE_HEADER.TITLE}
      description={RELEASES_PAGE_HEADER.DESCRIPTION}
      icon={IconRocket}
      rightSection={
        org && isEditor ? (
          <Link to={`/dashboard/${org}/releases/create`}>
            <Button leftSection={<IconRocket size={16} />}>Create Release</Button>
          </Link>
        ) : undefined
      }
    />
  );
});

