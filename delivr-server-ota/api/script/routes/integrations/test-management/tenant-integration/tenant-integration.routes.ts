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

  // List available providers (no tenantId needed)
  router.get(
    '/integrations/test-management/providers',
    tenantPermissions.requireEditor({ storage }),
    controller.getAvailableProviders
  );

  // Verify credentials without saving (stateless)
  router.post(
    '/tenants/:tenantId/integrations/test-management/verify',
    tenantPermissions.requireOwner({ storage }),
    controller.verifyCredentials
  );

  // Create integration for a tenant
  router.post(
    '/tenants/:tenantId/integrations/test-management',
    tenantPermissions.requireOwner({ storage }),
    controller.createIntegration
  );

  // List all integrations for a tenant
  router.get(
    '/tenants/:tenantId/integrations/test-management',
    tenantPermissions.requireEditor({ storage }),
    controller.listIntegrations
  );

  // Get specific integration
  router.get(
    '/tenants/:tenantId/integrations/test-management/:integrationId',
    tenantPermissions.requireEditor({ storage }),
    controller.getIntegration
  );

  // Update specific integration
  router.put(
    '/tenants/:tenantId/integrations/test-management/:integrationId',
    tenantPermissions.requireOwner({ storage }),
    controller.updateIntegration
  );

  // Delete specific integration
  router.delete(
    '/tenants/:tenantId/integrations/test-management/:integrationId',
    tenantPermissions.requireOwner({ storage }),
    controller.deleteIntegration
  );

  // Verify integration credentials
  router.post(
    '/tenants/:tenantId/integrations/test-management/:integrationId/verify',
    tenantPermissions.requireOwner({ storage }),
    controller.verifyIntegration
  );

  return router;
};
