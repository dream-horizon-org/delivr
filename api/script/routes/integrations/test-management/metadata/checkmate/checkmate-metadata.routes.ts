/**
 * Checkmate Metadata Routes
 * All Checkmate-specific metadata endpoints
 */

import { Router } from 'express';
import { createCheckmateMetadataController } from '~controllers/integrations/test-management/metadata/checkmate';
import type { CheckmateMetadataService } from '~services/integrations/test-management/metadata/checkmate';

export const createCheckmateMetadataRoutes = (metadataService: CheckmateMetadataService): Router => {
  const router = Router();
  const controller = createCheckmateMetadataController(metadataService);

  /**
   * GET /test-management/integrations/:integrationId/checkmate/metadata/projects
   * Fetch all Checkmate projects for organization
   */
  router.get('/integrations/:integrationId/checkmate/metadata/projects', controller.getProjects);

  /**
   * GET /test-management/integrations/:integrationId/checkmate/metadata/sections?projectId=100
   * Fetch all Checkmate sections for a project
   */
  router.get('/integrations/:integrationId/checkmate/metadata/sections', controller.getSections);

  /**
   * GET /test-management/integrations/:integrationId/checkmate/metadata/labels?projectId=100
   * Fetch all Checkmate labels for a project
   */
  router.get('/integrations/:integrationId/checkmate/metadata/labels', controller.getLabels);

  /**
   * GET /test-management/integrations/:integrationId/checkmate/metadata/squads?projectId=100
   * Fetch all Checkmate squads for a project
   */
  router.get('/integrations/:integrationId/checkmate/metadata/squads', controller.getSquads);

  return router;
};

