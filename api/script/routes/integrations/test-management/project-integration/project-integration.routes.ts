import { Router } from 'express';
import { createTestManagementIntegrationController } from '~controllers/integrations/test-management/project-integration';
import type { TestManagementIntegrationService } from '~services/integrations/test-management/project-integration';

export const createProjectIntegrationRoutes = (service: TestManagementIntegrationService): Router => {
  const router = Router();
  const controller = createTestManagementIntegrationController(service);

  // List available providers (no authentication needed - public info)
  router.get(
    '/integrations/test-management/providers',
    controller.getAvailableProviders
  );

  router.post(
    '/projects/:projectId/integrations/test-management',
    controller.createIntegration
  );

  router.get(
    '/projects/:projectId/integrations/test-management',
    controller.listIntegrations
  );

  router.get(
    '/projects/:projectId/integrations/test-management/:integrationId',
    controller.getIntegration
  );

  router.put(
    '/projects/:projectId/integrations/test-management/:integrationId',
    controller.updateIntegration
  );

  router.delete(
    '/projects/:projectId/integrations/test-management/:integrationId',
    controller.deleteIntegration
  );

  router.post(
    '/projects/:projectId/integrations/test-management/:integrationId/verify',
    controller.verifyIntegration
  );

  return router;
};
