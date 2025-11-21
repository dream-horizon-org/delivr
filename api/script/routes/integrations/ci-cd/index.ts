import { Router } from "express";
import { Storage } from "../../../storage/storage";
import { createCICDConfigRoutes } from "./config/config.routes";
import { createCICDConnectionsRoutes } from "./connections/connections.routes";
import { createCICDWorkflowsRoutes } from "./workflows/workflows.routes";
import * as workflowControllers from "../../../controllers/integrations/ci-cd/workflows/workflows.controller";
import * as validateCICD from "../../../middleware/validate-cicd";
import { getAvailableCICDProviders } from "../../../controllers/integrations/ci-cd/providers.controller";

export function createCICDIntegrationRoutes(storage: Storage): Router {
  const router = Router();

  // Get available CI/CD providers (public endpoint)
  router.get(
    "/integrations/ci-cd/providers",
    getAvailableCICDProviders
  );

  // Compose provider-specific subrouters
  router.use(createCICDConfigRoutes(storage));
  router.use(createCICDConnectionsRoutes(storage));
  router.use(createCICDWorkflowsRoutes(storage));

  // Provider-agnostic workflows CRUD stays here
  router.post(
    "/tenants/:tenantId/integrations/ci-cd/workflows",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    validateCICD.validateCreateWorkflowBody,
    workflowControllers.createWorkflow
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/workflows",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    workflowControllers.listWorkflows
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/workflows/:workflowId",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    workflowControllers.getWorkflowById
  );

  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/workflows/:workflowId",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    workflowControllers.updateWorkflow
  );

  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/workflows/:workflowId",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage }),
    workflowControllers.deleteWorkflow
  );

  return router;
}


