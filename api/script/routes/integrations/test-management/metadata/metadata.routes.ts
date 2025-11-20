/**
 * Test Management Metadata Routes
 * Proxy routes for fetching metadata from test management providers
 */

import { Router } from 'express';
import { createMetadataController } from '~controllers/integrations/test-management/metadata';
import type { TestManagementMetadataService } from '~services/integrations/test-management/metadata';

export const createMetadataRoutes = (metadataService: TestManagementMetadataService): Router => {
  const router = Router();
  const controller = createMetadataController(metadataService);

  /**
   * GET /api/v1/integrations/:integrationId/metadata/projects
   * Fetch all projects for organization
   */
  router.get('/:integrationId/metadata/projects', controller.getProjects);

  /**
   * GET /api/v1/integrations/:integrationId/metadata/sections?projectId=100
   * Fetch all sections for a project
   */
  router.get('/:integrationId/metadata/sections', controller.getSections);

  /**
   * GET /api/v1/integrations/:integrationId/metadata/labels?projectId=100
   * Fetch all labels for a project
   */
  router.get('/:integrationId/metadata/labels', controller.getLabels);

  /**
   * GET /api/v1/integrations/:integrationId/metadata/squads?projectId=100
   * Fetch all squads for a project
   */
  router.get('/:integrationId/metadata/squads', controller.getSquads);

  return router;
};

