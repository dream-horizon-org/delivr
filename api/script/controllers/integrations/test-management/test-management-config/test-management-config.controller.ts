/**
 * Test Management Config Controller
 * HTTP handlers for test management configuration endpoints
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { TestManagementConfigService } from '~services/integrations/test-management/test-management-config';
import type { CreateTestManagementConfigDto } from '~types/integrations/test-management/test-management-config';
import { errorResponse, getErrorStatusCode, notFoundResponse, successMessageResponse, successResponse, validationErrorResponse } from '~utils/response.utils';
import { TEST_MANAGEMENT_ERROR_MESSAGES, TEST_MANAGEMENT_SUCCESS_MESSAGES } from '../constants';
import {
  validateConfigName,
  validateIntegrationId,
  validatePassThresholdPercent,
  validatePlatformConfigurations,
  validateProjectId
} from './test-management-config.validation';

type AuthenticatedRequest = Request & {
  accountId?: string;
};

/**
 * Handler: Create test management config
 * POST /test-management/projects/:projectId/configs
 */
const createConfigHandler = (service: TestManagementConfigService) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { integrationId, name, passThresholdPercent, platformConfigurations } = req.body;

      const projectIdError = validateProjectId(projectId);
      if (projectIdError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('projectId', projectIdError)
        );
        return;
      }

      const integrationIdError = validateIntegrationId(integrationId);
      if (integrationIdError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('integrationId', integrationIdError)
        );
        return;
      }

      const nameError = validateConfigName(name);
      if (nameError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('name', nameError)
        );
        return;
      }

      const thresholdError = validatePassThresholdPercent(passThresholdPercent);
      if (thresholdError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('passThresholdPercent', thresholdError)
        );
        return;
      }

      const platformConfigsError = validatePlatformConfigurations(platformConfigurations);
      if (platformConfigsError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platformConfigurations', platformConfigsError)
        );
        return;
      }

      const data: CreateTestManagementConfigDto = {
        projectId,
        integrationId,
        name,
        passThresholdPercent,
        platformConfigurations,
        createdByAccountId: req.accountId
      };

      const config = await service.createConfig(data);

      res.status(HTTP_STATUS.CREATED).json(successResponse(config));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.CREATE_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: Get config by ID
 */
const getConfigByIdHandler = (service: TestManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const config = await service.getConfigById(id);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Test management config')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.GET_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: List configs by project
 * GET /test-management/projects/:projectId/configs
 */
const listConfigsByProjectHandler = (service: TestManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      const projectIdError = validateProjectId(projectId);
      if (projectIdError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('projectId', projectIdError)
        );
        return;
      }

      const configs = await service.listConfigsByProject(projectId);

      res.status(HTTP_STATUS.OK).json(successResponse(configs));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.LIST_CONFIGS_FAILED)
      );
    }
  };

/**
 * Handler: Update config
 */
const updateConfigHandler = (service: TestManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, passThresholdPercent, platformConfigurations } = req.body;

      if (name !== undefined) {
        const nameError = validateConfigName(name);
        if (nameError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('name', nameError)
          );
          return;
        }
      }

      if (passThresholdPercent !== undefined) {
        const thresholdError = validatePassThresholdPercent(passThresholdPercent);
        if (thresholdError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('passThresholdPercent', thresholdError)
          );
          return;
        }
      }

      if (platformConfigurations !== undefined) {
        const platformConfigsError = validatePlatformConfigurations(platformConfigurations);
        if (platformConfigsError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('platformConfigurations', platformConfigsError)
          );
          return;
        }
      }

      const config = await service.updateConfig(id, {
        name,
        passThresholdPercent,
        platformConfigurations
      });

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Test management config')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.UPDATE_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: Delete config
 */
const deleteConfigHandler = (service: TestManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const deleted = await service.deleteConfig(id);

      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Test management config')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(TEST_MANAGEMENT_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.DELETE_CONFIG_FAILED)
      );
    }
  };

/**
 * Factory: Create controller with all handlers
 */
export const createTestManagementConfigController = (service: TestManagementConfigService) => ({
  createConfig: createConfigHandler(service),
  getConfigById: getConfigByIdHandler(service),
  listConfigsByProject: listConfigsByProjectHandler(service),
  updateConfig: updateConfigHandler(service),
  deleteConfig: deleteConfigHandler(service)
});

