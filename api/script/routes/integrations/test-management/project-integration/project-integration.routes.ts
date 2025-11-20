import { Router } from 'express';
import { createTestManagementIntegrationController } from '~controllers/integrations/test-management/project-integration';
import type { TestManagementIntegrationService } from '~services/integrations/test-management/project-integration';

export const createProjectIntegrationRoutes = (service: TestManagementIntegrationService): Router => {
  const router = Router();
  const controller = createTestManagementIntegrationController(service);

  // List available providers (no authentication needed - public info)
  router.get(
    '/providers',
    controller.getAvailableProviders
  );

  // Create integration for a project (need projectId)
  router.post(
    '/projects/:projectId/integrations',
    controller.createIntegration
  );

  // List all integrations for a project (need projectId)
  router.get(
    '/projects/:projectId/integrations',
    controller.listIntegrations
  );

  // Get specific integration (integrationId is enough)
  router.get(
    '/integrations/:integrationId',
    controller.getIntegration
  );

  // Update specific integration (integrationId is enough)
  router.put(
    '/integrations/:integrationId',
    controller.updateIntegration
  );

  // Delete specific integration (integrationId is enough)
  router.delete(
    '/integrations/:integrationId',
    controller.deleteIntegration
  );

  // Verify integration credentials (integrationId is enough)
  router.post(
    '/integrations/:integrationId/verify',
    controller.verifyIntegration
  );

  return router;
};
