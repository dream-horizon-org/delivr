import { Router } from 'express';
import * as storeControllers from '../controllers/integrations/store-controllers';
import * as validateStore from '../middleware/validate-store';
import { fileUploadMiddleware } from '../file-upload-manager';
import * as tenantPermissions from '../middleware/tenant-permissions';
import * as releasePermissions from '../middleware/release-permissions';
import type { Storage } from '../storage/storage';
import { cronicleAuthMiddleware } from '../middleware/cronicle-auth.middleware';
  export function createStoreIntegrationRoutes( storage: Storage ): Router {
  const router = Router();

  // Verify store credentials (doesn't save to DB)
  router.post(
    '/integrations/store/verify',
    tenantPermissions.requireOwner({ storage }),
    validateStore.validateConnectStoreBody,
    storeControllers.verifyStore
  );

  // Connect store (create or update integration - only saves if verified)
  router.put(
    '/integrations/store/connect',
    tenantPermissions.requireOwner({ storage }),
    validateStore.validateConnectStoreBody,
    storeControllers.connectStore
  );

  // Update store integration (partial update - PATCH)
  router.patch(
    '/integrations/store/:integrationId',
    tenantPermissions.requireOwner({ storage }),
    validateStore.validateIntegrationId,
    validateStore.validatePatchStoreBodyByIntegrationId,
    storeControllers.patchStoreIntegration
  );

  // Get platform store type mappings
  router.get(
    '/integrations/store/platform-store-types',
    tenantPermissions.requireTenantMembership({ storage }),
    validateStore.validateGetPlatformStoreTypesQuery,
    storeControllers.getPlatformStoreTypes
  );

  // Get store integrations by tenant (grouped by platform)
  router.get(
    '/integrations/store/tenant/:tenantId',
    tenantPermissions.requireTenantMembership({ storage }),
    validateStore.validateTenantId,
    storeControllers.getStoreIntegrationsByTenant
  );

  // Revoke store integrations by tenant, storeType, and platform
  router.patch(
    '/integrations/store/tenant/:tenantId/revoke',
    tenantPermissions.requireOwner({ storage }),
    validateStore.validateTenantId,
    validateStore.validateRevokeStoreIntegrationsQuery,
    storeControllers.revokeStoreIntegrations
  );

  // Get store integration by ID
  router.get(
    '/integrations/store/:integrationId',
    tenantPermissions.requireTenantMembership({ storage }),
    validateStore.validateIntegrationId,
    storeControllers.getStoreIntegrationById
  );

  // Upload AAB to Play Store Internal track
  router.post(
    '/integrations/store/play-store/upload',  
    releasePermissions.requireReleaseOwner({ storage }),
    fileUploadMiddleware,
    validateStore.validatePlayStoreUploadBody,
    storeControllers.uploadAabToPlayStore
  );

  // Get Play Store supported languages/listings
  router.get(
    '/integrations/store/play-store/listings',
    tenantPermissions.requireTenantMembership({ storage }),
    validateStore.validatePlayStoreListingsQuery,
    storeControllers.getPlayStoreListings
  );

  // NOTE: Production state route removed - mounted separately in default-server.ts
  // to avoid auth.authenticate middleware (uses only cronicleAuthMiddleware)

  return router;
}

/**
 * Create store production state route (internal, uses cronicleAuthMiddleware only)
 * 
 * This route is mounted separately in default-server.ts with /api/v1 prefix
 * but WITHOUT auth.authenticate middleware, so it only uses cronicleAuthMiddleware.
 * 
 * @param storage - Storage instance
 * @returns Express Router with production state route
 */
export function createStoreProductionStateRoute(storage: Storage): Router {
  const router = Router();

  // Get Play Store production state for a submission
  router.get(
    '/integrations/store/play-store/production-state',
    cronicleAuthMiddleware,
    validateStore.validatePlayStoreProductionStateQuery,
    storeControllers.getPlayStoreProductionState
  );

  return router;
}

