/**
 * Slack Channel Configuration Controller
 * HTTP handlers for channel configuration endpoints
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { CommConfigService } from '~services/integrations/comm/comm-config';
import type {
  CreateChannelConfigDto,
  UpdateStageChannelsDto
} from '~types/integrations/comm';
import {
  getErrorStatusCode,
  successMessageResponse,
  successResponse
} from '~utils/response.utils';
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
      const validated = await validateCreateConfig({
        tenantId,
        channelData
      }, res);

      // If validation failed, response already sent
      if (!validated) {
        return;
      }

      // Build DTO
      const data: CreateChannelConfigDto = {
        tenantId: validated.tenantId,
        channelData: validated.channelData as any
      };

      const config = await service.createConfig(data);

      res.status(HTTP_STATUS.CREATED).json(successResponse(config));
    } catch (error: any) {
      console.error('[Comm Config] Failed to create config:', error);

      // Handle errors with proper status code
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || COMM_CONFIG_ERROR_MESSAGES.CREATE_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_create_failed',
          message: error.message || 'An unexpected error occurred while creating the configuration'
        }
      });
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
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Tenant ID is required',
          details: {
            errorCode: 'missing_tenant_id',
            message: 'Tenant ID is required in request parameters'
          }
        });
        return;
      }

      const configs = await service.listConfigsByTenant(tenantId);
      res.status(HTTP_STATUS.OK).json(successResponse(configs));
    } catch (error: any) {
      console.error('[Comm Config] Failed to list configs:', error);
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || COMM_CONFIG_ERROR_MESSAGES.FETCH_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_fetch_failed',
          message: error.message || 'An unexpected error occurred while fetching configurations'
        }
      });
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
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Configuration ID is required',
          details: {
            errorCode: 'missing_config_id',
            message: 'Configuration ID is required in request body'
          }
        });
        return;
      }

      const config = await service.getConfigById(id);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Channel configuration not found',
          details: {
            errorCode: 'config_not_found',
            message: 'The requested channel configuration does not exist'
          }
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error: any) {
      console.error('[Comm Config] Failed to get config:', error);
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || COMM_CONFIG_ERROR_MESSAGES.FETCH_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_fetch_failed',
          message: error.message || 'An unexpected error occurred while fetching the configuration'
        }
      });
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
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Configuration ID is required',
          details: {
            errorCode: 'missing_config_id',
            message: 'Configuration ID is required in request body'
          }
        });
        return;
      }

      const deleted = await service.deleteConfig(id);

      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Channel configuration not found',
          details: {
            errorCode: 'config_not_found',
            message: 'The requested channel configuration does not exist'
          }
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(COMM_CONFIG_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error: any) {
      console.error('[Comm Config] Failed to delete config:', error);
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || COMM_CONFIG_ERROR_MESSAGES.DELETE_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_delete_failed',
          message: error.message || 'An unexpected error occurred while deleting the configuration'
        }
      });
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
      const validated = await validateUpdateConfig({
        id,
        stage,
        action,
        channels
      }, res);

      // If validation failed, response already sent
      if (!validated) {
        return;
      }

      const data: UpdateStageChannelsDto = {
        id: validated.id,
        stage: validated.stage,
        action: validated.action as 'add' | 'remove',
        channels: validated.channels as any
      };

      const updatedConfig = await service.updateStageChannels(data);

      if (!updatedConfig) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Channel configuration not found',
          details: {
            errorCode: 'config_not_found',
            message: 'The requested channel configuration does not exist'
          }
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(updatedConfig));
    } catch (error: any) {
      console.error('[Comm Config] Failed to update config:', error);

      // Handle errors with proper status code
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || COMM_CONFIG_ERROR_MESSAGES.UPDATE_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_update_failed',
          message: error.message || 'An unexpected error occurred while updating the configuration'
        }
      });
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
