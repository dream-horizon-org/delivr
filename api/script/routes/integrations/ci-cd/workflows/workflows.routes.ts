import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as validateCICD from "../../../../middleware/validate-cicd";
import * as workflow from "../../../../controllers/integrations/ci-cd/workflows/workflow-actions.controller";

export const createCICDWorkflowsRoutes = (_storage: Storage): Router => {
  const router = Router();

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/:integrationId/job-parameters",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    validateCICD.validateWorkflowParamFetchBody,
    workflow.getJobParameters
  );

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/:integrationId/trigger",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    validateCICD.validateWorkflowTriggerBody,
    workflow.triggerWorkflow
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/:integrationId/queue-status",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    validateCICD.validateJenkinsQueueBody,
    workflow.getQueueStatus
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/:integrationId/run-status",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    validateCICD.validateWorkflowRunStatusBody,
    workflow.getRunStatus
  );

  return router;
};


