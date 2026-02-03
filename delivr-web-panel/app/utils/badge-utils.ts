/**
 * Badge Utility
 * Provides standardized colors, sizes, and configurations for badges across the app
 * 
 * Ensures consistent badge styling: all platform badges use the same color,
 * all target badges use the same color, etc.
 */

import { 
  PLATFORMS, 
  TARGET_PLATFORMS, 
  BUILD_ENVIRONMENTS, 
  BUILD_PROVIDERS, 
  INTEGRATION_TYPES,
  RELEASE_TYPES,
} from '~/types/release-config-constants';
import type { Platform, TargetPlatform, BuildEnvironment, BuildProvider } from '~/types/release-config';
import { BuildType, WorkflowStatus } from '~/types/release-process-enums';
import type { StoreType } from '~/types/distribution/app-distribution';

// Store Type Constants (matching STORE_TYPES array from app-distribution.ts)
const STORE_TYPE_CONSTANTS = {
  PLAY_STORE: 'PLAY_STORE' as const,
  APP_STORE: 'APP_STORE' as const,
  TESTFLIGHT: 'TESTFLIGHT' as const,
  FIREBASE: 'FIREBASE' as const,
  MICROSOFT_STORE: 'MICROSOFT_STORE' as const,
} as const;

// CI/CD Status Constants (matching WorkflowStatus enum + QUEUED)
const CICD_STATUS_CONSTANTS = {
  RUNNING: WorkflowStatus.RUNNING,
  QUEUED: 'QUEUED' as const, // Not in WorkflowStatus enum, but used in UI
  FAILED: WorkflowStatus.FAILED,
  COMPLETED: WorkflowStatus.COMPLETED,
} as const;

// ============================================================================
// Badge Type Definitions
// ============================================================================

export type BadgeType = 
  | 'platform'
  | 'target'
  | 'platform-target'
  | 'build-environment'
  | 'build-provider'
  | 'store-type'
  | 'build-type'
  | 'cicd-status'
  | 'integration-type'
  | 'status'
  | 'release-type';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type BadgeVariant = 'light' | 'filled' | 'outline' | 'dot';

// ============================================================================
// Standardized Badge Colors
// ============================================================================

