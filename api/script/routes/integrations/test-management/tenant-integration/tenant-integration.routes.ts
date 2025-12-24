import { Router } from 'express';
import { createTestManagementIntegrationController } from '~controllers/integrations/test-management/tenant-integration';
import type { TestManagementIntegrationService } from '~services/integrations/test-management/tenant-integration';
import type { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';

export const createTenantIntegrationRoutes = (
  service: TestManagementIntegrationService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createTestManagementIntegrationController(service);

  // List available providers
  router.get(
    '/providers',
    tenantPermissions.requireEditor({ storage }),
    controller.getAvailableProviders
  );

  // Verify credentials without saving (stateless - no tenantId or integrationId needed)
  router.post(
    '/integrations/verify',
    tenantPermissions.requireOwner({ storage }),
    controller.verifyCredentials
  );

  // Create integration for a tenant (need tenantId)
  router.post(
    '/tenants/:tenantId/integrations',
    tenantPermissions.requireOwner({ storage }),
    controller.createIntegration
  );

  // List all integrations for a tenant (need tenantId)
  router.get(
    '/tenants/:tenantId/integrations',
    tenantPermissions.requireEditor({ storage }),
    controller.listIntegrations
  );

  // Get specific integration (integrationId is enough)
  router.get(
    '/integrations/:integrationId',
    tenantPermissions.requireEditor({ storage }),
    controller.getIntegration
  );

  // Update specific integration (integrationId is enough)
  router.put(
    '/integrations/:integrationId',
    tenantPermissions.requireOwner({ storage }),
    controller.updateIntegration
  );

  // Delete specific integration (integrationId is enough)
  router.delete(
    '/integrations/:integrationId',
    tenantPermissions.requireOwner({ storage }),
    controller.deleteIntegration
  );

  // Verify integration credentials (integrationId is enough)
  router.post(
    '/integrations/:integrationId/verify',
    tenantPermissions.requireOwner({ storage }),
    controller.verifyIntegration
  );

  return router;
};
