/**
 * Releases Tab Panel Component
 * Reusable component for displaying releases in a tab panel
 */

import { memo } from 'react';
import { Stack } from '@mantine/core';
import { ReleaseCard } from './ReleaseCard';
import { ReleasesEmptyState } from './ReleasesEmptyState';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { RELEASE_TAB_CONFIGS, RELEASE_TABS } from '~/constants/release-tabs';

interface ReleasesTabPanelProps {
  releases: BackendReleaseResponse[];
  org: string;
  emptyMessage: string;
  tabValue?: string;
}

export const ReleasesTabPanel = memo(function ReleasesTabPanel({
  releases,
  org,
  emptyMessage,
  tabValue,
}: ReleasesTabPanelProps) {
  if (releases.length === 0) {
    // Find the tab config to get icon and better messaging
    const tabConfig = RELEASE_TAB_CONFIGS.find(
      (config) => config.value === tabValue
    ) || RELEASE_TAB_CONFIGS[1]; // Default to Active tab config

    // Determine if we should show create button
    const showCreateButton = 
      tabValue === RELEASE_TABS.UPCOMING || 
      tabValue === RELEASE_TABS.ACTIVE;

    // Better descriptions for each tab
    const descriptions: Record<string, string> = {
      [RELEASE_TABS.UPCOMING]: 
        'Releases scheduled to start in the future will appear here. Create a new release to get started.',
      [RELEASE_TABS.ACTIVE]: 
        'Releases that are currently running or paused will appear here. Create a new release to begin your deployment process.',
      [RELEASE_TABS.COMPLETED]: 
        'Releases that have been successfully completed will appear here.',
      [RELEASE_TABS.ARCHIVED]: 
        'Archived or cancelled releases will appear here.',
    };

    return (
      <ReleasesEmptyState
        icon={tabConfig.icon}
        title={tabConfig.emptyMessage}
        description={descriptions[tabValue || RELEASE_TABS.ACTIVE]}
        showCreateButton={showCreateButton}
        org={org}
      />
    );
  }

  return (
    <Stack gap="md">
      {releases.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          org={release.appId}
        />
      ))}
    </Stack>
  );
});

