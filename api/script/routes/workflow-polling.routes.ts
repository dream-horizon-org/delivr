/**
 * Workflow Polling Routes
 * 
 * Internal endpoints for Cronicle to poll CI/CD workflow statuses.
 * Protected by cronicleAuthMiddleware.
 * 
 * Endpoints:
 * - POST /internal/cron/builds/poll-pending-workflows
 * - POST /internal/cron/builds/poll-running-workflows
 */

import { Request, Response, Router } from 'express';
import { cronicleAuthMiddleware } from '../middleware/cronicle-auth.middleware';
import { createWorkflowPollingController } from '~controllers/release/workflow-polling.controller';
import { WorkflowPollingService } from '~services/release/workflow-polling';
import { BuildCallbackService } from '~services/release/build-callback.service';
import { HTTP_STATUS } from '../constants/http';
import type { Storage } from '../storage/storage';
import { hasBuildCallbackDependencies } from '../types/release/storage-with-services.interface';

// ============================================================================
// ROUTE FACTORY
// ============================================================================

/**
 * Create workflow polling routes
 * 
 * @param storage - Storage instance for repository access
 * @returns Express Router with workflow polling routes
 */
export const createWorkflowPollingRoutes = (storage: Storage): Router => {
  const router = Router();

  // Check if required repositories are available using type guard
  const hasRepos = hasBuildCallbackDependencies(storage);
  const reposNotAvailable = !hasRepos;

  if (reposNotAvailable) {
    console.warn('[Workflow Polling Routes] Required repositories not available, routes disabled');
    
    // Return fallback routes that return error
    router.post('/internal/cron/builds/poll-pending-workflows', cronicleAuthMiddleware,
      (_req: Request, res: Response) => res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Workflow polling service not configured'
      })
    );
    router.post('/internal/cron/builds/poll-running-workflows', cronicleAuthMiddleware,
      (_req: Request, res: Response) => res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Workflow polling service not configured'
      })
    );
    return router;
  }

  // TypeScript now knows storage has the required repositories
  const callbackService = new BuildCallbackService(
    storage.buildRepository,
    storage.releaseTaskRepository,
    storage.releaseRepository,
    storage.cronJobRepository
  );

  const pollingService = new WorkflowPollingService(
    storage.buildRepository,
    callbackService
  );
  const controller = createWorkflowPollingController(pollingService);

  // ─────────────────────────────────────────────────────────────
  // Internal Webhook Endpoints (Cronicle calls these)
  // ─────────────────────────────────────────────────────────────

  /**
   * Poll PENDING workflows
   * Called by Cronicle job: workflow-poll-pending-{releaseId}
   * 
   * Body: { releaseId: string, tenantId: string }
   */
  router.post(
    '/internal/cron/builds/poll-pending-workflows',
    cronicleAuthMiddleware,
    controller.pollPendingWorkflows
  );

  /**
   * Poll RUNNING workflows
   * Called by Cronicle job: workflow-poll-running-{releaseId}
   * 
   * Body: { releaseId: string, tenantId: string }
   */
  router.post(
    '/internal/cron/builds/poll-running-workflows',
    cronicleAuthMiddleware,
    controller.pollRunningWorkflows
  );

  return router;
};

