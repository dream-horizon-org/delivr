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
import { validateCheckmateProjectId } from './checkmate-metadata.validation';

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
    
    // Checkmate returns projects directly as an array in response.data
    const projects = response.data || [];
    
    res.status(HTTP_STATUS.OK).json(
      successResponse(projects)
    );
  } catch (error) {
    console.error('[Checkmate Metadata] Failed to fetch projects:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      errorResponse(error, 'Failed to fetch projects')
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

    const projectIdError = validateCheckmateProjectId(projectIdParam);
    if (projectIdError) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse(projectIdError)
      );
      return;
    }

    const projectId = parseInt(String(projectIdParam), 10);
    const response = await metadataService.getSections(integrationId, projectId);
    
    // Extract sections array from Checkmate's response structure
    const sections = response.data || [];
    
    res.status(HTTP_STATUS.OK).json(
      successResponse(sections)
    );
  } catch (error) {
    console.error('[Checkmate Metadata] Failed to fetch sections:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      errorResponse(error, 'Failed to fetch sections')
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

    const projectIdError = validateCheckmateProjectId(projectIdParam);
    if (projectIdError) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse(projectIdError)
      );
      return;
    }

    const projectId = parseInt(String(projectIdParam), 10);
    const response = await metadataService.getLabels(integrationId, projectId);
    
    // Extract labels array from Checkmate's response structure
    const labels = response.data || [];
    
    res.status(HTTP_STATUS.OK).json(
      successResponse(labels)
    );
  } catch (error) {
    console.error('[Checkmate Metadata] Failed to fetch labels:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      errorResponse(error, 'Failed to fetch labels')
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

    const projectIdError = validateCheckmateProjectId(projectIdParam);
    if (projectIdError) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse(projectIdError)
      );
      return;
    }

    const projectId = parseInt(String(projectIdParam), 10);
    const response = await metadataService.getSquads(integrationId, projectId);
    
    // Extract squads array from Checkmate's response structure
    const squads = response.data || [];
    
    res.status(HTTP_STATUS.OK).json(
      successResponse(squads)
    );
  } catch (error) {
    console.error('[Checkmate Metadata] Failed to fetch squads:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      errorResponse(error, 'Failed to fetch squads')
    );
  }
};

