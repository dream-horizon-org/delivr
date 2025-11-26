import { Router } from 'express';
import { createProjectManagementIntegrationController } from '~controllers/integrations/project-management/integration/integration.controller';
import type { ProjectManagementIntegrationService } from '~services/integrations/project-management';

export const createIntegrationRoutes = (
  service: ProjectManagementIntegrationService
): Router => {
  const router = Router();
  const controller = createProjectManagementIntegrationController(service);

  // List available providers (public info)
  router.get('/integrations/project-management/providers', controller.getAvailableProviders);

  // Verify credentials without saving (stateless)
  router.post(
    '/tenants/:tenantId/integrations/project-management/verify',
    controller.verifyCredentials
  );

  // CRUD operations for integrations
  router.post(
    '/tenants/:tenantId/integrations/project-management',
    controller.createIntegration
  );

  router.get(
    '/tenants/:tenantId/integrations/project-management',
    controller.listIntegrations
  );

  router.get(
    '/tenants/:tenantId/integrations/project-management/:integrationId',
    controller.getIntegration
  );

  router.put(
    '/tenants/:tenantId/integrations/project-management/:integrationId',
    controller.updateIntegration
  );

  router.delete(
    '/tenants/:tenantId/integrations/project-management/:integrationId',
    controller.deleteIntegration
  );

  router.post(
    '/tenants/:tenantId/integrations/project-management/:integrationId/verify',
    controller.verifyIntegration
  );

  return router;
};

