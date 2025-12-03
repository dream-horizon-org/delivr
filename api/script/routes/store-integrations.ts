import { Router } from 'express';
import * as storeControllers from '../controllers/integrations/store-controllers';
import * as validateStore from '../middleware/validate-store';

export function createStoreIntegrationRoutes(): Router {
  const router = Router();

  // Verify store credentials (doesn't save to DB)
  router.post(
    '/integrations/store/verify',
    validateStore.validateConnectStoreBody,
    storeControllers.verifyStore
  );

  // Connect store (create or update integration - only saves if verified)
  router.put(
    '/integrations/store/connect',
    validateStore.validateConnectStoreBody,
    storeControllers.connectStore
  );

  // Update store integration (partial update - PATCH)
  router.patch(
    '/integrations/store/:integrationId',
    validateStore.validateIntegrationId,
    validateStore.validatePatchStoreBodyByIntegrationId,
    storeControllers.patchStoreIntegration
  );

  // Get platform store type mappings
  router.get(
    '/integrations/store/platform-store-types',
    validateStore.validateGetPlatformStoreTypesQuery,
    storeControllers.getPlatformStoreTypes
  );

  // Get store integrations by tenant (grouped by platform)
  router.get(
    '/integrations/store/tenant/:tenantId',
    validateStore.validateTenantId,
    storeControllers.getStoreIntegrationsByTenant
  );

  // Revoke store integrations by tenant, storeType, and platform
  router.patch(
    '/integrations/store/tenant/:tenantId/revoke',
    validateStore.validateTenantId,
    validateStore.validateRevokeStoreIntegrationsQuery,
    storeControllers.revokeStoreIntegrations
  );

  // Get store integration by ID
  router.get(
    '/integrations/store/:integrationId',
    validateStore.validateIntegrationId,
    storeControllers.getStoreIntegrationById
  );

  return router;
}

