/**
 * Checkmate Metadata Controller
 * 
 * Handles HTTP requests for fetching metadata from Checkmate
 * Acts as a secure proxy to avoid exposing credentials to frontend
 * 
 * Note: These endpoints are Checkmate-specific and will validate that the
 * integration is of type CHECKMATE before fetching metadata
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { CheckmateMetadataService } from '~services/integrations/test-management/metadata/checkmate';
import { errorResponse, successResponse } from '~utils/response.utils';
import { validateProjectId } from './checkmate-metadata.validation';

export const createCheckmateMetadataController = (metadataService: CheckmateMetadataService) => {
  return {
    getProjects: getProjectsHandler(metadataService),
    getSections: getSectionsHandler(metadataService),
    getLabels: getLabelsHandler(metadataService),
    getSquads: getSquadsHandler(metadataService)
  };
};

/**
 * Get all Checkmate projects for organization
 * GET /integrations/test-management/:integrationId/checkmate/metadata/projects
 */
const getProjectsHandler = (metadataService: CheckmateMetadataService) => async (req: Request, res: Response): Promise<void> => {
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
 * Get all Checkmate sections for a project
 * GET /integrations/test-management/:integrationId/checkmate/metadata/sections?projectId=100
 */
const getSectionsHandler = (metadataService: CheckmateMetadataService) => async (req: Request, res: Response): Promise<void> => {
  try {
    const integrationId = req.params.integrationId;
    const projectIdParam = req.query.projectId;

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

    const projectId = parseInt(String(projectIdParam), 10);
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
 * Get all Checkmate labels for a project
 * GET /integrations/test-management/:integrationId/checkmate/metadata/labels?projectId=100
 */
const getLabelsHandler = (metadataService: CheckmateMetadataService) => async (req: Request, res: Response): Promise<void> => {
  try {
    const integrationId = req.params.integrationId;
    const projectIdParam = req.query.projectId;

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

    const projectId = parseInt(String(projectIdParam), 10);
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
 * Get all Checkmate squads for a project (Checkmate-specific feature)
 * GET /integrations/test-management/:integrationId/checkmate/metadata/squads?projectId=100
 */
const getSquadsHandler = (metadataService: CheckmateMetadataService) => async (req: Request, res: Response): Promise<void> => {
  try {
    const integrationId = req.params.integrationId;
    const projectIdParam = req.query.projectId;

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

    const projectId = parseInt(String(projectIdParam), 10);
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

