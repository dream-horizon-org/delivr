import { Router } from "express";
import { Storage } from "../storage/storage";
import * as tenantPermissions from "../middleware/tenant-permissions";
import * as scmControllers from "../controllers/integrations/scm-controllers";

/**
 * Create SCM Integration Routes
 * All business logic is delegated to controllers in scm-controllers.ts
 * Controllers use storage singleton, no need to pass storage explicitly
 */
export function createSCMIntegrationRoutes(storage: Storage): Router {
  const router = Router();

  // ============================================================================
  // VERIFY SCM Connection
  // ============================================================================
  router.post(
    "/tenants/:tenantId/integrations/scm/verify",
    tenantPermissions.requireOwner({ storage }),
    scmControllers.verifySCMConnection
  );

  // ============================================================================
  // CREATE or UPDATE SCM Integration (save after verification)
  // ============================================================================
  router.post(
    "/tenants/:tenantId/integrations/scm",
    tenantPermissions.requireOwner({ storage }),
    scmControllers.createOrUpdateSCMIntegration
  );

  // ============================================================================
  // GET SCM Integration for Tenant
  // ============================================================================
  router.get(
    "/tenants/:tenantId/integrations/scm",
    tenantPermissions.requireOwner({ storage }),
    scmControllers.getSCMIntegration
  );

  // ============================================================================
  // UPDATE SCM Integration
  // ============================================================================
  router.patch(
    "/tenants/:tenantId/integrations/scm",
    tenantPermissions.requireOwner({ storage }),
    scmControllers.updateSCMIntegration
  );

  // ============================================================================
  // DELETE SCM Integration
  // ============================================================================
  router.delete(
    "/tenants/:tenantId/integrations/scm",
    tenantPermissions.requireOwner({ storage }),
    scmControllers.deleteSCMIntegration
  );

  return router;
}
