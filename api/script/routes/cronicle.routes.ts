/**
 * Cronicle Webhook Routes
 * 
 * Internal endpoints for Cronicle to trigger scheduled operations.
 * Protected by cronicleAuthMiddleware.
 * 
 * Mounted at root level (no /api/v1 prefix) in default-server.ts
 * before auth middleware, similar to workflow polling routes.
 * 
 * Endpoints:
 * - POST /internal/release-schedules/create-release
 * 
 * Future endpoints can be added here:
 * - POST /internal/other-scheduled-operations
 */

import { Request, Response, Router } from 'express';
import { cronicleAuthMiddleware } from '../middleware/cronicle-auth.middleware';
import { createReleaseScheduleController } from '~controllers/release-schedules';
import type { Storage } from '../storage/storage';
import { 
  hasReleaseScheduleService,
  StorageWithReleaseServices
} from '../types/release/storage-with-services.interface';
import { HTTP_STATUS } from '../constants/http';

// ============================================================================
// ROUTE FACTORY
// ============================================================================

/**
 * Create Cronicle webhook routes
 * 
 * These routes are mounted at root level (no /api/v1 prefix) and
 * use cronicleAuthMiddleware instead of user authentication.
 * 
 * Follows the same pattern as workflowPollingRoutes - accepts Storage
 * and checks for required services internally.
 * 
 * @param storage - Storage instance (checks for releaseScheduleService internally)
 * @returns Express Router with Cronicle webhook routes
 */
export const createCronicleRoutes = (storage: Storage): Router => {
  const router = Router();

  // Check if releaseScheduleService is available
  if (!hasReleaseScheduleService(storage)) {
    console.warn('[Cronicle Routes] ReleaseScheduleService not available, routes disabled');
    
    // Return fallback route that returns error
    router.post('/internal/release-schedules/create-release', cronicleAuthMiddleware,
      (_req: Request, res: Response) => res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Release schedule service not configured'
      })
    );
    return router;
  }

  const storageWithServices = storage as StorageWithReleaseServices;
  const controller = createReleaseScheduleController(storageWithServices.releaseScheduleService);

  // ─────────────────────────────────────────────────────────────
  // Release Schedule Webhook (Cronicle calls this)
  // ─────────────────────────────────────────────────────────────
  
  router.post(
    '/internal/release-schedules/create-release',
    cronicleAuthMiddleware,
    controller.createScheduledRelease
  );

  // ─────────────────────────────────────────────────────────────
  // Future Cronicle webhook routes can be added here
  // ─────────────────────────────────────────────────────────────

  return router;
};

