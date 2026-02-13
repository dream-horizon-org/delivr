/**
 * Slack Channel Configuration Controller
 * HTTP handlers for channel configuration endpoints
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { CommConfigService } from '~services/integrations/comm/comm-config';
import type {
  CreateChannelConfigDto,
  UpdateStageChannelsDto,
  StageChannelMapping,
  SlackChannel
} from '~types/integrations/comm';
import {
  getErrorStatusCode,
  successMessageResponse,
  successResponse,
  simpleErrorResponse,
  notFoundResponse,
  detailedErrorResponse,
  buildValidationErrorResponse
} from '~utils/response.utils';
import { hasErrorCode } from '~utils/error.utils';
import { COMM_CONFIG_ERROR_MESSAGES, COMM_CONFIG_SUCCESS_MESSAGES } from './comm-config.constants';
import {
  validateCreateConfig,
  validateUpdateConfig
} from './comm-config.validation';

/**
 * Handler: Create channel configuration
 * POST /tenants/:tenantId/integrations/slack/channel-config
 */
const createConfigHandler = (service: CommConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const { channelData } = req.body;

      // Validate with Yup schema
      const validationResult = await validateCreateConfig({
        tenantId,
        channelData
      });

      // If validation failed, send error response
      if (validationResult.success === false) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          buildValidationErrorResponse('Request validation failed', validationResult.errors)
        );
        return;
      }

      const validated = validationResult.data;

      // Build DTO
      const data: CreateChannelConfigDto = {
        tenantId: validated.tenantId,
        channelData: validated.channelData as StageChannelMapping
      };

      const config = await service.createConfig(data);

      res.status(HTTP_STATUS.CREATED).json(successResponse(config));
    } catch (error: unknown) {
      console.error('[Comm Config] Failed to create config:', error);

      // Handle errors with proper status code
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_create_failed';
      const errorMessage = error instanceof Error ? error.message : COMM_CONFIG_ERROR_MESSAGES.CREATE_CONFIG_FAILED;
      
      res.status(statusCode).json(
        detailedErrorResponse(
          errorMessage,
          errorCode,
          [errorMessage]
        )
      );
    }
  };

/**
 * Handler: List Configs for Tenant
 * GET /tenants/:tenantId/integrations/slack/channel-config
 */
const listConfigsHandler = (service: CommConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          simpleErrorResponse('Tenant ID is required in request parameters', 'missing_tenant_id')
        );
        return;
      }

      const configs = await service.listConfigsByTenant(tenantId);
      res.status(HTTP_STATUS.OK).json(successResponse(configs));
    } catch (error: unknown) {
      console.error('[Comm Config] Failed to list configs:', error);
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_fetch_failed';
      const errorMessage = error instanceof Error ? error.message : COMM_CONFIG_ERROR_MESSAGES.FETCH_CONFIG_FAILED;
      
      res.status(statusCode).json(
        detailedErrorResponse(
          errorMessage,
          errorCode,
          [errorMessage]
        )
      );
    }
  };

/**
 * Handler: Get channel configuration by ID
 * POST /tenants/:tenantId/integrations/slack/channel-config/get
 */
const getConfigHandler = (service: CommConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.body;

      if (!id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          simpleErrorResponse('Configuration ID is required in request body', 'missing_config_id')
        );
        return;
      }

      const config = await service.getConfigById(id);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Channel configuration', 'config_not_found')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error: unknown) {
      console.error('[Comm Config] Failed to get config:', error);
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_fetch_failed';
      const errorMessage = error instanceof Error ? error.message : COMM_CONFIG_ERROR_MESSAGES.FETCH_CONFIG_FAILED;
      
      res.status(statusCode).json(
        detailedErrorResponse(
          errorMessage,
          errorCode,
          [errorMessage]
        )
      );
    }
  };

/**
 * Handler: Delete channel configuration
 * POST /tenants/:tenantId/integrations/slack/channel-config/delete
 */
const deleteConfigHandler = (service: CommConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.body;

      if (!id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          simpleErrorResponse('Configuration ID is required in request body', 'missing_config_id')
        );
        return;
      }

      const deleted = await service.deleteConfig(id);

      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Channel configuration', 'config_not_found')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(COMM_CONFIG_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error: unknown) {
      console.error('[Comm Config] Failed to delete config:', error);
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_delete_failed';
      const errorMessage = error instanceof Error ? error.message : COMM_CONFIG_ERROR_MESSAGES.DELETE_CONFIG_FAILED;
      
      res.status(statusCode).json(
        detailedErrorResponse(
          errorMessage,
          errorCode,
          [errorMessage]
        )
      );
    }
  };

/**
 * Handler: Update channel configuration (add/remove channels)
 * POST /tenants/:tenantId/integrations/slack/channel-config/update
 */
const updateConfigHandler = (service: CommConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, stage, action, channels } = req.body;

      // Validate with Yup schema
      const validationResult = await validateUpdateConfig({
        id,
        stage,
        action,
        channels
      });

      // If validation failed, send error response
      if (validationResult.success === false) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          buildValidationErrorResponse('Request validation failed', validationResult.errors)
        );
        return;
      }

      const validated = validationResult.data;

      const data: UpdateStageChannelsDto = {
        id: validated.id,
        stage: validated.stage,
        action: validated.action as 'add' | 'remove',
        channels: validated.channels as SlackChannel[]
      };

      const updatedConfig = await service.updateStageChannels(data);

      if (!updatedConfig) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Channel configuration', 'config_not_found')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(updatedConfig));
    } catch (error: unknown) {
      console.error('[Comm Config] Failed to update config:', error);

      // Handle errors with proper status code
      const statusCode = getErrorStatusCode(error);
      const errorCode = hasErrorCode(error) ? error.code : 'config_update_failed';
      const errorMessage = error instanceof Error ? error.message : COMM_CONFIG_ERROR_MESSAGES.UPDATE_CONFIG_FAILED;
      
      res.status(statusCode).json(
        detailedErrorResponse(
          errorMessage,
          errorCode,
          [errorMessage]
        )
      );
    }
  };

/**
 * Create channel config controller with service dependencies
 */
export const createCommConfigController = (service: CommConfigService) => ({
  createConfig: createConfigHandler(service),
  listConfigs: listConfigsHandler(service),
  getConfig: getConfigHandler(service),
  updateConfig: updateConfigHandler(service),
  deleteConfig: deleteConfigHandler(service)
});
