/**
 * Test Management Metadata Controller
 * 
 * Handles HTTP requests for fetching metadata from test management providers
 * Acts as a secure proxy to avoid exposing credentials to frontend
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { TestManagementMetadataService } from '~services/integrations/test-management/metadata';
import { errorResponse, successResponse } from '~utils/response.utils';
import { validateProjectId } from './metadata.validation';

export const createMetadataController = (metadataService: TestManagementMetadataService) => {
  return {
    getProjects: getProjectsHandler(metadataService),
    getSections: getSectionsHandler(metadataService),
    getLabels: getLabelsHandler(metadataService),
    getSquads: getSquadsHandler(metadataService)
  };
};

/**
 * Get all projects for organization
 * GET /api/v1/integrations/:integrationId/metadata/projects
 */
const getProjectsHandler = (metadataService: TestManagementMetadataService) => async (req: Request, res: Response): Promise<void> => {
  try {
    const integrationId = req.params.integrationId;

    if (!integrationId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse('integrationId is required')
      );
      return;
    }

    const response = await metadataService.getProjects(integrationId);
    
    res.status(HTTP_STATUS.OK).json(
      successResponse(response.data)
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects';
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      errorResponse(errorMessage)
    );
  }
};

/**
 * Get all sections for a project
 * GET /api/v1/integrations/:integrationId/metadata/sections?projectId=100
 */
const getSectionsHandler = (metadataService: TestManagementMetadataService) => async (req: Request, res: Response): Promise<void> => {
  try {
    const integrationId = req.params.integrationId;
    const projectIdParam = req.query.projectId as string;

    if (!integrationId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse('integrationId is required')
      );
      return;
    }

    const projectIdError = validateProjectId(projectIdParam);
    if (projectIdError) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse(projectIdError)
      );
      return;
    }

    const projectId = parseInt(projectIdParam, 10);
    const response = await metadataService.getSections(integrationId, projectId);
    
    res.status(HTTP_STATUS.OK).json(
      successResponse(response.data)
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch sections';
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      errorResponse(errorMessage)
    );
  }
};

/**
 * Get all labels for a project
 * GET /api/v1/integrations/:integrationId/metadata/labels?projectId=100
 */
const getLabelsHandler = (metadataService: TestManagementMetadataService) => async (req: Request, res: Response): Promise<void> => {
  try {
    const integrationId = req.params.integrationId;
    const projectIdParam = req.query.projectId as string;

    if (!integrationId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse('integrationId is required')
      );
      return;
    }

    const projectIdError = validateProjectId(projectIdParam);
    if (projectIdError) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse(projectIdError)
      );
      return;
    }

    const projectId = parseInt(projectIdParam, 10);
    const response = await metadataService.getLabels(integrationId, projectId);
    
    res.status(HTTP_STATUS.OK).json(
      successResponse(response.data)
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch labels';
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      errorResponse(errorMessage)
    );
  }
};

/**
 * Get all squads for a project
 * GET /api/v1/integrations/:integrationId/metadata/squads?projectId=100
 */
const getSquadsHandler = (metadataService: TestManagementMetadataService) => async (req: Request, res: Response): Promise<void> => {
  try {
    const integrationId = req.params.integrationId;
    const projectIdParam = req.query.projectId as string;

    if (!integrationId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse('integrationId is required')
      );
      return;
    }

    const projectIdError = validateProjectId(projectIdParam);
    if (projectIdError) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse(projectIdError)
      );
      return;
    }

    const projectId = parseInt(projectIdParam, 10);
    const response = await metadataService.getSquads(integrationId, projectId);
    
    res.status(HTTP_STATUS.OK).json(
      successResponse(response.data)
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch squads';
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      errorResponse(errorMessage)
    );
  }
};

