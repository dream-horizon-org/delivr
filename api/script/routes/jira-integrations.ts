import { Router } from "express";
import { Storage } from "../storage/storage";
import * as tenantPermissions from "../middleware/tenant-permissions";
import * as jiraControllers from "../controllers/integrations/jira-controllers";

/**
 * Create JIRA Integration Routes
 * All business logic is delegated to controllers in jira-controllers.ts
 * Controllers use storage singleton, no need to pass storage explicitly
 */
export function createJiraIntegrationRoutes(storage: Storage): Router {
  const router = Router();

  // ============================================================================
  // JIRA INTEGRATION ROUTES (Credentials)
  // ============================================================================

  // CREATE or UPDATE JIRA Integration
  router.post(
    "/tenants/:tenantId/integrations/jira",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.createOrUpdateJiraIntegration
  );

  // GET JIRA Integration for Tenant
  router.get(
    "/tenants/:tenantId/integrations/jira",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.getJiraIntegration
  );

  // DELETE JIRA Integration
  router.delete(
    "/tenants/:tenantId/integrations/jira",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.deleteJiraIntegration
  );

  // TEST JIRA Connection
  router.post(
    "/tenants/:tenantId/integrations/jira/test",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.testJiraConnection
  );

  // ============================================================================
  // JIRA CONFIGURATION ROUTES (Reusable Configs)
  // ============================================================================

  // CREATE JIRA Configuration
  router.post(
    "/tenants/:tenantId/jira/configurations",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.createJiraConfiguration
  );

  // GET all JIRA Configurations for Tenant
  router.get(
    "/tenants/:tenantId/jira/configurations",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.getJiraConfigurations
  );

  // GET JIRA Configuration by ID
  router.get(
    "/tenants/:tenantId/jira/configurations/:configId",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.getJiraConfigurationById
  );

  // UPDATE JIRA Configuration
  router.put(
    "/tenants/:tenantId/jira/configurations/:configId",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.updateJiraConfiguration
  );

  // DELETE JIRA Configuration
  router.delete(
    "/tenants/:tenantId/jira/configurations/:configId",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.deleteJiraConfiguration
  );

  // VERIFY JIRA Configuration (check project keys in Jira)
  router.post(
    "/tenants/:tenantId/jira/configurations/:configId/verify",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.verifyJiraConfiguration
  );

  // ============================================================================
  // JIRA EPIC MANAGEMENT ROUTES
  // ============================================================================

  // Create epics for a release (now uses jiraConfigId)
  router.post(
    "/tenants/:tenantId/releases/:releaseId/jira/epics",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.createEpicsForRelease
  );

  // Get epics for a release
  router.get(
    "/tenants/:tenantId/releases/:releaseId/jira/epics",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.getEpicsForRelease
  );

  // Get a single epic by ID
  router.get(
    "/tenants/:tenantId/jira/epics/:epicId",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.getEpicById
  );

  // Update an epic
  router.put(
    "/tenants/:tenantId/jira/epics/:epicId",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.updateEpic
  );

  // Delete an epic
  router.delete(
    "/tenants/:tenantId/jira/epics/:epicId",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.deleteEpic
  );

  // Check epic status against ready-to-release state
  router.get(
    "/tenants/:tenantId/jira/epics/:epicId/check-status",
    tenantPermissions.requireOwner({ storage }),
    jiraControllers.checkEpicStatus
  );

  return router;
}

