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
   * GET /apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/projects
   * Fetch all Checkmate projects for organization
   */
  router.get(
    '/apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/projects',
    tenantPermissions.requireAppMembership({ storage }),
    controller.getProjects
  );

  /**
   * GET /apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/sections?projectId=100
   * Fetch all Checkmate sections for a project
   */
  router.get(
    '/apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/sections',
    tenantPermissions.requireAppMembership({ storage }),
    controller.getSections
  );

  /**
   * GET /apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/labels?projectId=100
   * Fetch all Checkmate labels for a project
   */
  router.get(
    '/apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/labels',
    tenantPermissions.requireAppMembership({ storage }),
    controller.getLabels
  );

  /**
   * GET /apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/squads?projectId=100
   * Fetch all Checkmate squads for a project
   */
  router.get(
    '/apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/squads',
    tenantPermissions.requireAppMembership({ storage }),
    controller.getSquads
  );

  return router;
};

