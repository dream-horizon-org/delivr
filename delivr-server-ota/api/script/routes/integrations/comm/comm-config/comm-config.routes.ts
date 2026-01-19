/**
 * Communication Channel Configuration Routes
 * API endpoints for Slack channel configuration management
 */
import { Router } from 'express';
import { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';
import { createCommConfigController } from '~controllers/integrations/comm/comm-config';

/**
 * Create channel config routes
 */
export const createCommConfigRoutes = (storage: Storage): Router => {
  const router = Router();

  // Lazy controller creation - services are created on first request
  let controller: ReturnType<typeof createCommConfigController> | null = null;
  const getController = () => {
    if (!controller) {
      // Access service from storage
      const s3Storage = storage as any;
      if (!s3Storage.commConfigService) {
        throw new Error('Communication config service not initialized');
      }
      controller = createCommConfigController(s3Storage.commConfigService);
    }
    return controller;
  };

  // Create channel configuration
  router.post(
    '/tenants/:tenantId/integrations/slack/channel-config',
    tenantPermissions.requireEditor({ storage }),
    (req, res) => getController().createConfig(req, res)
  );

  // Get channel configuration by ID (id in body)
  router.post(
    '/tenants/:tenantId/integrations/slack/channel-config/get',
    tenantPermissions.requireTenantMembership({ storage }),
    (req, res) => getController().getConfig(req, res)
  );

  // Delete channel configuration by ID (id in body)
  router.post(
    '/tenants/:tenantId/integrations/slack/channel-config/delete',
    tenantPermissions.requireEditor({ storage }),
    (req, res) => getController().deleteConfig(req, res)
  );

  // Update channel configuration - add/remove channels from stage
  router.post(
    '/tenants/:tenantId/integrations/slack/channel-config/update',
    tenantPermissions.requireEditor({ storage }),
    (req, res) => getController().updateConfig(req, res)
  );

  return router;
};
