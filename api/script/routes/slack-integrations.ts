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
  // SEND Message to Slack
  // ============================================================================
  router.post(
    "/tenants/:tenantId/integrations/slack/send-message",
    tenantPermissions.requireOwner({ storage }),
    slackControllers.sendSlackMessage
  );

  return router;
}

