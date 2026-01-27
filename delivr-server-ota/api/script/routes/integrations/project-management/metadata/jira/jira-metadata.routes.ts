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
   * GET /tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/statuses?projectKey=PROJ
   * Fetch all statuses for a Jira project
   */
  router.get(
    '/tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/statuses',
    tenantPermissions.requireEditor({ storage }),
    controller.getProjectStatuses
  );

  /**
   * GET /tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/issue-types?projectKey=PROJ
   * Fetch all issue types for a Jira project
   */
  router.get(
    '/tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/issue-types',
    tenantPermissions.requireEditor({ storage }),
    controller.getProjectIssueTypes
  );

  return router;
};

