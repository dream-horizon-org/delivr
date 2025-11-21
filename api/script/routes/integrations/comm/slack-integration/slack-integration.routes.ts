/**
 * Communication Integration Routes
 * API endpoints for Slack integration management
 */

import { Router } from 'express';
import { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';
import { createSlackIntegrationController } from '~controllers/integrations/comm/slack-integration';

/**
 * Create integration routes
 */
export const createIntegrationRoutes = (storage: Storage): Router => {
  const router = Router();
  
  // Lazy controller creation - services are created on first request
  let controller: ReturnType<typeof createSlackIntegrationController> | null = null;
  const getController = () => {
    if (!controller) {
      // Access service from storage (similar to test-management pattern)
      const s3Storage = storage as any;
      if (!s3Storage.slackIntegrationService) {
        throw new Error('Slack integration service not initialized');
      }
      controller = createSlackIntegrationController(s3Storage.slackIntegrationService);
    }
    return controller;
  };

  // Verify Slack Bot Token
  router.post(
    '/tenants/:tenantId/integrations/slack/verify',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().verifyToken(req, res)
  );

  // Fetch Slack Channels
  router.post(
    '/tenants/:tenantId/integrations/slack/channels',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().fetchChannels(req, res)
  );

  // Create or Update Slack Integration
  router.post(
    '/tenants/:tenantId/integrations/slack',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().createOrUpdateIntegration(req, res)
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
