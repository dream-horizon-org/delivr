import { Router } from "express";
import { Storage } from "../../../storage/storage";
import * as validateCICD from "../../../middleware/validate-cicd";
import * as configController from "../../../controllers/integrations/ci-cd/config/config.controller";

export const createCICDConfigRoutes = (_storage: Storage): Router => {
  const router = Router();

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/configs",
    validateCICD.validateTenantId,
    configController.createConfig
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/configs",
    validateCICD.validateTenantId,
    configController.listConfigsByTenant
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/configs/:configId",
    validateCICD.validateTenantId,
    validateCICD.validateConfigIdParam,
    configController.getConfigById
  );

  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/configs/:configId",
    validateCICD.validateTenantId,
    validateCICD.validateConfigIdParam,
    configController.updateConfigById
  );

  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/configs/:configId",
    validateCICD.validateTenantId,
    validateCICD.validateConfigIdParam,
    configController.deleteConfigById
  );

  return router;
};


