import { Router } from 'express';
import { createTestManagementRunController } from '~controllers/integrations/test-management/test-run';
import type { TestManagementRunService } from '~services/integrations/test-management/test-run';
import type { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';

/**
 * Test Run Operations Routes
 * RESTful design - appId and runId in URL path
 */
export const createTestRunOperationsRoutes = (
  service: TestManagementRunService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createTestManagementRunController(service);

  // Create test runs (returns runId)
  router.post(
    '/apps/:appId/test-management/test-runs',
    tenantPermissions.requireEditor({ storage }),
    controller.createTestRuns
  );

  // Get test run status
  router.get(
    '/apps/:appId/test-management/test-runs/:runId',
    tenantPermissions.requireAppMembership({ storage }),
    controller.getTestStatus
  );

  // Reset specific test run
  router.post(
    '/apps/:appId/test-management/test-runs/:runId/reset',
    tenantPermissions.requireEditor({ storage }),
    controller.resetTestRun
  );

  // Cancel specific test run
  router.post(
    '/apps/:appId/test-management/test-runs/:runId/cancel',
    tenantPermissions.requireEditor({ storage }),
    controller.cancelTestRun
  );

  // Get test run report
  router.get(
    '/apps/:appId/test-management/test-runs/:runId/report',
    tenantPermissions.requireAppMembership({ storage }),
    controller.getTestReport
  );

  return router;
};