export const BADGE_COLORS = {
  // Platform Colors - Green/Blue/Cyan family
  // Platform-specific colors, overlap with targets is intentional (they're related)
  PLATFORM: {
    ANDROID: 'green',
    IOS: 'blue',
    WEB: 'cyan',
  },
  
  // Target Colors - Green/Blue/Cyan/Teal family
  // Matches platforms (intentional overlap - they represent the same platforms)
  // DOTA (Over-the-Air) uses teal for distinct OTA distribution
  TARGET: {
    PLAY_STORE: 'green',
    APP_STORE: 'blue',
    WEB: 'cyan',
    DOTA: 'teal',
  },
  
  // Build Environment Colors - Purple/Grape/Indigo family ONLY
  // Completely distinct purple family - no overlap with other categories
  BUILD_ENVIRONMENT: {
    PRE_REGRESSION: 'grape',
    REGRESSION: 'violet',
    TESTFLIGHT: 'indigo',
    AAB_BUILD: 'purple',         // Changed from slate to purple (purple family only)
  },
  
  // Build Provider Colors - Teal/Lime family ONLY
  // Completely distinct teal family - no overlap with other categories
  BUILD_PROVIDER: {
    JENKINS: 'teal',
    GITHUB_ACTIONS: 'lime',       // Changed from dark to lime (teal family)
    MANUAL_UPLOAD: 'cyan',       // Changed from slate to cyan (teal family)
  },
  
  // Store Type Colors - Orange/Amber family (except PLAY_STORE/APP_STORE which match platforms)
  // Orange family for distinct stores, green/blue for platform-matching stores
  STORE_TYPE: {
    PLAY_STORE: 'green',         // Matches platform (intentional)
    APP_STORE: 'blue',           // Matches platform (intentional)
    TESTFLIGHT: 'orange',        // Changed from indigo to orange (orange family)
    FIREBASE: 'amber',           // Changed from orange to amber (orange family)
    MICROSOFT_STORE: 'yellow',   // Changed from violet to yellow (orange/amber family)
  },
  
  // Build Type Colors - Slate/Gray family ONLY
  // Completely distinct gray family - no overlap with other categories
  BUILD_TYPE: {
    MANUAL: 'slate',
    CI_CD: 'gray',               // Changed from teal to gray (gray family only)
  },
  
  // CI/CD Status Colors - Semantic colors with distinct shades
  // Uses semantic colors but ensures no overlap with other categories
  CICD_STATUS: {
    RUNNING: 'blue',             // Semantic - active (only overlap is with platform/target which is OK)
    QUEUED: 'dark',              // Changed from slate to dark (distinct from build type)
    FAILED: 'red',               // Semantic - error (only overlap is with status error which is OK)
    COMPLETED: 'green',          // Semantic - success (only overlap is with status success which is OK)
  },
  
  // Integration Type Colors - Pink/Rose family ONLY
  // Completely distinct pink family - no overlap with other categories
  // Note: Both GITHUB (SCM) and GITHUB_ACTIONS (CI/CD) map to the same color
  INTEGRATION_TYPE: {
    JENKINS: 'pink',
    GITHUB: 'rose',              // SCM integration (INTEGRATION_TYPES.GITHUB)
    GITHUB_ACTIONS: 'rose',      // CI/CD provider (BUILD_PROVIDERS.GITHUB_ACTIONS) - same color as GITHUB
    SLACK: 'pink',               // Changed from violet to pink (pink family only)
    JIRA: 'rose',
    CHECKMATE: 'pink',           // Changed from orange to pink (pink family only)
  },
  
  // Status Colors - Semantic colors with distinct shades
  // Uses semantic colors but ensures minimal overlap
  STATUS: {
    SUCCESS: 'green',            // Semantic - success (overlap with platform/target/ci-cd is OK)
    ERROR: 'red',                // Semantic - error (overlap with ci-cd/release-type is OK)
    WARNING: 'yellow',           // Semantic - warning (overlap with store-type is OK)
    INFO: 'blue',                // Semantic - info (overlap with platform/target/ci-cd is OK)
    PENDING: 'dark',             // Changed from slate to dark (distinct from build type)
    NEUTRAL: 'dark',             // Changed from slate to dark (distinct from build type)
  },
  
  // Release Type Colors - Purple/Cyan/Red family
  // Distinct colors, red for hotfix is semantic (urgent)
  RELEASE_TYPE: {
    MAJOR: 'purple',             // Distinct (only overlap is with build environment grape, but different shade)
    MINOR: 'cyan',               // Distinct (only overlap is with platform/target web, but intentional)
    HOTFIX: 'red',               // Semantic - urgent (overlap with error status is OK - both indicate urgency)
  },
} as const;

// ============================================================================
// Standardized Badge Sizes by Type
// ============================================================================

export const BADGE_SIZES: Record<BadgeType, BadgeSize> = {
  'platform': 'sm',
  'target': 'sm',
  'platform-target': 'md',
  'build-environment': 'sm',
  'build-provider': 'sm',
  'store-type': 'sm',
  'build-type': 'sm',
  'cicd-status': 'sm',
  'integration-type': 'sm',
  'status': 'sm',
  'release-type': 'sm',
} as const;

// ============================================================================
// Standardized Badge Variants by Type
// ============================================================================

export const BADGE_VARIANTS: Record<BadgeType, BadgeVariant> = {
  'platform': 'light',
  'target': 'light',
  'platform-target': 'light',
  'build-environment': 'light',
  'build-provider': 'outline',
  'store-type': 'light',
  'build-type': 'light',
  'cicd-status': 'light',
  'integration-type': 'light',
  'status': 'light',
  'release-type': 'light',
} as const;

// ============================================================================
// Badge Utility Functions
// ============================================================================

/**
 * Get standardized color for a platform badge
 */
export function getPlatformBadgeColor(platform: Platform | string): string {
  const platformUpper = platform.toUpperCase();
  if (platformUpper === PLATFORMS.ANDROID) return BADGE_COLORS.PLATFORM.ANDROID;
  if (platformUpper === PLATFORMS.IOS) return BADGE_COLORS.PLATFORM.IOS;
  if (platformUpper === TARGET_PLATFORMS.WEB) return BADGE_COLORS.PLATFORM.WEB;
  return BADGE_COLORS.STATUS.NEUTRAL;
}

/**
 * Get standardized color for a target badge
 */
