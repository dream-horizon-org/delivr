import { Router } from 'express';
import * as storeControllers from '../controllers/integrations/store-controllers';
import * as validateStore from '../middleware/validate-store';
import { fileUploadMiddleware } from '../file-upload-manager';
import * as tenantPermissions from '../middleware/tenant-permissions';
import * as releasePermissions from '../middleware/release-permissions';
import type { Storage } from '../storage/storage';
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
    tenantPermissions.requireAppMembership({ storage }),
    validateStore.validateGetPlatformStoreTypesQuery,
    storeControllers.getPlatformStoreTypes
  );

  // Get store integrations by tenant (grouped by platform)
  router.get(
    '/integrations/store/tenant/:appId',
    tenantPermissions.requireAppMembership({ storage }),
    validateStore.validateAppId,
    storeControllers.getStoreIntegrationsByApp
  );

  // Revoke store integrations by tenant, storeType, and platform
  router.patch(
    '/integrations/store/tenant/:appId/revoke',
    tenantPermissions.requireOwner({ storage }),
    validateStore.validateAppId,
    validateStore.validateRevokeStoreIntegrationsQuery,
    storeControllers.revokeStoreIntegrations
  );

  // Get store integration by ID
  router.get(
    '/integrations/store/:integrationId',
    tenantPermissions.requireAppMembership({ storage }),
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
    tenantPermissions.requireAppMembership({ storage }),
    validateStore.validatePlayStoreListingsQuery,
    storeControllers.getPlayStoreListings
  );

  // Get Play Store production state for a submission
  router.get(
    '/integrations/store/play-store/production-state',
    validateStore.validatePlayStoreProductionStateQuery,
    storeControllers.getPlayStoreProductionState
  );

  return router;
}

