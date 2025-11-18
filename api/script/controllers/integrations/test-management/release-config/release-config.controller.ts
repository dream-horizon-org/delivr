import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { TestManagementConfigService } from '~services/integrations/test-management/release-config.service';
import {
  errorResponse,
  getErrorStatusCode,
  notFoundResponse,
  successMessageResponse,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import { TEST_MANAGEMENT_ERROR_MESSAGES, TEST_MANAGEMENT_SUCCESS_MESSAGES } from '../constants';
import { validatePassThresholdPercent, validatePlatformConfigurations } from './release-config.validation';

interface AuthenticatedRequest extends Request {
  accountId?: string;
}

/**
 * Get test management configuration for a release config
 * GET /release-configs/:releaseConfigId/test-management
 */
const getConfigHandler = (service: TestManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { releaseConfigId } = req.params;

      const config = await service.getConfig(releaseConfigId);

      res.status(HTTP_STATUS.OK).json(successResponse(config)); // null if not configured
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.GET_CONFIG_FAILED)
      );
    }
  };

/**
 * Set/Update test management configuration (UPSERT)
 * PUT /release-configs/:releaseConfigId/test-management
 * 
 * Body: {
 *   integrationId: string,
 *   passThresholdPercent: number,
 *   platformConfigurations: [
 *     { platform: "ios", parameters: { projectId: 42, ... } },
 *     { platform: "android-web", parameters: { projectId: 43, ... } }
 *   ]
 * }
 */
const setConfigHandler = (service: TestManagementConfigService) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { releaseConfigId } = req.params;
      const { integrationId, passThresholdPercent, platformConfigurations } = req.body;

      // Validate integrationId
      if (!integrationId || typeof integrationId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('integrationId', 'integrationId is required and must be a string')
        );
        return;
      }

      // Validate passThresholdPercent
      const thresholdError = validatePassThresholdPercent(passThresholdPercent);
      if (thresholdError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('passThresholdPercent', thresholdError)
        );
        return;
      }

      // Validate platformConfigurations (JSONB structure)
      const platformConfigsError = validatePlatformConfigurations(platformConfigurations);
      if (platformConfigsError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platformConfigurations', platformConfigsError)
        );
        return;
      }

      const config = await service.setConfig({
        releaseConfigId,
        integrationId,
        passThresholdPercent,
        platformConfigurations,
        createdByAccountId: req.accountId
      });

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.SET_CONFIG_FAILED)
      );
    }
  };

/**
 * Delete test management configuration
 * DELETE /release-configs/:releaseConfigId/test-management
 */
const deleteConfigHandler = (service: TestManagementConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { releaseConfigId } = req.params;

      const deleted = await service.deleteConfig(releaseConfigId);
      const configNotFound = !deleted;

      if (configNotFound) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Test management configuration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(TEST_MANAGEMENT_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.DELETE_CONFIG_FAILED));
    }
  };

export const createTestManagementConfigController = (service: TestManagementConfigService) => ({
  getConfig: getConfigHandler(service),
  setConfig: setConfigHandler(service),
  deleteConfig: deleteConfigHandler(service)
});

