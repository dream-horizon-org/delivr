/**
 * Release Config Constants
 * Store integration validation mappings and bypass targets
 */

import { StoreType } from '~storage/integrations/store/store-types';

/**
 * Map target to storeType for store integration validation
 * Used to determine which store integration is required for a given target
 */
export const TARGET_TO_STORE_TYPE: Record<string, StoreType> = {
  'APP_STORE': StoreType.APP_STORE,
  'PLAY_STORE': StoreType.PLAY_STORE
} as const;

/**
 * Targets that don't require store integration validation
 * These targets can be used in platformTargets without needing a store integration
 */
export const TARGETS_BYPASS_STORE_INTEGRATION_VALIDATION: string[] = ['WEB'];

