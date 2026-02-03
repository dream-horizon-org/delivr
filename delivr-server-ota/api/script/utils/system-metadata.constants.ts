/**
 * System Metadata Constants
 * Single source of truth for system metadata values returned by /system/metadata endpoint
 * 
 * These constants match frontend expectations and should be kept in sync.
 */

import { PlatformName, TargetName, ReleaseType, ReleaseStatus } from '~models/release/release.interface';

// ============================================================================
// PLATFORMS
// ============================================================================

export const SYSTEM_PLATFORMS = {
  ANDROID: {
    id: PlatformName.ANDROID,
    name: 'Android',
    applicableTargets: [TargetName.PLAY_STORE, TargetName.DOTA],
    isAvailable: true,
  },
  IOS: {
    id: PlatformName.IOS,
    name: 'iOS',
    applicableTargets: [TargetName.APP_STORE, TargetName.DOTA],
    isAvailable: false,
    status: 'COMING_SOON' as const,
  },
} as const;

// ============================================================================
// TARGETS
// ============================================================================

export const SYSTEM_TARGETS = {
  PLAY_STORE: {
    id: TargetName.PLAY_STORE,
    name: 'Play Store',
    isAvailable: true,
  },
  APP_STORE: {
    id: TargetName.APP_STORE,
    name: 'App Store',
    isAvailable: false,
    status: 'COMING_SOON' as const,
  },
  DOTA: {
    id: TargetName.DOTA,
    name: 'Over-the-Air',
    isAvailable: true,
  },
} as const;

// ============================================================================
// RELEASE TYPES
// ============================================================================

export const SYSTEM_RELEASE_TYPES = {
  MINOR: {
    id: ReleaseType.MINOR,
    name: 'Minor',
  },
  HOTFIX: {
    id: ReleaseType.HOTFIX,
    name: 'Hotfix',
  },
  MAJOR: {
    id: ReleaseType.MAJOR,
    name: 'Major',
  },
} as const;

// ============================================================================
// BUILD ENVIRONMENTS
// ============================================================================

export const BUILD_ENVIRONMENT = {
  PRE_REGRESSION: 'PRE_REGRESSION',
  REGRESSION: 'REGRESSION',
  TESTFLIGHT: 'TESTFLIGHT',
  AAB_BUILD: 'AAB_BUILD',
} as const;

export const SYSTEM_BUILD_ENVIRONMENTS = {
  PRE_REGRESSION: {
    id: BUILD_ENVIRONMENT.PRE_REGRESSION,
    name: 'Pre-Regression',
    order: 1,
    applicablePlatforms: [PlatformName.ANDROID, PlatformName.IOS],
  },
  REGRESSION: {
    id: BUILD_ENVIRONMENT.REGRESSION,
    name: 'Regression',
    order: 2,
    applicablePlatforms: [PlatformName.ANDROID, PlatformName.IOS],
  },
  TESTFLIGHT: {
    id: BUILD_ENVIRONMENT.TESTFLIGHT,
    name: 'TestFlight',
    order: 3,
    applicablePlatforms: [PlatformName.IOS],
  },
  AAB_BUILD: {
    id: BUILD_ENVIRONMENT.AAB_BUILD,
    name: 'AAB Build',
    order: 4,
    applicablePlatforms: [PlatformName.ANDROID],
  },
} as const;

// ============================================================================
// RELEASE STATUSES
// ============================================================================

export const SYSTEM_RELEASE_STATUSES = {
  PENDING: {
    id: ReleaseStatus.PENDING,
    name: 'Pending',
  },
  IN_PROGRESS: {
    id: ReleaseStatus.IN_PROGRESS,
    name: 'In Progress',
  },
  PAUSED: {
    id: ReleaseStatus.PAUSED,
    name: 'Paused',
  },
  SUBMITTED: {
    id: ReleaseStatus.SUBMITTED,
    name: 'Submitted',
  },
  COMPLETED: {
    id: ReleaseStatus.COMPLETED,
    name: 'Completed',
  },
  ARCHIVED: {
    id: ReleaseStatus.ARCHIVED,
    name: 'Archived',
  },
} as const;

// ============================================================================
// PROJECT MANAGEMENT PROVIDERS
// ============================================================================

export const PROJECT_MANAGEMENT_PROVIDER = {
  JIRA: 'jira',
  LINEAR: 'linear',
} as const;

export const SYSTEM_PROJECT_MANAGEMENT_PROVIDERS = {
  JIRA: {
    id: PROJECT_MANAGEMENT_PROVIDER.JIRA,
    name: 'Jira',
    requiresOAuth: false,
    isAvailable: true,
  },
  LINEAR: {
    id: PROJECT_MANAGEMENT_PROVIDER.LINEAR,
    name: 'Linear',
    requiresOAuth: false,
    isAvailable: false,
  },
} as const;

// ============================================================================
// APP DISTRIBUTION PROVIDERS
// ============================================================================

export const APP_DISTRIBUTION_PROVIDER = {
  APP_STORE: 'APP_STORE',
  PLAY_STORE: 'PLAY_STORE',
} as const;

export const SYSTEM_APP_DISTRIBUTION_PROVIDERS = {
  APP_STORE: {
    id: APP_DISTRIBUTION_PROVIDER.APP_STORE,
    name: 'App Store',
    requiresOAuth: false,
    isAvailable: true,
  },
  PLAY_STORE: {
    id: APP_DISTRIBUTION_PROVIDER.PLAY_STORE,
    name: 'Play Store',
    requiresOAuth: false,
    isAvailable: true,
  },
} as const;

// ============================================================================
// SYSTEM FEATURES
// ============================================================================

export const SYSTEM_FEATURES = {
  RELEASE_MANAGEMENT: 'releaseManagement',
  INTEGRATIONS: 'integrations',
} as const;

