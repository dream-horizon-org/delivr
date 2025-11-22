import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as validateCICD from "../../../../middleware/validate-cicd";
import { getJobParameters, triggerWorkflow, getQueueStatus, getRunStatus } from "~controllers/integrations/ci-cd";

export const createCICDWorkflowsRoutes = (_storage: Storage): Router => {
  const router = Router();

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/:integrationId/job-parameters",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    validateCICD.validateWorkflowParamFetchBody,
    getJobParameters
  );

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/:integrationId/trigger",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    validateCICD.validateWorkflowTriggerBody,
    triggerWorkflow
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/:integrationId/queue-status",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    validateCICD.validateJenkinsQueueQuery,
    getQueueStatus
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/:integrationId/run-status",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    validateCICD.validateWorkflowRunStatusQuery,
    getRunStatus
  );

  return router;
};


