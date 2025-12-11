/**
 * Release Schedule Routes
 * 
 * Contains both internal webhook endpoints (Cronicle) and user-facing endpoints.
 */

import { Router } from 'express';
import { cronicleAuthMiddleware } from '../middleware/cronicle-auth.middleware';
import * as tenantPermissions from '../middleware/tenant-permissions';
import { createReleaseScheduleController } from '~controllers/release-schedules';
import type { ReleaseScheduleService } from '~services/release-schedules';
import type { Storage } from '../storage/storage';

// ============================================================================
// ROUTE FACTORY
// ============================================================================

/**
 * Create release schedule routes
 * 
 * @param service - ReleaseScheduleService instance
 * @param storage - Storage instance (for tenant auth middleware)
 * @returns Express Router with release schedule routes
 */
export const createReleaseScheduleRoutes = (
  service: ReleaseScheduleService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createReleaseScheduleController(service);

  // ─────────────────────────────────────────────────────────────
  // Internal Webhook (Cronicle calls this)
  // ─────────────────────────────────────────────────────────────
  
  router.post(
    '/internal/release-schedules/create-release',
    cronicleAuthMiddleware,
    controller.createScheduledRelease
  );

  // ─────────────────────────────────────────────────────────────
  // User-Facing Endpoints (Frontend calls these)
  // ─────────────────────────────────────────────────────────────
  
  router.get(
    '/tenants/:tenantId/release-schedules',
    tenantPermissions.requireOwner({ storage }),
    controller.listSchedulesByTenant
  );

  return router;
};
