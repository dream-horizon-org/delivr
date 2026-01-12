/**
 * Releases Tabs Component
 * Tab navigation and panels for releases list
 */

import { memo, useMemo } from 'react';
import { Tabs } from '@mantine/core';
import { StandardizedTabs, type TabConfig } from '~/components/Common/StandardizedTabs';
import { RELEASE_TAB_CONFIGS } from '~/constants/release-tabs';
import { ReleasesTabPanel } from './ReleasesTabPanel';
import type { BackendReleaseResponse } from '~/types/release-management.types';

interface ReleasesTabsProps {
  activeTab: string;
  onTabChange: (value: string | null) => void;
  upcoming: BackendReleaseResponse[];
  active: BackendReleaseResponse[]; // Includes both RUNNING and PAUSED
  completed: BackendReleaseResponse[];
  archived: BackendReleaseResponse[];
  org: string;
}

export const ReleasesTabs = memo(function ReleasesTabs({
  activeTab,
  onTabChange,
  upcoming,
  active,
  completed,
  archived,
  org,
}: ReleasesTabsProps) {
  const tabDataMap = useMemo(
    () => ({
      [RELEASE_TAB_CONFIGS[0].value]: upcoming,
      [RELEASE_TAB_CONFIGS[1].value]: active,
      [RELEASE_TAB_CONFIGS[2].value]: completed,
      [RELEASE_TAB_CONFIGS[3].value]: archived,
    }),
    [upcoming, active, completed, archived]
  );

  const tabs: TabConfig[] = useMemo(() => 
    RELEASE_TAB_CONFIGS.map((tabConfig) => {
      const releases = tabDataMap[tabConfig.value];
      return {
        value: tabConfig.value,
        label: tabConfig.label,
        icon: tabConfig.icon,
        count: releases.length,
      };
    }),
    [tabDataMap]
  );

  return (
    <StandardizedTabs
      activeTab={activeTab}
      onTabChange={onTabChange}
      tabs={tabs}
      tabFontSize="sm"
    >
      {RELEASE_TAB_CONFIGS.map((tabConfig) => {
        const releases = tabDataMap[tabConfig.value];

        return (
          <Tabs.Panel key={tabConfig.value} value={tabConfig.value}>
            <ReleasesTabPanel
              releases={releases}
              org={org}
              emptyMessage={tabConfig.emptyMessage}
              tabValue={tabConfig.value}
            />
          </Tabs.Panel>
        );
      })}
    </StandardizedTabs>
  );
});

