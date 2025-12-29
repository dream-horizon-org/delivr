import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as validateCICD from "../../../../middleware/validate-cicd";
import * as tenantPermissions from "../../../../middleware/tenant-permissions";
import {
  createConfig,
  listConfigsByTenant,
  getConfigById,
  updateConfigById,
  deleteConfigById,
  triggerWorkflowByConfig
} from "~controllers/integrations/ci-cd";

export const createCICDConfigRoutes = (storage: Storage): Router => {
  const router = Router();

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/configs",
    validateCICD.validateTenantId,
    tenantPermissions.requireOwner({ storage }),
    createConfig
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/configs",
    validateCICD.validateTenantId,
    tenantPermissions.requireTenantMembership({ storage }),
    listConfigsByTenant
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/configs/:configId",
    validateCICD.validateTenantId,
    validateCICD.validateConfigIdParam,
    tenantPermissions.requireTenantMembership({ storage }),
    getConfigById
  );

  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/configs/:configId",
    validateCICD.validateTenantId,
    validateCICD.validateConfigIdParam,
    tenantPermissions.requireEditor({ storage }),
    updateConfigById
  );

  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/configs/:configId",
    validateCICD.validateTenantId,
    validateCICD.validateConfigIdParam,
    tenantPermissions.requireEditor({ storage }),
    deleteConfigById
  );

  router.post(
    "/integrations/ci-cd/configs/:configId/trigger",
    validateCICD.validateConfigIdParam,
    validateCICD.validateConfigWorkflowTriggerBody,
    tenantPermissions.requireEditor({ storage }),
    triggerWorkflowByConfig
  );

  return router;
};



