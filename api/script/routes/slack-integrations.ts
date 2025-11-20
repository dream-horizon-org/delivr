import { Router } from "express";
import { Storage } from "../storage/storage";
import * as tenantPermissions from "../middleware/tenant-permissions";
import * as slackControllers from "../controllers/integrations/slack-controllers";

/**
 * Create Slack Integration Routes
 * All business logic is delegated to controllers in slack-controllers.ts
 * Controllers use storage singleton, no need to pass storage explicitly
 */
export function createSlackIntegrationRoutes(storage: Storage): Router {
  const router = Router();

  // ============================================================================
  // VERIFY Slack Bot Token
  // ============================================================================
  router.post(
    "/tenants/:tenantId/integrations/slack/verify",
    tenantPermissions.requireOwner({ storage }),
    slackControllers.verifySlackToken
  );

  // ============================================================================
  // FETCH Slack Channels
  // ============================================================================
  router.post(
    "/tenants/:tenantId/integrations/slack/channels",
    tenantPermissions.requireOwner({ storage }),
    slackControllers.fetchSlackChannels
  );

  // ============================================================================
  // CREATE Slack Integration (save after verification)
  // ============================================================================
  router.post(
    "/tenants/:tenantId/integrations/slack",
    tenantPermissions.requireOwner({ storage }),
    slackControllers.createOrUpdateSlackIntegration
  );

  // ============================================================================
  // GET Slack Integration for Tenant
  // ============================================================================
  router.get(
    "/tenants/:tenantId/integrations/slack",
    tenantPermissions.requireOwner({ storage }),
    slackControllers.getSlackIntegration
  );

  // ============================================================================
  // UPDATE Slack Integration
  // ============================================================================
  router.patch(
    "/tenants/:tenantId/integrations/slack",
    tenantPermissions.requireOwner({ storage }),
    slackControllers.updateSlackIntegration
  );

  // ============================================================================
  // DELETE Slack Integration
  // ============================================================================
  router.delete(
    "/tenants/:tenantId/integrations/slack",
    tenantPermissions.requireOwner({ storage }),
    slackControllers.deleteSlackIntegration
  );

  // ============================================================================
  // CHANNEL CONFIGURATION ENDPOINTS
  // ============================================================================
  // CREATE channel configuration
  router.post(
    "/tenants/:tenantId/integrations/slack/channel-config",
    tenantPermissions.requireOwner({ storage }),
    slackControllers.createChannelConfig
  );

  // GET channel configuration by ID (id in body)
  router.post(
    "/tenants/:tenantId/integrations/slack/channel-config/get",
    tenantPermissions.requireOwner({ storage }),
    slackControllers.getChannelConfig
  );

  // DELETE channel configuration by ID (id in body)
  router.post(
    "/tenants/:tenantId/integrations/slack/channel-config/delete",
    tenantPermissions.requireOwner({ storage }),
    slackControllers.deleteChannelConfig
  );

  // UPDATE channel configuration - add/remove channels from stage
  router.post(
    "/tenants/:tenantId/integrations/slack/channel-config/update",
    tenantPermissions.requireOwner({ storage }),
    slackControllers.updateChannelConfig
  );

  return router;
}

