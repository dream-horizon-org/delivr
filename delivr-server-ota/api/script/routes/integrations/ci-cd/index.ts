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
    tenantPermissions.requireAppMembership({ storage }),
    getAvailableCICDProviders
  );

  // Compose provider-specific subrouters
  router.use(createCICDConfigRoutes(storage));
  router.use(createCICDConnectionsRoutes(storage));
  router.use(createCICDWorkflowsRoutes(storage));

  // Provider-agnostic workflows CRUD stays here
  router.post(
    "/apps/:appId/integrations/ci-cd/workflows",
    validateCICD.validateTenantId,
    tenantPermissions.requireEditor({ storage }),
    validateCICD.validateCreateWorkflowBody,
    createWorkflow
  );

  router.get(
    "/apps/:appId/integrations/ci-cd/workflows",
    validateCICD.validateTenantId,
    tenantPermissions.requireAppMembership({ storage }),
    listWorkflows
  );

  router.get(
    "/apps/:appId/integrations/ci-cd/workflows/:workflowId",
    validateCICD.validateTenantId,
    tenantPermissions.requireAppMembership({ storage }),
    getWorkflowById
  );

  router.patch(
    "/apps/:appId/integrations/ci-cd/workflows/:workflowId",
    validateCICD.validateTenantId,
    tenantPermissions.requireEditor({ storage }),
    updateWorkflow
  );

  router.delete(
    "/apps/:appId/integrations/ci-cd/workflows/:workflowId",
    validateCICD.validateTenantId,
    tenantPermissions.requireEditor({ storage }),
    deleteWorkflow
  );

  return router;
}


