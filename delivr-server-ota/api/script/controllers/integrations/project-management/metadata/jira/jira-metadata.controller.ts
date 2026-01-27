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
import { errorResponse, successResponse } from '~utils/response.utils';

export const createJiraMetadataController = (metadataService: JiraMetadataService) => {
  return {
    getProjects: getProjectsHandler(metadataService),
    getProjectStatuses: getProjectStatusesHandler(metadataService)
  };
};

/**
 * Get all Jira projects
 * GET /tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/projects
 */
const getProjectsHandler = (metadataService: JiraMetadataService) => async (req: Request, res: Response): Promise<void> => {
  try {
    const integrationId = req.params.integrationId;
    const tenantId = req.params.tenantId;

    if (!integrationId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse('integrationId is required')
      );
      return;
    }

    if (!tenantId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse('tenantId is required')
      );
      return;
    }

    const projects = await metadataService.getProjects(integrationId, tenantId);
    
    res.status(HTTP_STATUS.OK).json(
      successResponse(projects)
    );
  } catch (error) {
    console.error('[Jira Metadata] Failed to fetch projects:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      errorResponse(error, 'Failed to fetch Jira projects')
    );
  }
};

/**
 * Get all statuses for a Jira project
 * GET /tenants/:tenantId/integrations/project-management/:integrationId/jira/metadata/statuses?projectKey=PROJ
 */
const getProjectStatusesHandler = (metadataService: JiraMetadataService) => async (req: Request, res: Response): Promise<void> => {
  try {
    const integrationId = req.params.integrationId;
    const tenantId = req.params.tenantId;
    const projectKey = req.query.projectKey as string;

    if (!integrationId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse('integrationId is required')
      );
      return;
    }

    if (!tenantId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse('tenantId is required')
      );
      return;
    }

    if (!projectKey) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse('projectKey is required as query parameter')
      );
      return;
    }

    const statuses = await metadataService.getProjectStatuses(integrationId, projectKey, tenantId);
    
    res.status(HTTP_STATUS.OK).json(
      successResponse(statuses)
    );
  } catch (error) {
    console.error('[Jira Metadata] Failed to fetch project statuses:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      errorResponse(error, 'Failed to fetch Jira project statuses')
    );
  }
};
