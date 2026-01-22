/**
 * Workflow Filters Constants
 * Filter options for workflows list page
 */

import { PLATFORMS, BUILD_ENVIRONMENTS } from '~/types/release-config-constants';
import { PLATFORM_LABELS, ENVIRONMENT_LABELS } from '~/constants/release-config-ui';

/**
 * Platform Filter Options
 */
export const PLATFORM_FILTERS = {
  ALL: 'all',
  ANDROID: PLATFORMS.ANDROID,
  IOS: PLATFORMS.IOS,
} as const;

export type PlatformFilter = typeof PLATFORM_FILTERS[keyof typeof PLATFORM_FILTERS];

export const PLATFORM_FILTER_OPTIONS = [
  { value: PLATFORM_FILTERS.ALL, label: 'All Platforms' },
  { value: PLATFORM_FILTERS.ANDROID, label: PLATFORM_LABELS.ANDROID },
  { value: PLATFORM_FILTERS.IOS, label: PLATFORM_LABELS.IOS },
] as const;

/**
 * Build Environment Filter Options
 */
export const BUILD_ENVIRONMENT_FILTERS = {
  ALL: 'all',
  PRE_REGRESSION: BUILD_ENVIRONMENTS.PRE_REGRESSION,
  REGRESSION: BUILD_ENVIRONMENTS.REGRESSION,
  TESTFLIGHT: BUILD_ENVIRONMENTS.TESTFLIGHT,
  AAB_BUILD: BUILD_ENVIRONMENTS.AAB_BUILD,
} as const;

export type BuildEnvironmentFilter = typeof BUILD_ENVIRONMENT_FILTERS[keyof typeof BUILD_ENVIRONMENT_FILTERS];

export const BUILD_ENVIRONMENT_FILTER_OPTIONS = [
  { value: BUILD_ENVIRONMENT_FILTERS.ALL, label: 'All Environments' },
  { value: BUILD_ENVIRONMENT_FILTERS.PRE_REGRESSION, label: ENVIRONMENT_LABELS.PRE_REGRESSION },
  { value: BUILD_ENVIRONMENT_FILTERS.REGRESSION, label: ENVIRONMENT_LABELS.REGRESSION },
  { value: BUILD_ENVIRONMENT_FILTERS.TESTFLIGHT, label: ENVIRONMENT_LABELS.TESTFLIGHT },
  { value: BUILD_ENVIRONMENT_FILTERS.AAB_BUILD, label: ENVIRONMENT_LABELS.AAB_BUILD },
] as const;

