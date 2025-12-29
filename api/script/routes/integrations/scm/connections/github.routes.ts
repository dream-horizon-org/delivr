/**
 * GitHub SCM Routes
 * Provider-specific routes for GitHub integrations
 */

import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as tenantPermissions from "../../../../middleware/tenant-permissions";
import * as validateSCM from "../../../../middleware/validate-scm";
import * as githubConn from "../../../../controllers/integrations/scm/connections/github.controller";

export const createGitHubConnectionRoutes = (storage: Storage): Router => {
  const router = Router();

  // Verify GitHub connection
  router.post(
    "/tenants/:tenantId/integrations/scm/github/verify",
    validateSCM.validateTenantId,
    tenantPermissions.requireOwner({ storage }),
    validateSCM.validateGitHubVerifyBody,
    githubConn.verifyGitHubConnection
  );

  // Create GitHub connection
  router.post(
    "/tenants/:tenantId/integrations/scm/github",
    validateSCM.validateTenantId,
    tenantPermissions.requireOwner({ storage }),
    validateSCM.validateCreateGitHubBody,
    githubConn.createGitHubConnection
  );

  // Get GitHub connection
  router.get(
    "/tenants/:tenantId/integrations/scm/github",
    validateSCM.validateTenantId,
    tenantPermissions.requireTenantMembership({ storage }),
    githubConn.getGitHubConnection
  );

  // Update GitHub connection
  router.patch(
    "/tenants/:tenantId/integrations/scm/github",
    validateSCM.validateTenantId,
    tenantPermissions.requireOwner({ storage }),
    githubConn.updateGitHubConnection
  );

  // Delete GitHub connection
  router.delete(
    "/tenants/:tenantId/integrations/scm/github",
    validateSCM.validateTenantId,
    tenantPermissions.requireOwner({ storage }),
    githubConn.deleteGitHubConnection
  );

  // Fetch branches
  router.get(
    "/tenants/:tenantId/integrations/scm/github/branches",
    validateSCM.validateTenantId,
    tenantPermissions.requireTenantMembership({ storage }),
    githubConn.fetchGitHubBranches
  );

  return router;
};

