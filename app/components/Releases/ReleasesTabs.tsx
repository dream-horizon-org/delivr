/**
 * Releases Tabs Component
 * Tab navigation and panels for releases list
 */

import { memo, useMemo, type ReactNode } from 'react';
import { Tabs, Group, Box } from '@mantine/core';
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
  rightSection?: ReactNode;
}

export const ReleasesTabs = memo(function ReleasesTabs({
  activeTab,
  onTabChange,
  upcoming,
  active,
  completed,
  archived,
  org,
  rightSection,
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
      <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="md" >
        <Box style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
          <Box
            style={{
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollbarWidth: 'thin',
              width: 'max-content',
            }}
          >
            <Tabs.List style={{ flexWrap: 'nowrap', minWidth: 'max-content' }}>
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
          </Box>
        </Box>
        {rightSection && (
          <Box style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
            {rightSection}
          </Box>
        )}
      </Group>

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

