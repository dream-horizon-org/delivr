/**
 * Communication Integration Routes
 * API endpoints for Slack integration management
 */
import { Router } from 'express';
import { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';
import { createCommIntegrationController } from '~controllers/integrations/comm/comm-integration';

/**
 * Create integration routes
 */
export const createCommIntegrationRoutes = (storage: Storage): Router => {
  const router = Router();
  
  // Lazy controller creation - services are created on first request
  let controller: ReturnType<typeof createCommIntegrationController> | null = null;
  const getController = () => {
    if (!controller) {
      // Access service from storage
      const s3Storage = storage as any;
      if (!s3Storage.commIntegrationService) {
        throw new Error('Communication integration service not initialized');
      }
      controller = createCommIntegrationController(s3Storage.commIntegrationService);
    }
    return controller;
  };

  // Verify Slack Bot Token
  router.post(
    '/tenants/:tenantId/integrations/slack/verify',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().verifyCredentials(req, res)
  );

  // Fetch Slack Channels (with token in body)
  router.post(
    '/tenants/:tenantId/integrations/slack/channels',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().fetchChannels(req, res)
  );

  // Fetch Slack Channels by Integration ID (uses stored token)
  router.get(
    '/tenants/:tenantId/integrations/slack/:integrationId/channels',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().fetchChannelsByIntegrationId(req, res)
  );

  // Create or Update Slack Integration
  router.post(
    '/tenants/:tenantId/integrations/slack',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().createIntegration(req, res)
  );

  // Get Slack Integration for Tenant
  router.get(
    '/tenants/:tenantId/integrations/slack',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().getIntegration(req, res)
  );

  // Update Slack Integration
  router.patch(
    '/tenants/:tenantId/integrations/slack',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().updateIntegration(req, res)
  );

  // Delete Slack Integration
  router.delete(
    '/tenants/:tenantId/integrations/slack',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().deleteIntegration(req, res)
  );

  return router;
};
