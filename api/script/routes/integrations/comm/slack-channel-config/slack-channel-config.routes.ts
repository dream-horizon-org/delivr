/**
 * Communication Channel Configuration Routes
 * API endpoints for Slack channel configuration management
 */

import { Router } from 'express';
import { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';
import { createSlackChannelConfigController } from '~controllers/integrations/comm/slack-channel-config';

/**
 * Create channel config routes
 */
export const createChannelConfigRoutes = (storage: Storage): Router => {
  const router = Router();

  // Lazy controller creation - services are created on first request
  let controller: ReturnType<typeof createSlackChannelConfigController> | null = null;
  const getController = () => {
    if (!controller) {
      // Access service from storage (similar to test-management pattern)
      const s3Storage = storage as any;
      if (!s3Storage.slackChannelConfigService) {
        throw new Error('Slack channel config service not initialized');
      }
      controller = createSlackChannelConfigController(s3Storage.slackChannelConfigService);
    }
    return controller;
  };

  // Create channel configuration
  router.post(
    '/tenants/:tenantId/integrations/slack/channel-config',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().createConfig(req, res)
  );

  // Get channel configuration by ID (id in body)
  router.post(
    '/tenants/:tenantId/integrations/slack/channel-config/get',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().getConfig(req, res)
  );

  // Delete channel configuration by ID (id in body)
  router.post(
    '/tenants/:tenantId/integrations/slack/channel-config/delete',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().deleteConfig(req, res)
  );

  // Update channel configuration - add/remove channels from stage
  router.post(
    '/tenants/:tenantId/integrations/slack/channel-config/update',
    tenantPermissions.requireOwner({ storage }),
    (req, res) => getController().updateConfig(req, res)
  );

  return router;
};
