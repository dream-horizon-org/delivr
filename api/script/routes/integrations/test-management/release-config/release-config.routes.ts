import { Router } from 'express';
import { createTestManagementConfigController } from '~controllers/integrations/test-management/release-config';
import type { TestManagementConfigService } from '~services/integrations/test-management/release-config.service';

/**
 * Create Release Config Test Management Routes
 * Pure UPSERT pattern - one configuration per release config
 */
export const createReleaseConfigRoutes = (service: TestManagementConfigService): Router => {
  const router = Router();
  const controller = createTestManagementConfigController(service);

  // Get configuration
  router.get(
    '/release-configs/:releaseConfigId/test-management',
    controller.getConfig
  );

  // Set/Update configuration (UPSERT)
  router.put(
    '/release-configs/:releaseConfigId/test-management',
    controller.setConfig
  );

  // Delete configuration
  router.delete(
    '/release-configs/:releaseConfigId/test-management',
    controller.deleteConfig
  );

  // Test status endpoints moved to test-run-operations routes

  return router;
};

