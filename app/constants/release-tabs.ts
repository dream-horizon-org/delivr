/**
 * Release Tabs Constants
 * Constants for release list page tabs
 * Active tab includes both RUNNING and PAUSED releases
 */

import { IconCalendar, IconRocket, IconCheck, TablerIcon } from '@tabler/icons-react';

export const RELEASE_TABS = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const;

export type ReleaseTabValue = typeof RELEASE_TABS[keyof typeof RELEASE_TABS];

export interface ReleaseTabConfig {
  value: ReleaseTabValue;
  label: string;
  icon: TablerIcon;
  emptyMessage: string;
}

export const RELEASE_TAB_CONFIGS: ReleaseTabConfig[] = [
  {
    value: RELEASE_TABS.UPCOMING,
    label: 'Upcoming',
    icon: IconCalendar,
    emptyMessage: 'No upcoming releases',
  },
  {
    value: RELEASE_TABS.ACTIVE,
    label: 'Active',
    icon: IconRocket,
    emptyMessage: 'No active releases',
  },
  {
    value: RELEASE_TABS.COMPLETED,
    label: 'Completed',
    icon: IconCheck,
    emptyMessage: 'No completed releases',
  },
] as const;

