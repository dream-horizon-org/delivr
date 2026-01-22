/**
 * Checkmate Metadata Routes
 * All Checkmate-specific metadata endpoints
 */

import { Router } from 'express';
import { createCheckmateMetadataController } from '~controllers/integrations/test-management/metadata/checkmate';
import type { CheckmateMetadataService } from '~services/integrations/test-management/metadata/checkmate';
import type { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';

export const createCheckmateMetadataRoutes = (
  metadataService: CheckmateMetadataService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createCheckmateMetadataController(metadataService);

  /**
   * GET /tenants/:tenantId/integrations/test-management/:integrationId/checkmate/metadata/projects
   * Fetch all Checkmate projects for organization
   */
  router.get(
    '/tenants/:tenantId/integrations/test-management/:integrationId/checkmate/metadata/projects',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getProjects
  );

  /**
   * GET /tenants/:tenantId/integrations/test-management/:integrationId/checkmate/metadata/sections?projectId=100
   * Fetch all Checkmate sections for a project
   */
  router.get(
    '/tenants/:tenantId/integrations/test-management/:integrationId/checkmate/metadata/sections',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getSections
  );

  /**
   * GET /tenants/:tenantId/integrations/test-management/:integrationId/checkmate/metadata/labels?projectId=100
   * Fetch all Checkmate labels for a project
   */
  router.get(
    '/tenants/:tenantId/integrations/test-management/:integrationId/checkmate/metadata/labels',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getLabels
  );

  /**
   * GET /tenants/:tenantId/integrations/test-management/:integrationId/checkmate/metadata/squads?projectId=100
   * Fetch all Checkmate squads for a project
   */
  router.get(
    '/tenants/:tenantId/integrations/test-management/:integrationId/checkmate/metadata/squads',
    tenantPermissions.requireTenantMembership({ storage }),
    controller.getSquads
  );

  return router;
};

