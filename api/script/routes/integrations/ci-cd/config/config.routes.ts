import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as validateCICD from "../../../../middleware/validate-cicd";
import {
  createConfig,
  listConfigsByTenant,
  getConfigById,
  updateConfigById,
  deleteConfigById,
  triggerWorkflowByConfig
} from "~controllers/integrations/ci-cd";

export const createCICDConfigRoutes = (_storage: Storage): Router => {
  const router = Router();

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/configs",
    validateCICD.validateTenantId,
    createConfig
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/configs",
    validateCICD.validateTenantId,
    listConfigsByTenant
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/configs/:configId",
    validateCICD.validateTenantId,
    validateCICD.validateConfigIdParam,
    getConfigById
  );

  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/configs/:configId",
    validateCICD.validateTenantId,
    validateCICD.validateConfigIdParam,
    updateConfigById
  );

  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/configs/:configId",
    validateCICD.validateTenantId,
    validateCICD.validateConfigIdParam,
    deleteConfigById
  );

  router.post(
    "/integrations/ci-cd/configs/:configId/trigger",
    validateCICD.validateConfigIdParam,
    validateCICD.validateConfigWorkflowTriggerBody,
    triggerWorkflowByConfig
  );

  return router;
};



