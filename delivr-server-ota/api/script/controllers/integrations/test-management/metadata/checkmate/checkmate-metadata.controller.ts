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
import { successResponse, simpleErrorResponse } from '~utils/response.utils';
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
  const integrationId = req.params.integrationId;

  if (!integrationId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('integrationId is required', 'missing_integration_id')
    );
    return;
  }

  const result = await metadataService.getProjects(integrationId);
  
  if (result.success && result.data) {
    // Checkmate returns projects in nested structure: response.data.projectsList
    const projects = result.data.data.projectsList || [];
    res.status(HTTP_STATUS.OK).json(successResponse(projects));
  } else {
    const statusCode = result.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = result.message || 'Failed to fetch Checkmate projects';
    res.status(statusCode).json(
      simpleErrorResponse(message, 'fetch_projects_failed')
    );
  }
};

/**
 * Get all Checkmate sections for a project
 * GET /integrations/test-management/:integrationId/checkmate/metadata/sections?projectId=100
 */
const getSectionsHandler = (metadataService: CheckmateMetadataService) => async (req: Request, res: Response): Promise<void> => {
  const integrationId = req.params.integrationId;
  const projectIdParam = req.query.projectId;

  if (!integrationId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('integrationId is required', 'missing_integration_id')
    );
    return;
  }

  const projectIdError = validateCheckmateProjectId(projectIdParam);
  if (projectIdError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(projectIdError, 'invalid_project_id')
    );
    return;
  }

  const projectId = parseInt(String(projectIdParam), 10);
  const result = await metadataService.getSections(integrationId, projectId);
  
  if (result.success && result.data) {
    // Extract sections array from Checkmate's response structure
    const sections = result.data.data || [];
    res.status(HTTP_STATUS.OK).json(successResponse(sections));
  } else {
    const statusCode = result.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = result.message || 'Failed to fetch Checkmate sections';
    res.status(statusCode).json(
      simpleErrorResponse(message, 'fetch_sections_failed')
    );
  }
};

/**
 * Get all Checkmate labels for a project
 * GET /integrations/test-management/:integrationId/checkmate/metadata/labels?projectId=100
 */
const getLabelsHandler = (metadataService: CheckmateMetadataService) => async (req: Request, res: Response): Promise<void> => {
  const integrationId = req.params.integrationId;
  const projectIdParam = req.query.projectId;

  if (!integrationId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('integrationId is required', 'missing_integration_id')
    );
    return;
  }

  const projectIdError = validateCheckmateProjectId(projectIdParam);
  if (projectIdError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(projectIdError, 'invalid_project_id')
    );
    return;
  }

  const projectId = parseInt(String(projectIdParam), 10);
  const result = await metadataService.getLabels(integrationId, projectId);
  
  if (result.success && result.data) {
    // Extract labels array from Checkmate's response structure
    const labels = result.data.data || [];
    res.status(HTTP_STATUS.OK).json(successResponse(labels));
  } else {
    const statusCode = result.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = result.message || 'Failed to fetch Checkmate labels';
    res.status(statusCode).json(
      simpleErrorResponse(message, 'fetch_labels_failed')
    );
  }
};

/**
 * Get all Checkmate squads for a project (Checkmate-specific feature)
 * GET /integrations/test-management/:integrationId/checkmate/metadata/squads?projectId=100
 */
const getSquadsHandler = (metadataService: CheckmateMetadataService) => async (req: Request, res: Response): Promise<void> => {
  const integrationId = req.params.integrationId;
  const projectIdParam = req.query.projectId;

  if (!integrationId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('integrationId is required', 'missing_integration_id')
    );
    return;
  }

  const projectIdError = validateCheckmateProjectId(projectIdParam);
  if (projectIdError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(projectIdError, 'invalid_project_id')
    );
    return;
  }

  const projectId = parseInt(String(projectIdParam), 10);
  const result = await metadataService.getSquads(integrationId, projectId);
  
  if (result.success && result.data) {
    // Extract squads array from Checkmate's response structure
    const squads = result.data.data || [];
    res.status(HTTP_STATUS.OK).json(successResponse(squads));
  } else {
    const statusCode = result.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = result.message || 'Failed to fetch Checkmate squads';
    res.status(statusCode).json(
      simpleErrorResponse(message, 'fetch_squads_failed')
    );
  }
};

