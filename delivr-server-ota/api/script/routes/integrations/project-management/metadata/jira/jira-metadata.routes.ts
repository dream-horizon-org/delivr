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
   * GET /tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/projects
   * Fetch all Jira projects
   */
  router.get(
    '/tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/projects',
    tenantPermissions.requireEditor({ storage }),
    controller.getProjects
  );

  /**
   * GET /tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/project-metadata?projectKey=PROJ
   * Fetch statuses AND issue types for a Jira project in one call
   * This is the combined endpoint that reduces network calls from 2 to 1
   */
  router.get(
    '/tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/project-metadata',
    tenantPermissions.requireEditor({ storage }),
    controller.getProjectMetadata
  );

  return router;
};

