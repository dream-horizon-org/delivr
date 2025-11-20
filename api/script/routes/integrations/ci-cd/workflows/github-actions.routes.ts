import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as tenantPermissions from "../../../../middleware/tenant-permissions";
import * as validateCICD from "../../../../middleware/validate-cicd";
import * as ghaWf from "../../../../controllers/integrations/ci-cd/workflows/github-actions.controller";

export const createGitHubActionsWorkflowRoutes = (storage: Storage): Router => {
  const router = Router();

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/github-actions/job-parameters",
    validateCICD.validateTenantId,
    tenantPermissions.requireOwner({ storage }),
    ghaWf.fetchGitHubActionsWorkflowInputs
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/github-actions/run-status",
    validateCICD.validateTenantId,
    tenantPermissions.requireOwner({ storage }),
    ghaWf.getGitHubActionsRunStatus
  );

  return router;
};


