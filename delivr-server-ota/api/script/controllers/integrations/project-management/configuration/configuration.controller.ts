import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { ProjectManagementConfigService } from '~services/integrations/project-management';
import { PROJECT_MANAGEMENT_ERROR_MESSAGES, PROJECT_MANAGEMENT_SUCCESS_MESSAGES } from '~services/integrations/project-management';
import type {
  CreateProjectManagementConfigDto,
  UpdateProjectManagementConfigDto
} from '~types/integrations/project-management';
import {
  errorResponse,
  getErrorStatusCode,
  notFoundResponse,
  successMessageResponse,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import {
  validateConfigName,
  validatePlatformConfigurations
} from './configuration.validation';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

/**
 * Create new project management configuration
 * POST /apps/:appId/project-management/configs
 */
const createConfigHandler = (service: ProjectManagementConfigService) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      const { integrationId, name, description, platformConfigurations } = req.body;

      // Validate name
      const nameError = validateConfigName(name);
      if (nameError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse('name', nameError));
        return;
      }

      // Validate integrationId
      if (typeof integrationId !== 'string' || !integrationId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('integrationId', 'Integration ID is required')
        );
        return;
      }

      // Validate platform configurations
      const platformError = validatePlatformConfigurations(platformConfigurations);
      if (platformError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platformConfigurations', platformError)
        );
        return;
      }

      const data: CreateProjectManagementConfigDto = {
        appId,
        integrationId,
        name,
        description,
        platformConfigurations,
        createdByAccountId: req.user?.id
      };

      const config = await service.createConfig(data);

      res.status(HTTP_STATUS.CREATED).json(successResponse(config));
    } catch (error) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse(error, PROJECT_MANAGEMENT_ERROR_MESSAGES.CREATE_CONFIG_FAILED)
      );
    }
  };

/**
 * List all configurations for a tenant
 * GET /apps/:appId/project-management/configs
 */
const listConfigsHandler = (service: ProjectManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;

      const configs = await service.listConfigsByProject(appId);

      res.status(HTTP_STATUS.OK).json(successResponse(configs));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to list project management configurations')
      );
    }
  };

/**
 * Get single configuration by ID
 * GET /apps/:appId/project-management/configs/:configId
 */
const getConfigHandler = (service: ProjectManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      const config = await service.getConfigById(configId);
      const configNotFound = !config;

      if (configNotFound) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Project management configuration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to get project management configuration')
      );
    }
  };

/**
 * Update configuration
 * PUT /apps/:appId/project-management/configs/:configId
 */
const updateConfigHandler = (service: ProjectManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;
      const { name, description, platformConfigurations, isActive } = req.body;

      // Validate name if provided
      if (name !== undefined) {
        const nameError = validateConfigName(name);
        if (nameError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse('name', nameError));
          return;
        }
      }

      // Validate platform configurations if provided
      if (platformConfigurations !== undefined) {
        const platformError = validatePlatformConfigurations(platformConfigurations);
        if (platformError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('platformConfigurations', platformError)
          );
          return;
        }
      }

      const data: UpdateProjectManagementConfigDto = {
        name,
        description,
        platformConfigurations,
        isActive
      };

      const config = await service.updateConfig(configId, data);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Project management configuration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        errorResponse(error, PROJECT_MANAGEMENT_ERROR_MESSAGES.UPDATE_CONFIG_FAILED)
      );
    }
  };

/**
 * Delete configuration
 * DELETE /apps/:appId/project-management/configs/:configId
 */
const deleteConfigHandler = (service: ProjectManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      const deleted = await service.deleteConfig(configId);
      const configNotFound = !deleted;

      if (configNotFound) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Project management configuration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(PROJECT_MANAGEMENT_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, PROJECT_MANAGEMENT_ERROR_MESSAGES.DELETE_CONFIG_FAILED)
      );
    }
  };

/**
 * Verify configuration
 * POST /apps/:appId/project-management/configs/:configId/verify
 */
const verifyConfigHandler = (service: ProjectManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      const result = await service.verifyConfig(configId);

      res.status(HTTP_STATUS.OK).json(successResponse(result));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, PROJECT_MANAGEMENT_ERROR_MESSAGES.VERIFY_CONFIG_FAILED)
      );
    }
  };

/**
 * Create and export controller
 */
export const createProjectManagementConfigController = (
  service: ProjectManagementConfigService
) => ({
  createConfig: createConfigHandler(service),
  listConfigs: listConfigsHandler(service),
  getConfig: getConfigHandler(service),
  updateConfig: updateConfigHandler(service),
  deleteConfig: deleteConfigHandler(service),
  verifyConfig: verifyConfigHandler(service)
});

