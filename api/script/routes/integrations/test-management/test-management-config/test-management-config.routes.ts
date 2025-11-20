/**
 * Test Management Config Routes
 * API endpoints for test management configurations
 */

import { Router } from 'express';
import { createTestManagementConfigController } from '~controllers/integrations/test-management/test-management-config';
import type { TestManagementConfigService } from '~services/integrations/test-management/test-management-config';

/**
 * Create test management config routes
 */
export const createTestManagementConfigRoutes = (
  service: TestManagementConfigService
): Router => {
  const router = Router();
  const controller = createTestManagementConfigController(service);

  // Create config
  router.post('/', controller.createConfig);

  // List configs by project
  router.get('/', controller.listConfigsByProject);

  // Get config by ID
  router.get('/:id', controller.getConfigById);

  // Update config
  router.put('/:id', controller.updateConfig);

  // Delete config
  router.delete('/:id', controller.deleteConfig);

  return router;
};

