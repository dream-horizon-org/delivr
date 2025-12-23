/**
 * Cron Webhook Routes
 * 
 * Internal endpoints for Cronicle to trigger release processing.
 * Protected by cronicleAuthMiddleware.
 * 
 * Endpoints:
 * - POST /internal/cron/releases - Process all active releases
 * 
 * This replaces the per-release setInterval approach with a global
 * scheduler that Cronicle calls every 60 seconds.
 */

import { Request, Response, Router } from 'express';
import { cronicleAuthMiddleware } from '~middleware/cronicle-auth.middleware';
import { createCronWebhookController } from '~controllers/release/cron-webhook.controller';
import { HTTP_STATUS } from '~constants/http';
import type { Storage } from '~storage/storage';
import { hasGlobalSchedulerService, type StorageWithReleaseServices } from '~types/release/storage-with-services.interface';

// ============================================================================
// ROUTE FACTORY
// ============================================================================

/**
 * Create cron webhook routes
 * 
 * @param storage - Storage instance with GlobalSchedulerService
 * @returns Express Router with cron webhook routes
 */
export const createCronWebhookRoutes = (storage: Storage): Router => {
  const router = Router();

  // Check if GlobalSchedulerService is available using type guard
  const hasScheduler = hasGlobalSchedulerService(storage);
  const schedulerNotAvailable = !hasScheduler;

  if (schedulerNotAvailable) {
    console.warn('[Cron Webhook Routes] GlobalSchedulerService not available, routes disabled');
    
    // Return fallback route that returns error
    router.post('/internal/cron/releases', cronicleAuthMiddleware,
      (_req: Request, res: Response) => res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Global scheduler service not configured'
      })
    );
    return router;
  }

  // ✅ Get GlobalSchedulerService from storage (centralized initialization - replaces factory)
  const storageWithServices = storage as StorageWithReleaseServices;
  const globalSchedulerService = storageWithServices.globalSchedulerService;

  // Create controller (handles validation + HTTP concerns)
  const controller = createCronWebhookController(globalSchedulerService);

  // ─────────────────────────────────────────────────────────────
  // Internal Webhook Endpoint (Cronicle calls this)
  // ─────────────────────────────────────────────────────────────

  /**
   * Process all active releases
   * Called by Cronicle job every 60 seconds
   * 
   * Headers: X-Cronicle-Secret (required)
   * Body: None required
   * 
   * Response: { success: true, processedCount: number, errors: string[], durationMs: number }
   */
  router.post(
    '/internal/cron/releases',
    cronicleAuthMiddleware,
    controller.handleReleaseTick
  );

  return router;
};
