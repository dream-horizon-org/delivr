/**
 * ReleaseStageStepper Constants
 * 
 * NOTE: These are simplified/temporary constants for Pre-Release/Distribution testing.
 * Full stages (Development → QA → Regression → Pre-Release → Distribution) 
 * will be implemented by colleague working on release process.
 * Eventually, stage configuration should come from API.
 */

import type { Icon } from '@tabler/icons-react';
import {
    IconCode,
    IconGitBranch,
    IconPackage,
    IconRocket,
    IconTestPipe,
} from '@tabler/icons-react';
import type { ReleaseStage } from './ReleaseStageStepper.types';

// Icon mapping - icons are not serializable from API
export const ICON_MAP: Record<string, Icon> = {
  code: IconCode,
  test: IconTestPipe,
  branch: IconGitBranch,
  package: IconPackage,
  rocket: IconRocket,
} as const;

// Simplified stages for Pre-Release/Distribution testing
// Full stages will be implemented later
export const DEFAULT_STAGES: ReleaseStage[] = [
  {
    key: 'PENDING',
    label: 'Pending',
    description: 'Prior stages complete',
    iconName: 'code',
    isNavigable: false,
  },
  {
    key: 'PRE_RELEASE',
    label: 'Pre-Release',
    description: 'Build preparation & PM approval',
    iconName: 'package',
    isNavigable: true,
    navigationPath: 'distribution?tab=pre-release',
  },
  {
    key: 'DISTRIBUTION',
    label: 'Distribution',
    description: 'Store submission & rollout',
    iconName: 'rocket',
    isNavigable: true,
    navigationPath: 'distribution?tab=distribution',
  },
];

// Simplified status mapping for testing
// Maps release statuses to simplified 3-stage UI
export const STATUS_TO_STAGE_INDEX: Record<string, number> = {
  // All prior stages map to "Pending" (index 0)
  IN_PROGRESS: 0,
  REGRESSION: 0,
  // Pre-Release stage (index 1)
  PRE_RELEASE: 1,
  // Distribution stage (index 2)
  READY_FOR_SUBMISSION: 2,
  // Completed (beyond last step)
  COMPLETED: 3,
  ARCHIVED: 3,
} as const;

