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
    getProjects: getProjectsHandler(metadataService)
  };
};

/**
 * Get all Jira projects
 * GET /apps/:appId/integrations/project-management/:integrationId/jira/metadata/projects
 */
const getProjectsHandler = (metadataService: JiraMetadataService) => async (req: Request, res: Response): Promise<void> => {
  try {
    const integrationId = req.params.integrationId;
    const appId = req.params.appId;

    if (!integrationId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse('integrationId is required')
      );
      return;
    }

    if (!appId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse('appId is required')
      );
      return;
    }

    const projects = await metadataService.getProjects(integrationId, appId);
    
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

