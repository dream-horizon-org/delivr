import { Router } from "express";
import { Storage } from "../storage/storage";
import * as tenantPermissions from "../middleware/tenant-permissions";
import * as cicdControllers from "../controllers/integrations/ci-cd-controllers";
import * as validateCICD from "../middleware/validate-cicd";

export function createCICDIntegrationRoutes(storage: Storage): Router {
  const router = Router();

  // Jenkins verification
  router.get(
    "/tenants/:tenantId/integrations/ci-cd/jenkins/verify",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    validateCICD.validateJenkinsVerifyBody,
    cicdControllers.verifyJenkinsConnection
  );

  // GitHub Actions - fetch workflow inputs (job parameters analogue)
  router.get(
    "/tenants/:tenantId/integrations/ci-cd/github-actions/job-parameters",
    validateCICD.validateTenantId,
    tenantPermissions.requireOwner({ storage }),
    cicdControllers.fetchGitHubActionsWorkflowInputs
  );

  // GitHub Actions - run status
  router.get(
    "/tenants/:tenantId/integrations/ci-cd/github-actions/run-status",
    validateCICD.validateTenantId,
    tenantPermissions.requireOwner({ storage }),
    cicdControllers.getGitHubActionsRunStatus
  );

  // Create Jenkins connection
  router.post(
    "/tenants/:tenantId/integrations/ci-cd/jenkins",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    validateCICD.validateCreateJenkinsBody,
    cicdControllers.createJenkinsConnection
  );

  // Get current Jenkins connection
  router.get(
    "/tenants/:tenantId/integrations/ci-cd/jenkins",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.getJenkinsConnection
  );

  // Update Jenkins connection
  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/jenkins",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.updateJenkinsConnection
  );

  // Delete Jenkins connection
  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/jenkins",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.deleteJenkinsConnection
  );

  // Fetch Jenkins job parameters
  router.get(
    "/tenants/:tenantId/integrations/ci-cd/jenkins/job-parameters",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    validateCICD.validateJenkinsJobParamsBody,
    cicdControllers.fetchJenkinsJobParameters
  );

  // Trigger Jenkins workflow by workflowType, overriding defaults with jobParameters
  router.post(
    "/tenants/:tenantId/integrations/ci-cd/jenkins/trigger",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.triggerJenkinsWorkflow
  );

  // GitHub Actions - verify (token or reuse SCM)
  router.get(
    "/tenants/:tenantId/integrations/ci-cd/github-actions/verify",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.verifyGitHubActionsConnection
  );

  // GitHub Actions - create/update connection (reuse SCM token if not provided)
  router.post(
    "/tenants/:tenantId/integrations/ci-cd/github-actions",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.createOrUpdateGitHubActionsConnection
  );

  // GitHub Actions - get connection
  router.get(
    "/tenants/:tenantId/integrations/ci-cd/github-actions",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.getGitHubActionsConnection
  );

  // GitHub Actions - update connection
  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/github-actions",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.updateGitHubActionsConnection
  );

  // GitHub Actions - delete connection
  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/github-actions",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.deleteGitHubActionsConnection
  );

  // Get Jenkins queue status
  router.get(
    "/tenants/:tenantId/integrations/ci-cd/jenkins/queue-status",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    validateCICD.validateJenkinsQueueBody,
    cicdControllers.getJenkinsQueueStatus
  );

  // Workflows CRUD (provider-agnostic)
  router.post(
    "/tenants/:tenantId/integrations/ci-cd/workflows",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    validateCICD.validateCreateWorkflowBody,
    cicdControllers.createWorkflow
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/workflows",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.listWorkflows
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/workflows/:workflowId",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.getWorkflowById
  );

  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/workflows/:workflowId",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.updateWorkflow
  );

  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/workflows/:workflowId",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    cicdControllers.deleteWorkflow
  );

  return router;
}


