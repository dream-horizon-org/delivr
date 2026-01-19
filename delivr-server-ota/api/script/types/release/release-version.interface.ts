/**
 * Release Version Types
 * Types for version validation and resolution
 */

import { RELEASE_TYPE } from '~services/release/release-version.constants';

/**
 * Release type (MAJOR, MINOR, HOTFIX)
 */
export type ReleaseType = typeof RELEASE_TYPE[keyof typeof RELEASE_TYPE];

/**
 * Result of version validation
 */
export type VersionValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Suggested next versions for all release types
 */
export type NextVersionSuggestions = {
  MAJOR: string;
  MINOR: string;
  HOTFIX: string;
};

/**
 * Result of getNextVersions - includes current version and suggestions
 */
export type NextVersionsResult = {
  currentVersion: string | null;
  nextVersions: NextVersionSuggestions | null;
};

/**
 * Platform type
 */
export type Platform = 'ANDROID' | 'IOS' | 'WEB';

/**
 * Target type
 */
export type Target = 'WEB' | 'PLAY_STORE' | 'APP_STORE';

