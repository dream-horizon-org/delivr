import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as validateCICD from "../../../../middleware/validate-cicd";
import * as connection from "../../../../controllers/integrations/ci-cd/connections/connection.controller";

export const createCICDConnectionsRoutes = (_storage: Storage): Router => {
  const router = Router();

  // Create/Verify by provider type
  router.post(
    "/tenants/:tenantId/integrations/ci-cd/connections/:providerType/verify",
    validateCICD.validateTenantId,
    validateCICD.validateProviderTypeParam,
    validateCICD.validateConnectionVerifyBody,
    connection.verifyConnectionByProvider
  );

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/connections/:providerType",
    validateCICD.validateTenantId,
    validateCICD.validateProviderTypeParam,
    validateCICD.validateConnectionCreateBody,
    connection.createConnectionByProvider
  );

  // CRUD by integrationId
  router.get(
    "/tenants/:tenantId/integrations/ci-cd/connections/:integrationId",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    connection.getIntegrationById
  );

  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/connections/:integrationId",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    connection.updateIntegrationById
  );

  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/connections/:integrationId",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    connection.deleteIntegrationById
  );

  return router;
};


