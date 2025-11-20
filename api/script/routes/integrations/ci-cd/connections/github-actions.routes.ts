import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as tenantPermissions from "../../../../middleware/tenant-permissions";
import * as validateCICD from "../../../../middleware/validate-cicd";
import * as ghaConn from "../../../../controllers/integrations/ci-cd/connections/github-actions.controller";

export const createGitHubActionsConnectionRoutes = (storage: Storage): Router => {
  const router = Router();

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/github-actions/verify",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    validateCICD.validateGHAVerifyBody,
    ghaConn.verifyGitHubActionsConnection
  );

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/github-actions",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    validateCICD.validateCreateGHABody,
    ghaConn.createGitHubActionsConnection
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/github-actions",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    ghaConn.getGitHubActionsConnection
  );

  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/github-actions",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    ghaConn.updateGitHubActionsConnection
  );

  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/github-actions",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    ghaConn.deleteGitHubActionsConnection
  );

  return router;
};


