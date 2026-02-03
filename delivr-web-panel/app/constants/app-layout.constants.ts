/**
 * Default shapes for app layout loader (initialAppConfig / TenantConfig).
 * Used when building tenant config (top-level fields) from backend config in dashboard.$org loader.
 */

/** Empty connected integrations by category (fallback when config is missing). */
export const DEFAULT_EMPTY_CONNECTED_INTEGRATIONS = {
  SOURCE_CONTROL: [],
  COMMUNICATION: [],
  CI_CD: [],
  TEST_MANAGEMENT: [],
  PROJECT_MANAGEMENT: [],
  APP_DISTRIBUTION: [],
} as const;

/** Default tenant config fields (empty arrays) for merging with backend config. */
export const DEFAULT_RELEASE_MANAGEMENT = {
  connectedIntegrations: DEFAULT_EMPTY_CONNECTED_INTEGRATIONS,
  enabledPlatforms: [] as string[],
  enabledTargets: [] as string[],
  allowedReleaseTypes: [] as string[],
} as const;
