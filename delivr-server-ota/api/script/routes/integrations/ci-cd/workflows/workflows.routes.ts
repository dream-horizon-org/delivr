import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as validateCICD from "../../../../middleware/validate-cicd";
import * as tenantPermissions from "../../../../middleware/tenant-permissions";
import { getJobParameters, triggerWorkflow, getQueueStatus, getRunStatus } from "~controllers/integrations/ci-cd";

export const createCICDWorkflowsRoutes = (storage: Storage): Router => {
  const router = Router();

  router.post(
    "/apps/:appId/integrations/ci-cd/:integrationId/job-parameters",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    validateCICD.validateWorkflowParamFetchBody,
    tenantPermissions.requireAppMembership({ storage }),
    getJobParameters
  );

  router.post(
    "/apps/:appId/integrations/ci-cd/:integrationId/trigger",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    validateCICD.validateWorkflowTriggerBody,
    tenantPermissions.requireEditor({ storage }),
    triggerWorkflow
  );

  router.get(
    "/apps/:appId/integrations/ci-cd/:integrationId/queue-status",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    validateCICD.validateJenkinsQueueQuery,
    tenantPermissions.requireAppMembership({ storage }),
    getQueueStatus
  );

  router.get(
    "/apps/:appId/integrations/ci-cd/:integrationId/run-status",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    validateCICD.validateWorkflowRunStatusQuery,
    tenantPermissions.requireAppMembership({ storage }),
    getRunStatus
  );

  return router;
};


