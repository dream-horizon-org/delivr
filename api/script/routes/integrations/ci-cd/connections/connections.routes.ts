import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as validateCICD from "../../../../middleware/validate-cicd";
import * as tenantPermissions from "../../../../middleware/tenant-permissions";
import {
  verifyConnectionByProvider,
  createConnectionByProvider,
  getIntegrationById,
  updateIntegrationById,
  deleteIntegrationById
} from "~controllers/integrations/ci-cd";

export const createCICDConnectionsRoutes = (storage: Storage): Router => {
  const router = Router();

  // Create/Verify by provider type
  router.post(
    "/tenants/:tenantId/integrations/ci-cd/connections/:providerType/verify",
    validateCICD.validateTenantId,
    validateCICD.validateProviderTypeParam,
    validateCICD.validateConnectionVerifyBody,
    tenantPermissions.requireOwner({ storage }),
    verifyConnectionByProvider
  );

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/connections/:providerType",
    validateCICD.validateTenantId,
    validateCICD.validateProviderTypeParam,
    validateCICD.validateConnectionCreateBody,
    tenantPermissions.requireOwner({ storage }),
    createConnectionByProvider
  );

  // CRUD by integrationId
  router.get(
    "/tenants/:tenantId/integrations/ci-cd/connections/:integrationId",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    tenantPermissions.requireTenantMembership({ storage }),
    getIntegrationById
  );

  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/connections/:integrationId",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    tenantPermissions.requireOwner({ storage }),
    updateIntegrationById
  );

  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/connections/:integrationId",
    validateCICD.validateTenantId,
    validateCICD.validateIntegrationIdParam,
    tenantPermissions.requireOwner({ storage }),
    deleteIntegrationById
  );

  return router;
};


