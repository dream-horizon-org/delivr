import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as validateCICD from "../../../../middleware/validate-cicd";
import * as tenantPermissions from "../../../../middleware/tenant-permissions";
import {
  createConfig,
  listConfigsByApp,
  getConfigById,
  updateConfigById,
  deleteConfigById,
  triggerWorkflowByConfig
} from "~controllers/integrations/ci-cd";

export const createCICDConfigRoutes = (storage: Storage): Router => {
  const router = Router();

  router.post(
    "/apps/:appId/integrations/ci-cd/configs",
    validateCICD.validateTenantId,
    tenantPermissions.requireOwner({ storage }),
    createConfig
  );

  router.get(
    "/apps/:appId/integrations/ci-cd/configs",
    validateCICD.validateTenantId,
    tenantPermissions.requireAppMembership({ storage }),
    listConfigsByApp
  );

  router.get(
    "/apps/:appId/integrations/ci-cd/configs/:configId",
    validateCICD.validateTenantId,
    validateCICD.validateConfigIdParam,
    tenantPermissions.requireAppMembership({ storage }),
    getConfigById
  );

  router.patch(
    "/apps/:appId/integrations/ci-cd/configs/:configId",
    validateCICD.validateTenantId,
    validateCICD.validateConfigIdParam,
    tenantPermissions.requireEditor({ storage }),
    updateConfigById
  );

  router.delete(
    "/apps/:appId/integrations/ci-cd/configs/:configId",
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



