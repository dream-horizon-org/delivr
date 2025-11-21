import { Router } from 'express';
import { createTestManagementIntegrationController } from '~controllers/integrations/test-management/tenant-integration';
import type { TestManagementIntegrationService } from '~services/integrations/test-management/tenant-integration';

export const createTenantIntegrationRoutes = (service: TestManagementIntegrationService): Router => {
  const router = Router();
  const controller = createTestManagementIntegrationController(service);

  // List available providers (no authentication needed - public info)
  router.get(
    '/providers',
    controller.getAvailableProviders
  );

  // Verify credentials without saving (stateless - no tenantId or integrationId needed)
  router.post(
    '/integrations/verify',
    controller.verifyCredentials
  );

  // Create integration for a tenant (need tenantId)
  router.post(
    '/tenants/:tenantId/integrations',
    controller.createIntegration
  );

  // List all integrations for a tenant (need tenantId)
  router.get(
    '/tenants/:tenantId/integrations',
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
