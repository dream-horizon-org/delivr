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
  errorResponse,
  getErrorStatusCode,
  notFoundResponse,
  successMessageResponse,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import { COMM_CONFIG_ERROR_MESSAGES, COMM_CONFIG_SUCCESS_MESSAGES } from './comm-config.constants';
import {
  validateChannelsArray,
  validateStageChannelMapping,
  validateStageName,
  validateUpdateAction
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

      // Build DTO
      const data: CreateChannelConfigDto = {
        tenantId,
        channelData: channelData as StageChannelMapping
      };

      // Validate using service method
      const validationResult = service.validateConfig(data);

      // If validation failed, return structured validation response
      if (!validationResult.isValid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(validationResult);
        return;
      }

      const config = await service.createConfig(data);

      res.status(HTTP_STATUS.CREATED).json(successResponse(config));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_CONFIG_ERROR_MESSAGES.CREATE_CONFIG_FAILED)
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
          validationErrorResponse('tenantId', 'Tenant ID is required')
        );
        return;
      }

      const configs = await service.listConfigsByTenant(tenantId);
      res.status(HTTP_STATUS.OK).json(successResponse(configs));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_CONFIG_ERROR_MESSAGES.FETCH_CONFIG_FAILED)
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
          validationErrorResponse('id', 'Configuration ID is required')
        );
        return;
      }

      const config = await service.getConfigById(id);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Channel configuration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_CONFIG_ERROR_MESSAGES.FETCH_CONFIG_FAILED)
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
          validationErrorResponse('id', 'Configuration ID is required')
        );
        return;
      }

      const deleted = await service.deleteConfig(id);

      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Channel configuration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(COMM_CONFIG_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_CONFIG_ERROR_MESSAGES.DELETE_CONFIG_FAILED)
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

      if (!id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('id', 'Configuration ID is required')
        );
        return;
      }

      const stageError = validateStageName(stage);
      if (stageError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('stage', stageError)
        );
        return;
      }

      const actionError = validateUpdateAction(action);
      if (actionError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('action', actionError)
        );
        return;
      }

      const channelsError = validateChannelsArray(channels);
      if (channelsError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('channels', channelsError)
        );
        return;
      }

      const data: UpdateStageChannelsDto = {
        id,
        stage,
        action: action as 'add' | 'remove',
        channels: channels as SlackChannel[]
      };

      const updatedConfig = await service.updateStageChannels(data);

      if (!updatedConfig) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Channel configuration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(updatedConfig));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_CONFIG_ERROR_MESSAGES.UPDATE_CONFIG_FAILED)
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
