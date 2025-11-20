import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as tenantPermissions from "../../../../middleware/tenant-permissions";
import * as validateCICD from "../../../../middleware/validate-cicd";
import * as jenkinsWf from "../../../../controllers/integrations/ci-cd/workflows/jenkins.controller";

export const createJenkinsWorkflowRoutes = (_storage: Storage): Router => {
  const router = Router();

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/jenkins/job-parameters",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage: _storage }),
    validateCICD.validateJenkinsJobParamsBody,
    jenkinsWf.fetchJenkinsJobParameters
  );

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/jenkins/trigger",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage: _storage }),
    jenkinsWf.triggerJenkinsWorkflow
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/jenkins/queue-status",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage: _storage }),
    validateCICD.validateJenkinsQueueBody,
    jenkinsWf.getJenkinsQueueStatus
  );

  return router;
};


