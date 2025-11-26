import { Router, Request, Response, NextFunction } from 'express';
import { createProjectManagementIntegrationController } from '~controllers/integrations/project-management/integration/integration.controller';
import type { ProjectManagementIntegrationService } from '~services/integrations/project-management';
import type { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';


export const createIntegrationRoutes = (
  service: ProjectManagementIntegrationService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createProjectManagementIntegrationController(service);

  // List available providers (public info)
  router.get('/integrations/project-management/providers', controller.getAvailableProviders);

  // Verify credentials without saving (stateless)
  router.post(
    '/tenants/:tenantId/integrations/project-management/verify',
    tenantPermissions.requireOwner({ storage }),
    controller.verifyCredentials
  );

  // CRUD operations for integrations
  router.post(
    '/tenants/:tenantId/integrations/project-management',
    tenantPermissions.requireOwner({ storage }),
    controller.createIntegration
  );

  router.get(
    '/tenants/:tenantId/integrations/project-management',
    tenantPermissions.requireOwner({ storage }),
    controller.listIntegrations
  );

  router.get(
    '/tenants/:tenantId/integrations/project-management/:integrationId',
    tenantPermissions.requireOwner({ storage }),
    controller.getIntegration
  );

  router.put(
    '/tenants/:tenantId/integrations/project-management/:integrationId',
    tenantPermissions.requireOwner({ storage }),
    controller.updateIntegration
  );

  router.delete(
    '/tenants/:tenantId/integrations/project-management/:integrationId',
    tenantPermissions.requireOwner({ storage }),
    controller.deleteIntegration
  );

  router.post(
    '/tenants/:tenantId/integrations/project-management/:integrationId/verify',
    tenantPermissions.requireOwner({ storage }),
    controller.verifyIntegration
  );

  return router;
};

