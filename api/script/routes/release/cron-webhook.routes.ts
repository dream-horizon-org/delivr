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

import { Router } from 'express';
import { cronicleAuthMiddleware } from '~middleware/cronicle-auth.middleware';
import { createCronWebhookController } from '~controllers/release/cron-webhook.controller';
// Note: GlobalSchedulerService is now accessed from storage instance (migrated from factory)
import type { Storage } from '~storage/storage';
import { hasGlobalSchedulerService, type StorageWithReleaseServices } from '~types/release/storage-with-services.interface';

// ============================================================================
// ROUTE FACTORY
// ============================================================================

/**
 * Create cron webhook routes
 * 
 * @param storage - Storage instance with Sequelize
 * @returns Express Router with cron webhook routes
 */
export const createCronWebhookRoutes = (storage: Storage): Router => {
  const router = Router();

  // ✅ Get GlobalSchedulerService from storage instance (migrated from factory)
  // Use proper type guard instead of 'as any'
  if (!hasGlobalSchedulerService(storage)) {
    console.warn('[Cron Webhook Routes] GlobalSchedulerService not available');
    return router;
  }
  
  // TypeScript now knows storage is StorageWithReleaseServices
  const storageWithServices: StorageWithReleaseServices = storage;
  // ✅ globalSchedulerService is required - actively initialized in aws-storage.ts, no null check needed
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
