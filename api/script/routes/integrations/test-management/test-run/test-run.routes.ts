import { Router } from 'express';
import { createTestManagementRunController } from '~controllers/integrations/test-management/test-run';
import type { TestManagementRunService } from '~services/integrations/test-management/test-run.service';

/**
 * Test Run Operations Routes
 * Clean stateless APIs - no runId storage
 */
export const createTestRunOperationsRoutes = (service: TestManagementRunService): Router => {
  const router = Router();
  const controller = createTestManagementRunController(service);

  // Create test runs
  router.post(
    '/test-runs/create',
    controller.createTestRuns
  );

  // Get test status
  router.get(
    '/test-status',
    controller.getTestStatus
  );

  // Reset test run
  router.post(
    '/test-runs/reset',
    controller.resetTestRun
  );

  // Cancel test run
  router.post(
    '/test-runs/cancel',
    controller.cancelTestRun
  );

  // Get test report
  router.get(
    '/test-report',
    controller.getTestReport
  );

  return router;
};

