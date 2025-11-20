import { Router } from "express";
import { Storage } from "../../../../storage/storage";
import * as tenantPermissions from "../../../../middleware/tenant-permissions";
import * as validateCICD from "../../../../middleware/validate-cicd";
import * as jenkinsConn from "../../../../controllers/integrations/ci-cd/connections/jenkins.controller";

export const createJenkinsConnectionRoutes = (_storage: Storage): Router => {
  const router = Router();

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/jenkins/verify",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage: _storage }),
    validateCICD.validateJenkinsVerifyBody,
    jenkinsConn.verifyJenkinsConnection
  );

  router.post(
    "/tenants/:tenantId/integrations/ci-cd/jenkins",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage: _storage }),
    validateCICD.validateCreateJenkinsBody,
    jenkinsConn.createJenkinsConnection
  );

  router.get(
    "/tenants/:tenantId/integrations/ci-cd/jenkins",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage: _storage }),
    jenkinsConn.getJenkinsConnection
  );

  router.patch(
    "/tenants/:tenantId/integrations/ci-cd/jenkins",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage: _storage }),
    jenkinsConn.updateJenkinsConnection
  );

  router.delete(
    "/tenants/:tenantId/integrations/ci-cd/jenkins",
    validateCICD.validateTenantId,
    // tenantPermissions.requireOwner({ storage: _storage }),
    jenkinsConn.deleteJenkinsConnection
  );

  return router;
};