export function getTargetBadgeColor(target: TargetPlatform | string): string {
  const targetUpper = target.toUpperCase();
  if (targetUpper === TARGET_PLATFORMS.PLAY_STORE) return BADGE_COLORS.TARGET.PLAY_STORE;
  if (targetUpper === TARGET_PLATFORMS.APP_STORE) return BADGE_COLORS.TARGET.APP_STORE;
  if (targetUpper === TARGET_PLATFORMS.WEB) return BADGE_COLORS.TARGET.WEB;
  if (targetUpper === 'DOTA') return BADGE_COLORS.TARGET.DOTA;
  return BADGE_COLORS.STATUS.NEUTRAL;
}

/**
 * Get standardized color for a build environment badge
 */
export function getBuildEnvironmentBadgeColor(environment: BuildEnvironment | string): string {
  const envUpper = environment.toUpperCase();
  if (envUpper === BUILD_ENVIRONMENTS.PRE_REGRESSION) return BADGE_COLORS.BUILD_ENVIRONMENT.PRE_REGRESSION;
  if (envUpper === BUILD_ENVIRONMENTS.REGRESSION) return BADGE_COLORS.BUILD_ENVIRONMENT.REGRESSION;
  if (envUpper === BUILD_ENVIRONMENTS.TESTFLIGHT) return BADGE_COLORS.BUILD_ENVIRONMENT.TESTFLIGHT;
  if (envUpper === BUILD_ENVIRONMENTS.AAB_BUILD) return BADGE_COLORS.BUILD_ENVIRONMENT.AAB_BUILD;
  return BADGE_COLORS.STATUS.NEUTRAL;
}

/**
 * Get standardized color for a build provider badge
 */
export function getBuildProviderBadgeColor(provider: BuildProvider | string): string {
  const providerUpper = provider.toUpperCase();
  if (providerUpper === BUILD_PROVIDERS.JENKINS) return BADGE_COLORS.BUILD_PROVIDER.JENKINS;
  // GITHUB_ACTIONS (CI/CD) and GITHUB (SCM) both map to same color
  if (providerUpper === BUILD_PROVIDERS.GITHUB_ACTIONS || providerUpper === INTEGRATION_TYPES.GITHUB) {
    return BADGE_COLORS.BUILD_PROVIDER.GITHUB_ACTIONS;
  }
  if (providerUpper === BUILD_PROVIDERS.MANUAL_UPLOAD) return BADGE_COLORS.BUILD_PROVIDER.MANUAL_UPLOAD;
  return BADGE_COLORS.STATUS.NEUTRAL;
}

/**
 * Get standardized color for a store type badge
 */
export function getStoreTypeBadgeColor(storeType: string): string {
  const storeUpper = storeType.toUpperCase();
  if (storeUpper === TARGET_PLATFORMS.PLAY_STORE || storeUpper === STORE_TYPE_CONSTANTS.PLAY_STORE) {
    return BADGE_COLORS.STORE_TYPE.PLAY_STORE;
  }
  if (storeUpper === TARGET_PLATFORMS.APP_STORE || storeUpper === STORE_TYPE_CONSTANTS.APP_STORE) {
    return BADGE_COLORS.STORE_TYPE.APP_STORE;
  }
  if (storeUpper === STORE_TYPE_CONSTANTS.TESTFLIGHT) return BADGE_COLORS.STORE_TYPE.TESTFLIGHT;
  if (storeUpper === STORE_TYPE_CONSTANTS.FIREBASE) return BADGE_COLORS.STORE_TYPE.FIREBASE;
  if (storeUpper === STORE_TYPE_CONSTANTS.MICROSOFT_STORE) return BADGE_COLORS.STORE_TYPE.MICROSOFT_STORE;
  return BADGE_COLORS.STATUS.NEUTRAL;
}

/**
 * Get standardized color for a build type badge
 */
export function getBuildTypeBadgeColor(buildType: string | BuildType): string {
  const typeUpper = typeof buildType === 'string' ? buildType.toUpperCase() : buildType;
  if (typeUpper === BuildType.MANUAL) return BADGE_COLORS.BUILD_TYPE.MANUAL;
  if (typeUpper === BuildType.CI_CD) return BADGE_COLORS.BUILD_TYPE.CI_CD;
  return BADGE_COLORS.STATUS.NEUTRAL;
}

/**
 * Get standardized color for CI/CD status badge
 */
