import { Router } from 'express';
import { createCommConfigController } from '~controllers/integrations/comm/comm-config';
import type { CommConfigService } from '~services/integrations/comm/comm-config';

export const createCommConfigRoutes = (service: CommConfigService): Router => {
  const router = Router();
  const controller = createCommConfigController(service);

  // Create config for a tenant (need tenantId)
  router.post(
    '/tenants/:tenantId/configs',
    controller.createConfig
  );

  // List all configs for a tenant (need tenantId)
  router.get(
    '/tenants/:tenantId/configs',
    controller.listConfigs
  );

  // Get specific config (configId is enough)
  router.get(
    '/configs/:configId',
    controller.getConfig
  );

  // Update specific config (configId is enough)
  router.put(
    '/configs/:configId',
    controller.updateConfig
  );

  // Delete specific config (configId is enough)
  router.delete(
    '/configs/:configId',
    controller.deleteConfig
  );

  return router;
};
