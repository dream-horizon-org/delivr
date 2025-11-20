import { Router } from 'express';
import { Storage } from '../../../../storage/storage';
import * as tenantPermissions from '../../../../middleware/tenant-permissions';
import * as integrationController from '../../../../controllers/integrations/comm/integration';

/**
 * Communication Integration Routes
 * Handles integration/connection management (OAuth, verification, CRUD) for Slack
 */
export const createIntegrationRoutes = (storage: Storage): Router => {
  const router = Router();

  // Verify Slack Bot Token
  router.post(
    '/tenants/:tenantId/integrations/slack/verify',
    tenantPermissions.requireOwner({ storage }),
    integrationController.verifySlackToken
  );

  // Fetch Slack Channels
  router.post(
    '/tenants/:tenantId/integrations/slack/channels',
    tenantPermissions.requireOwner({ storage }),
    integrationController.fetchSlackChannels
  );

  // CREATE Slack Integration (save after verification)
  router.post(
    '/tenants/:tenantId/integrations/slack',
    tenantPermissions.requireOwner({ storage }),
    integrationController.createOrUpdateSlackIntegration
  );

  // GET Slack Integration for Tenant
  router.get(
    '/tenants/:tenantId/integrations/slack',
    tenantPermissions.requireOwner({ storage }),
    integrationController.getSlackIntegration
  );

  // UPDATE Slack Integration
  router.patch(
    '/tenants/:tenantId/integrations/slack',
    tenantPermissions.requireOwner({ storage }),
    integrationController.updateSlackIntegration
  );

  // DELETE Slack Integration
  router.delete(
    '/tenants/:tenantId/integrations/slack',
    tenantPermissions.requireOwner({ storage }),
    integrationController.deleteSlackIntegration
  );

  return router;
};

