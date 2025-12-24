/**
 * Test Management Config Routes
 * API endpoints for test management configurations
 */

import { Router } from 'express';
import { createTestManagementConfigController } from '~controllers/integrations/test-management/test-management-config';
import type { TestManagementConfigService } from '~services/integrations/test-management/test-management-config';
import type { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';

/**
 * Create test management config routes
 * Clean REST pattern: tenantId only for CREATE and LIST
 */
export const createTestManagementConfigRoutes = (
  service: TestManagementConfigService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createTestManagementConfigController(service);

  // Create config for a tenant (need tenantId)
  router.post(
    '/tenants/:tenantId/configs',
    tenantPermissions.requireEditor({ storage }),
    controller.createConfig
  );

  // List all configs for a tenant (need tenantId)
  router.get(
    '/tenants/:tenantId/configs',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.listConfigsByTenant
  );

  // Get specific config (configId is enough)
  router.get(
    '/configs/:id',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getConfigById
  );

  // Update specific config (configId is enough)
  router.put(
    '/configs/:id',
    tenantPermissions.requireEditor({ storage }),
    controller.updateConfig
  );

  // Delete specific config (configId is enough)
  router.delete(
    '/configs/:id',
    tenantPermissions.requireEditor({ storage }),
    controller.deleteConfig
  );

  return router;
};

