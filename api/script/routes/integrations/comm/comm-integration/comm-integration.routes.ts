import { Router } from 'express';
import { createCommIntegrationController } from '~controllers/integrations/comm/comm-integration';
import type { CommIntegrationService } from '~services/integrations/comm/comm-integration';

export const createCommIntegrationRoutes = (service: CommIntegrationService): Router => {
  const router = Router();
  const controller = createCommIntegrationController(service);

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

  // Fetch channels without saving (stateless - for UI selection)
  router.post(
    '/integrations/channels',
    controller.fetchChannels
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
