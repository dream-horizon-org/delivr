import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as validateCICD from "../../../../middleware/validate-cicd";
import {
  verifyConnectionByProvider,
  createConnectionByProvider,
  getIntegrationById,
  updateIntegrationById,
  deleteIntegrationById
} from "~controllers/integrations/ci-cd";

export const createCICDConnectionsRoutes = (_storage: Storage): Router => {
  const router = Router();

  // Create/Verify by provider type
  router.post(
    "/tenants/:tenantId/integrations/ci-cd/connections/:providerType/verify",
    validateCICD.validateTenantId,
    validateCICD.validateProviderTypeParam,
    validateCICD.validateConnectionVerifyBody,
    verifyConnectionByProvider
  );

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/connections/:providerType",
    validateCICD.validateTenantId,
    validateCICD.validateProviderTypeParam,
    validateCICD.validateConnectionCreateBody,
    createConnectionByProvider
  );

  // CRUD by integrationId
  router.get(
    "/tenants/:tenantId/integrations/ci-cd/connections/:integrationId",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    getIntegrationById
  );

  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/connections/:integrationId",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    updateIntegrationById
  );

  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/connections/:integrationId",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    deleteIntegrationById
  );

  return router;
};


