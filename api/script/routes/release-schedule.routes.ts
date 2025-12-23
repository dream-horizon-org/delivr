/**
 * Release Schedule Routes
 * 
 * User-facing endpoints for release schedule management.
 * Internal Cronicle webhook routes are in cronicle.routes.ts
 */

import { Router } from 'express';
import * as tenantPermissions from '../middleware/tenant-permissions';
import { createReleaseScheduleController } from '~controllers/release-schedules';
import type { ReleaseScheduleService } from '~services/release-schedules';
import type { Storage } from '../storage/storage';

// ============================================================================
// ROUTE FACTORY
// ============================================================================

/**
 * Create release schedule routes (user-facing only)
 * 
 * Internal Cronicle webhook routes are mounted separately in default-server.ts
 * at root level without /api/v1 prefix.
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
  // User-Facing Endpoints (Frontend calls these)
  // ─────────────────────────────────────────────────────────────
  
  router.get(
    '/tenants/:tenantId/release-schedules',
    tenantPermissions.requireOwner({ storage }),
    controller.listSchedulesByTenant
  );

  return router;
};
