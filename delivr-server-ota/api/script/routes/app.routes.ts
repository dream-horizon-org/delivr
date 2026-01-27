/**
 * App Routes
 * Routes for App entity management (renamed from Tenant)
 */

import { Router } from 'express';
import type { Storage } from '../storage/storage';
import { createAppController } from '../controllers/app/app.controller';
import { createAppPlatformTargetController } from '../controllers/app-platform-target/app-platform-target.controller';
import * as tenantPermissions from '../middleware/tenant-permissions';

export function createAppRoutes(storage: Storage): Router {
  const router = Router();

  // Get app service and platform target service from storage
  const appService = (storage as any).appService;
  const appPlatformTargetService = (storage as any).appPlatformTargetService;

  if (!appService || !appPlatformTargetService) {
    console.warn('[AppRoutes] AppService or AppPlatformTargetService not available in storage');
    // Return router with no routes if services aren't available
    return router;
  }

  // Create controllers
  const appController = createAppController(appService, storage);
  const appPlatformTargetController = createAppPlatformTargetController(appPlatformTargetService);

  // ============================================================================
  // APP ROUTES
  // ============================================================================

  // List all apps (user's apps) - no appId required, just authentication
  router.get(
    '/apps',
    tenantPermissions.requireAuth({ storage }),
    appController.listApps
  );

  // Create a new app - no appId required, just authentication
  router.post(
    '/apps',
    tenantPermissions.requireAuth({ storage }),
    appController.createApp
  );

  // Get app by ID - requires appId
  router.get(
    '/apps/:appId',
    tenantPermissions.requireAppMembership({ storage }),
    appController.getApp
  );

  // Update app
  router.put(
    '/apps/:appId',
    tenantPermissions.requireOwner({ storage }),
    appController.updateApp
  );

  // Delete app
  router.delete(
    '/apps/:appId',
    tenantPermissions.requireOwner({ storage }),
    appController.deleteApp
  );

  // ============================================================================
  // APP PLATFORM TARGET ROUTES
  // ============================================================================

  // Configure platform targets (replace all)
  router.put(
    '/apps/:appId/platform-targets',
    tenantPermissions.requireOwner({ storage }),
    appPlatformTargetController.configurePlatformTargets
  );

  // Get all platform targets for an app
  router.get(
    '/apps/:appId/platform-targets',
    tenantPermissions.requireAppMembership({ storage }),
    appPlatformTargetController.getPlatformTargets
  );

  // Get platform targets by platform
  router.get(
    '/apps/:appId/platform-targets/:platform',
    tenantPermissions.requireAppMembership({ storage }),
    appPlatformTargetController.getPlatformTargetsByPlatform
  );

  // Create a new platform target
  router.post(
    '/apps/:appId/platform-targets',
    tenantPermissions.requireOwner({ storage }),
    appPlatformTargetController.createPlatformTarget
  );

  // Update a platform target
  router.patch(
    '/apps/:appId/platform-targets/:platformTargetId',
    tenantPermissions.requireOwner({ storage }),
    appPlatformTargetController.updatePlatformTarget
  );

  // Delete a platform target
  router.delete(
    '/apps/:appId/platform-targets/:platformTargetId',
    tenantPermissions.requireOwner({ storage }),
    appPlatformTargetController.deletePlatformTarget
  );

  // Set platform target active/inactive
  router.patch(
    '/apps/:appId/platform-targets/:platformTargetId/active',
    tenantPermissions.requireOwner({ storage }),
    appPlatformTargetController.setPlatformTargetActive
  );

  return router;
}
