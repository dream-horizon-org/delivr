import { Router } from 'express';
import { createTestManagementRunController } from '~controllers/integrations/test-management/test-run';
import type { TestManagementRunService } from '~services/integrations/test-management/test-run';
import type { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';

/**
 * Test Run Operations Routes
 * RESTful design - tenantId and runId in URL path
 */
export const createTestRunOperationsRoutes = (
  service: TestManagementRunService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createTestManagementRunController(service);

  // Create test runs (returns runId)
  router.post(
    '/tenants/:tenantId/test-management/test-runs',
    tenantPermissions.requireEditor({ storage }),
    controller.createTestRuns
  );

  // Get test run status
  router.get(
    '/tenants/:tenantId/test-management/test-runs/:runId',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getTestStatus
  );

  // Reset specific test run
  router.post(
    '/tenants/:tenantId/test-management/test-runs/:runId/reset',
    tenantPermissions.requireEditor({ storage }),
    controller.resetTestRun
  );

  // Cancel specific test run
  router.post(
    '/tenants/:tenantId/test-management/test-runs/:runId/cancel',
    tenantPermissions.requireEditor({ storage }),
    controller.cancelTestRun
  );

  // Get test run report
  router.get(
    '/tenants/:tenantId/test-management/test-runs/:runId/report',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getTestReport
  );

  return router;
};

