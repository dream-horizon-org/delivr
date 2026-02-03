/**
 * Jira Metadata Controller
 * 
 * Handles HTTP requests for fetching metadata from Jira
 * Acts as a secure proxy to avoid exposing credentials to frontend
 * 
 * Note: These endpoints are Jira-specific and will validate that the
 * integration is of type JIRA before fetching metadata
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { JiraMetadataService } from '~services/integrations/project-management/metadata/jira';
import { successResponse, simpleErrorResponse } from '~utils/response.utils';

export const createJiraMetadataController = (metadataService: JiraMetadataService) => {
  return {
    getProjects: getProjectsHandler(metadataService)
  };
};

/**
 * Get all Jira projects
 * GET /tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/projects
 */
const getProjectsHandler = (metadataService: JiraMetadataService) => async (req: Request, res: Response): Promise<void> => {
  const integrationId = req.params.integrationId;
  const tenantId = req.params.tenantId;

  if (!integrationId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('integrationId is required', 'missing_integration_id')
    );
    return;
  }

  if (!tenantId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('tenantId is required', 'missing_tenant_id')
    );
    return;
  }

  const result = await metadataService.getProjects(integrationId, tenantId);
  
  if (result.success && result.data) {
    res.status(HTTP_STATUS.OK).json(successResponse(result.data));
  } else {
    const statusCode = result.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = result.message || 'Failed to fetch Jira projects';
    res.status(statusCode).json(
      simpleErrorResponse(message, 'fetch_projects_failed')
    );
  }
};

