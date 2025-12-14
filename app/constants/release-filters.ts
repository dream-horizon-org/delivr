/**
 * Release Filters Constants
 * Filter options for releases list page
 */

import { Phase } from '~/types/release-process-enums';

/**
 * Build Mode Filter Options
 */
export const BUILD_MODE_FILTERS = {
  ALL: 'all',
  MANUAL: 'manual',
  CI_CD: 'ci_cd',
} as const;

export type BuildModeFilter = typeof BUILD_MODE_FILTERS[keyof typeof BUILD_MODE_FILTERS];

export const BUILD_MODE_FILTER_OPTIONS = [
  { value: BUILD_MODE_FILTERS.ALL, label: 'All Modes' },
  { value: BUILD_MODE_FILTERS.MANUAL, label: 'Manual' },
  { value: BUILD_MODE_FILTERS.CI_CD, label: 'CI/CD' },
] as const;

/**
 * Stage Filter Options
 * Grouped phases into logical stages
 */
export const STAGE_FILTERS = {
  ALL: 'all',
  KICKOFF: 'kickoff',
  REGRESSION: 'regression',
  POST_REGRESSION: 'post_regression',
  SUBMISSION: 'submission',
  COMPLETED: 'completed',
} as const;

export type StageFilter = typeof STAGE_FILTERS[keyof typeof STAGE_FILTERS];

export const STAGE_FILTER_OPTIONS = [
  { value: STAGE_FILTERS.ALL, label: 'All Stages' },
  { value: STAGE_FILTERS.KICKOFF, label: 'Kickoff' },
  { value: STAGE_FILTERS.REGRESSION, label: 'Regression' },
  { value: STAGE_FILTERS.POST_REGRESSION, label: 'Post-Regression' },
  { value: STAGE_FILTERS.SUBMISSION, label: 'Submission' },
  { value: STAGE_FILTERS.COMPLETED, label: 'Completed' },
] as const;

/**
 * Map stage filter to Phase enum values
 */
export const STAGE_FILTER_TO_PHASES: Record<StageFilter, Phase[]> = {
  [STAGE_FILTERS.ALL]: [], // Empty means all phases
  [STAGE_FILTERS.KICKOFF]: [Phase.KICKOFF],
  [STAGE_FILTERS.REGRESSION]: [
    Phase.REGRESSION,
    Phase.REGRESSION_AWAITING_NEXT_CYCLE,
    Phase.AWAITING_REGRESSION,
  ],
  [STAGE_FILTERS.POST_REGRESSION]: [
    Phase.POST_REGRESSION,
    Phase.AWAITING_POST_REGRESSION,
  ],
  [STAGE_FILTERS.SUBMISSION]: [
    Phase.SUBMISSION,
    Phase.AWAITING_SUBMISSION,
    Phase.SUBMITTED_PENDING_APPROVAL,
  ],
  [STAGE_FILTERS.COMPLETED]: [Phase.COMPLETED, Phase.ARCHIVED],
};


