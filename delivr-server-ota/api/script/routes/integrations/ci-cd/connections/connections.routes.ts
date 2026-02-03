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
    "/apps/:appId/integrations/ci-cd/connections/:providerType/verify",
    validateCICD.validateAppId,
    validateCICD.validateProviderTypeParam,
    validateCICD.validateConnectionVerifyBody,
    tenantPermissions.requireOwner({ storage }),
    verifyConnectionByProvider
  );

  router.post(
    "/apps/:appId/integrations/ci-cd/connections/:providerType",
    validateCICD.validateAppId,
    validateCICD.validateProviderTypeParam,
    validateCICD.validateConnectionCreateBody,
    tenantPermissions.requireOwner({ storage }),
    createConnectionByProvider
  );

  // CRUD by integrationId
  router.get(
    "/apps/:appId/integrations/ci-cd/connections/:integrationId",
    validateCICD.validateAppId,
    validateCICD.validateIntegrationIdParam,
    tenantPermissions.requireAppMembership({ storage }),
    getIntegrationById
  );

  router.patch(
    "/apps/:appId/integrations/ci-cd/connections/:integrationId",
    validateCICD.validateAppId,
    validateCICD.validateIntegrationIdParam,
    tenantPermissions.requireOwner({ storage }),
    updateIntegrationById
  );

  router.delete(
    "/apps/:appId/integrations/ci-cd/connections/:integrationId",
    validateCICD.validateAppId,
    validateCICD.validateIntegrationIdParam,
    tenantPermissions.requireOwner({ storage }),
    deleteIntegrationById
  );

  return router;
};


