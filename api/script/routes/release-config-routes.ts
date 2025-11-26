/**
 * Release Configuration Routes
 * API endpoints for release configuration management
 */

import { Router } from 'express';
import { createReleaseConfigController } from '~controllers/release-configs';
import type { ReleaseConfigService } from '~services/release-configs';
import * as tenantPermissions from '../middleware/tenant-permissions';
import { Storage } from '../storage/storage';

/**
 * Create release configuration routes
 */
export const createReleaseConfigRoutes = (
  service: ReleaseConfigService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createReleaseConfigController(service);

  // Create release config
  router.post(
    '/tenants/:tenantId/release-configs',
    tenantPermissions.requireOwner({ storage }),
    controller.createConfig
  );

  // List configs by tenant
  router.get(
    '/tenants/:tenantId/release-configs',
    tenantPermissions.requireOwner({ storage }),
    controller.listConfigsByTenant
  );

  // Get config by ID
  router.get(
    '/tenants/:tenantId/release-configs/:configId',
    tenantPermissions.requireOwner({ storage }),
    controller.getConfigById
  );

  // Update config
  router.put(
    '/tenants/:tenantId/release-configs/:configId',
    tenantPermissions.requireOwner({ storage }),
    controller.updateConfig
  );

  // Delete config
  router.delete(
    '/tenants/:tenantId/release-configs/:configId',
    tenantPermissions.requireOwner({ storage }),
    controller.deleteConfig
  );

  return router;
};