export function getCICDStatusBadgeColor(status: 'running' | 'queued' | 'failed' | 'completed' | string): string {
  const statusUpper = status.toUpperCase();
  if (statusUpper === CICD_STATUS_CONSTANTS.RUNNING) return BADGE_COLORS.CICD_STATUS.RUNNING;
  if (statusUpper === CICD_STATUS_CONSTANTS.QUEUED) return BADGE_COLORS.CICD_STATUS.QUEUED;
  if (statusUpper === CICD_STATUS_CONSTANTS.FAILED) return BADGE_COLORS.CICD_STATUS.FAILED;
  if (statusUpper === CICD_STATUS_CONSTANTS.COMPLETED) return BADGE_COLORS.CICD_STATUS.COMPLETED;
  return BADGE_COLORS.STATUS.NEUTRAL;
}

/**
 * Get standardized color for integration type badge
 * Handles both GITHUB (SCM integration) and GITHUB_ACTIONS (CI/CD provider)
 */
export function getIntegrationTypeBadgeColor(integrationType: string): string {
  const typeUpper = integrationType.toUpperCase();
  if (typeUpper === INTEGRATION_TYPES.JENKINS) return BADGE_COLORS.INTEGRATION_TYPE.JENKINS;
  // Both GITHUB (SCM) and GITHUB_ACTIONS (CI/CD) map to the same color (rose)
  if (typeUpper === INTEGRATION_TYPES.GITHUB || typeUpper === BUILD_PROVIDERS.GITHUB_ACTIONS) {
    return BADGE_COLORS.INTEGRATION_TYPE.GITHUB_ACTIONS || BADGE_COLORS.INTEGRATION_TYPE.GITHUB;
  }
  if (typeUpper === INTEGRATION_TYPES.SLACK) return BADGE_COLORS.INTEGRATION_TYPE.SLACK;
  if (typeUpper === INTEGRATION_TYPES.JIRA) return BADGE_COLORS.INTEGRATION_TYPE.JIRA;
  if (typeUpper === INTEGRATION_TYPES.CHECKMATE) return BADGE_COLORS.INTEGRATION_TYPE.CHECKMATE;
  return BADGE_COLORS.STATUS.NEUTRAL;
}

/**
 * Get standardized color for release type badge
 */
export function getReleaseTypeBadgeColor(releaseType: string): string {
  const typeUpper = releaseType.toUpperCase();
  if (typeUpper === RELEASE_TYPES.MAJOR) return BADGE_COLORS.RELEASE_TYPE.MAJOR;
  if (typeUpper === RELEASE_TYPES.MINOR) return BADGE_COLORS.RELEASE_TYPE.MINOR;
  if (typeUpper === RELEASE_TYPES.HOTFIX) return BADGE_COLORS.RELEASE_TYPE.HOTFIX;
  return BADGE_COLORS.STATUS.NEUTRAL;
}

/**
 * Get standardized badge configuration for a badge type
 */
export function getBadgeConfig(type: BadgeType, value?: string): {
  color: string;
  size: BadgeSize;
  variant: BadgeVariant;
} {
  let color: string = BADGE_COLORS.STATUS.NEUTRAL;
  
  if (type === 'platform' && value) {
    color = getPlatformBadgeColor(value);
  } else if (type === 'target' && value) {
    color = getTargetBadgeColor(value);
  } else if (type === 'build-environment' && value) {
    color = getBuildEnvironmentBadgeColor(value);
  } else if (type === 'build-provider' && value) {
    color = getBuildProviderBadgeColor(value);
  } else if (type === 'store-type' && value) {
    color = getStoreTypeBadgeColor(value);
  } else if (type === 'build-type' && value) {
    color = getBuildTypeBadgeColor(value);
  } else if (type === 'cicd-status' && value) {
    color = getCICDStatusBadgeColor(value);
  } else if (type === 'integration-type' && value) {
    color = getIntegrationTypeBadgeColor(value);
  } else if (type === 'release-type' && value) {
    color = getReleaseTypeBadgeColor(value);
  } else if (type === 'platform-target') {
    // For combined badges, use target-specific color if value (target) is provided
    if (value) {
      color = getTargetBadgeColor(value);
    } else {
      color = 'brand'; // Fallback to brand if no target specified
    }
  }
  
  return {
    color,
    size: BADGE_SIZES[type],
    variant: BADGE_VARIANTS[type],
  };
}

