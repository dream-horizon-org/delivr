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
    '/tenants/:tenantId/project-management/configs',
    tenantPermissions.requireEditor({ storage }),
    controller.createConfig
  );

  router.get(
    '/tenants/:tenantId/project-management/configs',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.listConfigs
  );

  router.get(
    '/tenants/:tenantId/project-management/configs/:configId',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getConfig
  );

  router.put(
    '/tenants/:tenantId/project-management/configs/:configId',
    tenantPermissions.requireEditor({ storage }),
    controller.updateConfig
  );

  router.delete(
    '/tenants/:tenantId/project-management/configs/:configId',
    tenantPermissions.requireEditor({ storage }),
    controller.deleteConfig
  );

  router.post(
    '/tenants/:tenantId/project-management/configs/:configId/verify',
    tenantPermissions.requireEditor({ storage }),
    controller.verifyConfig
  );

  return router;
};

