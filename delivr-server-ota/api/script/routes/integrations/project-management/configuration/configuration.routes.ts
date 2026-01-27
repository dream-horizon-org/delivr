import { Router } from 'express';
import { createProjectManagementConfigController } from '~controllers/integrations/project-management/configuration/configuration.controller';
import type { ProjectManagementConfigService } from '~services/integrations/project-management';
import type { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';

export const createConfigurationRoutes = (
  service: ProjectManagementConfigService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createProjectManagementConfigController(service);

  router.post(
    '/apps/:appId/project-management/configs',
    tenantPermissions.requireEditor({ storage }),
    controller.createConfig
  );

  router.get(
    '/apps/:appId/project-management/configs',
    tenantPermissions.requireAppMembership({ storage }),
    controller.listConfigs
  );

  router.get(
    '/apps/:appId/project-management/configs/:configId',
    tenantPermissions.requireAppMembership({ storage }),
    controller.getConfig
  );

  router.put(
    '/apps/:appId/project-management/configs/:configId',
    tenantPermissions.requireEditor({ storage }),
    controller.updateConfig
  );

  router.delete(
    '/apps/:appId/project-management/configs/:configId',
    tenantPermissions.requireEditor({ storage }),
    controller.deleteConfig
  );

  router.post(
    '/apps/:appId/project-management/configs/:configId/verify',
    tenantPermissions.requireEditor({ storage }),
    controller.verifyConfig
  );

  return router;
};

