/**
 * Jira Metadata Routes
 * All Jira-specific metadata endpoints
 */

import { Router } from 'express';
import { createJiraMetadataController } from '~controllers/integrations/project-management/metadata/jira';
import type { JiraMetadataService } from '~services/integrations/project-management/metadata/jira';
import type { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';

export const createJiraMetadataRoutes = (
  metadataService: JiraMetadataService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createJiraMetadataController(metadataService);

  /**
   * GET /apps/:appId/integrations/project-management/:integrationId/jira/metadata/projects
   * Fetch all Jira projects
   */
  router.get(
    '/apps/:appId/integrations/project-management/:integrationId/jira/metadata/projects',
    tenantPermissions.requireEditor({ storage }),
    controller.getProjects
  );

  return router;
};

