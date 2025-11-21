import { Router } from 'express';
import { Storage } from '../../../../storage/storage';
import * as tenantPermissions from '../../../../middleware/tenant-permissions';
import * as channelConfigController from '../../../../controllers/integrations/comm/config';

/**
 * Communication Channel Configuration Routes
 * Handles channel configuration management for communication integrations (Slack, Teams, etc.)
 */
export const createChannelConfigRoutes = (storage: Storage): Router => {
  const router = Router();

  // CREATE channel configuration
  router.post(
    '/tenants/:tenantId/integrations/slack/channel-config',
    tenantPermissions.requireOwner({ storage }),
    channelConfigController.createChannelConfig
  );

  // GET channel configuration by ID (id in body)
  router.post(
    '/tenants/:tenantId/integrations/slack/channel-config/get',
    tenantPermissions.requireOwner({ storage }),
    channelConfigController.getChannelConfig
  );

  // DELETE channel configuration by ID (id in body)
  router.post(
    '/tenants/:tenantId/integrations/slack/channel-config/delete',
    tenantPermissions.requireOwner({ storage }),
    channelConfigController.deleteChannelConfig
  );

  // UPDATE channel configuration - add/remove channels from stage
  router.post(
    '/tenants/:tenantId/integrations/slack/channel-config/update',
    tenantPermissions.requireOwner({ storage }),
    channelConfigController.updateChannelConfig
  );

  return router;
};

