/**
 * Tenant Metadata Constants
 * Single source of truth for tenant metadata transformation values
 */

import { PlatformName, TargetName, ReleaseType } from '~models/release/release.interface';
import { IntegrationStatus } from '~storage/integrations/store/store-types';

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

export const INTEGRATION_TYPE = {
  SCM: 'scm',
  CI_CD: 'cicd',
  TEST_MANAGEMENT: 'test_management',
  PROJECT_MANAGEMENT: 'project_management',
  APP_DISTRIBUTION: 'app_distribution',
  COMMUNICATION: 'communication',
} as const;

// ============================================================================
// COMMUNICATION TYPES
// ============================================================================

export const COMMUNICATION_TYPE = {
  SLACK: 'SLACK',
} as const;

// ============================================================================
// INTEGRATION STATUS VALUES
// ============================================================================

export const INTEGRATION_CONNECTION_STATUS = {
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
} as const;

export const INTEGRATION_VERIFICATION_STATUS = {
  UNKNOWN: 'UNKNOWN',
  NOT_VERIFIED: 'NOT_VERIFIED',
  VALID: 'VALID',
  INVALID: 'INVALID',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REVOKED: 'REVOKED',
} as const;

// ============================================================================
// PROVIDER IDS (lowercase for frontend)
// ============================================================================

export const PROVIDER_ID = {
  SLACK: 'slack',
  PLAY_STORE: 'play_store',
  APP_STORE: 'app_store',
} as const;

// ============================================================================
// PLATFORMS
// ============================================================================

export const TENANT_PLATFORMS = {
  ANDROID: PlatformName.ANDROID,
  IOS: PlatformName.IOS,
  WEB: PlatformName.WEB,
} as const;

// ============================================================================
// TARGETS
// ============================================================================

export const TENANT_TARGETS = {
  APP_STORE: TargetName.APP_STORE,
  PLAY_STORE: TargetName.PLAY_STORE,
  WEB: TargetName.WEB,
} as const;

// ============================================================================
// RELEASE TYPES
// ============================================================================

export const TENANT_RELEASE_TYPES = {
  MINOR: ReleaseType.MINOR,
  HOTFIX: ReleaseType.HOTFIX,
  MAJOR: ReleaseType.MAJOR,
} as const;

// ============================================================================
// SYSTEM USER
// ============================================================================

export const SYSTEM_USER = 'System';

