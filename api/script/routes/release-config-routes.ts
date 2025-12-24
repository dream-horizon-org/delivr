/**
 * Release Configuration Routes
 * API endpoints for release configuration management
 */

import { Router } from 'express';
import { createReleaseConfigController } from '~controllers/release-configs';
import type { ReleaseConfigService, ReleaseConfigActivityLogService } from '~services/release-configs';
import * as tenantPermissions from '../middleware/tenant-permissions';
import { Storage } from '../storage/storage';

/**
 * Create release configuration routes
 */
export const createReleaseConfigRoutes = (
  service: ReleaseConfigService,
  activityLogService: ReleaseConfigActivityLogService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createReleaseConfigController(service, activityLogService);

  // Create release config
  router.post(
    '/tenants/:tenantId/release-configs',
    tenantPermissions.requireEditor({ storage }),
    controller.createConfig
  );

  // List configs by tenant
  router.get(
    '/tenants/:tenantId/release-configs',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.listConfigsByTenant
  );

  // Get config by ID
  router.get(
    '/tenants/:tenantId/release-configs/:configId',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getConfigById
  );

  // Update config
  router.put(
    '/tenants/:tenantId/release-configs/:configId',
    tenantPermissions.requireEditor({ storage }),
    controller.updateConfig
  );

  // Delete config
  router.delete(
    '/tenants/:tenantId/release-configs/:configId',
    tenantPermissions.requireEditor({ storage }),
    controller.deleteConfig
  );

  // Get activity logs for a release config
  router.get(
    '/tenants/:tenantId/release-configs/:configId/activity-logs',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getActivityLogs
  );

  return router;
};
