import { Router } from 'express';
import { createProjectManagementConfigController } from '~controllers/integrations/project-management/configuration/configuration.controller';
import type { ProjectManagementConfigService } from '~services/integrations/project-management';

export const createConfigurationRoutes = (service: ProjectManagementConfigService): Router => {
  const router = Router();
  const controller = createProjectManagementConfigController(service);

  router.post('/tenants/:tenantId/project-management/configs', controller.createConfig);

  router.get('/tenants/:tenantId/project-management/configs', controller.listConfigs);

  router.get('/tenants/:tenantId/project-management/configs/:configId', controller.getConfig);

  router.put('/tenants/:tenantId/project-management/configs/:configId', controller.updateConfig);

  router.delete(
    '/tenants/:tenantId/project-management/configs/:configId',
    controller.deleteConfig
  );

  router.post(
    '/tenants/:tenantId/project-management/configs/:configId/verify',
    controller.verifyConfig
  );

  return router;
};

