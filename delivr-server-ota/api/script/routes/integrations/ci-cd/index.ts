import { Router } from "express";
import { Storage } from "../../../storage/storage";
import { createCICDConfigRoutes } from "./config/config.routes";
import { createCICDConnectionsRoutes } from "./connections/connections.routes";
import { createCICDWorkflowsRoutes } from "./workflows/workflows.routes";
import * as validateCICD from "../../../middleware/validate-cicd";
import * as tenantPermissions from "../../../middleware/tenant-permissions";
import {
  createWorkflow,
  listWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  getAvailableCICDProviders
} from "~controllers/integrations/ci-cd";

export function createCICDIntegrationRoutes(storage: Storage): Router {
  const router = Router();

  // Get available CI/CD providers
  router.get(
    "/integrations/ci-cd/providers",
    tenantPermissions.requireTenantMembership({ storage }),
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
    tenantPermissions.requireEditor({ storage }),
    validateCICD.validateCreateWorkflowBody,
    createWorkflow
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/workflows",
    validateCICD.validateTenantId,
    tenantPermissions.requireTenantMembership({ storage }),
    listWorkflows
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/workflows/:workflowId",
    validateCICD.validateTenantId,
    tenantPermissions.requireTenantMembership({ storage }),
    getWorkflowById
  );

  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/workflows/:workflowId",
    validateCICD.validateTenantId,
    tenantPermissions.requireEditor({ storage }),
    updateWorkflow
  );

  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/workflows/:workflowId",
    validateCICD.validateTenantId,
    tenantPermissions.requireEditor({ storage }),
    deleteWorkflow
  );

  return router;
}


