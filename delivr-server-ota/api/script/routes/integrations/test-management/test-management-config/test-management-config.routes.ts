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
 * Clean REST pattern: appId in ALL routes for consistency
 */
export const createTestManagementConfigRoutes = (
  service: TestManagementConfigService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createTestManagementConfigController(service);

  // Create config for a tenant
  router.post(
    '/apps/:appId/test-management/configs',
    tenantPermissions.requireEditor({ storage }),
    controller.createConfig
  );

  // List all configs for an app
  router.get(
    '/apps/:appId/test-management/configs',
    tenantPermissions.requireAppMembership({ storage }),
    controller.listConfigsByApp
  );

  // Get specific config
  router.get(
    '/apps/:appId/test-management/configs/:id',
    tenantPermissions.requireAppMembership({ storage }),
    controller.getConfigById
  );

  // Update specific config
  router.put(
    '/apps/:appId/test-management/configs/:id',
    tenantPermissions.requireEditor({ storage }),
    controller.updateConfig
  );

  // Delete specific config
  router.delete(
    '/apps/:appId/test-management/configs/:id',
    tenantPermissions.requireEditor({ storage }),
    controller.deleteConfig
  );

  return router;
};

