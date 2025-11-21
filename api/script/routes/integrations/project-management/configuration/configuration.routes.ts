import { Router } from 'express';
import { createProjectManagementConfigController } from '~controllers/integrations/project-management/configuration/configuration.controller';
import type { ProjectManagementConfigService } from '~services/integrations/project-management';

export const createConfigurationRoutes = (service: ProjectManagementConfigService): Router => {
  const router = Router();
  const controller = createProjectManagementConfigController(service);

  router.post('/projects/:projectId/project-management/configs', controller.createConfig);

  router.get('/projects/:projectId/project-management/configs', controller.listConfigs);

  router.get('/projects/:projectId/project-management/configs/:configId', controller.getConfig);

  router.put('/projects/:projectId/project-management/configs/:configId', controller.updateConfig);

  router.delete(
    '/projects/:projectId/project-management/configs/:configId',
    controller.deleteConfig
  );

  router.post(
    '/projects/:projectId/project-management/configs/:configId/verify',
    controller.verifyConfig
  );

  return router;
};

