/**
 * Releases Tabs Component
 * Tab navigation and panels for releases list
 */

import { memo, useMemo, type ReactNode } from 'react';
import { Tabs } from '@mantine/core';
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
  leftSection?: ReactNode;
}

export const ReleasesTabs = memo(function ReleasesTabs({
  activeTab,
  onTabChange,
  upcoming,
  active,
  completed,
  archived,
  org,
  leftSection,
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

  return (
    <Tabs value={activeTab} onChange={onTabChange}>
      <div className="flex items-center justify-between mb-6">
        {leftSection || <div style={{ flex: 1 }} />}
        <Tabs.List>
          {RELEASE_TAB_CONFIGS.map((tabConfig) => {
            const releases = tabDataMap[tabConfig.value];
            const Icon = tabConfig.icon;

            return (
              <Tabs.Tab
                key={tabConfig.value}
                value={tabConfig.value}
                leftSection={<Icon size={16} />}
              >
                {tabConfig.label} ({releases.length})
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </div>

      {RELEASE_TAB_CONFIGS.map((tabConfig) => {
        const releases = tabDataMap[tabConfig.value];

        return (
          <Tabs.Panel key={tabConfig.value} value={tabConfig.value}>
            <ReleasesTabPanel
              releases={releases}
              org={org}
              emptyMessage={tabConfig.emptyMessage}
            />
          </Tabs.Panel>
        );
      })}
    </Tabs>
  );
});

