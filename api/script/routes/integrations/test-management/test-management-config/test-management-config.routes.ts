/**
 * Test Management Config Routes
 * API endpoints for test management configurations
 */

import { Router } from 'express';
import { createTestManagementConfigController } from '~controllers/integrations/test-management/test-management-config';
import type { TestManagementConfigService } from '~services/integrations/test-management/test-management-config';

/**
 * Create test management config routes
 * Clean REST pattern: tenantId only for CREATE and LIST
 */
export const createTestManagementConfigRoutes = (
  service: TestManagementConfigService
): Router => {
  const router = Router();
  const controller = createTestManagementConfigController(service);

  // Create config for a tenant (need tenantId)
  router.post('/tenants/:tenantId/configs', controller.createConfig);

  // List all configs for a tenant (need tenantId)
  router.get('/tenants/:tenantId/configs', controller.listConfigsByTenant);

  // Get specific config (configId is enough)
  router.get('/configs/:id', controller.getConfigById);

  // Update specific config (configId is enough)
  router.put('/configs/:id', controller.updateConfig);

  // Delete specific config (configId is enough)
  router.delete('/configs/:id', controller.deleteConfig);

  return router;
};

