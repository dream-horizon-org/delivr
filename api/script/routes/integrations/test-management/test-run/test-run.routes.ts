import { Router } from 'express';
import { createTestManagementRunController } from '~controllers/integrations/test-management/test-run';
import type { TestManagementRunService } from '~services/integrations/test-management/test-run';

/**
 * Test Run Operations Routes
 * RESTful design - runId in URL path
 */
export const createTestRunOperationsRoutes = (service: TestManagementRunService): Router => {
  const router = Router();
  const controller = createTestManagementRunController(service);

  // Create test runs (returns runId)
  router.post(
    '/test-runs',
    controller.createTestRuns
  );

  // Get test run status
  router.get(
    '/test-runs/:runId',
    controller.getTestStatus
  );

  // Reset specific test run
  router.post(
    '/test-runs/:runId/reset',
    controller.resetTestRun
  );

  // Cancel specific test run
  router.post(
    '/test-runs/:runId/cancel',
    controller.cancelTestRun
  );

  // Get test run report
  router.get(
    '/test-runs/:runId/report',
    controller.getTestReport
  );

  return router;
};

