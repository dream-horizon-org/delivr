/**
 * Slack Integration Controller
 * HTTP handlers for integration management endpoints
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { SlackIntegrationService } from '~services/integrations/comm/slack-integration';
import type { CreateOrUpdateIntegrationDto } from '~types/integrations/comm/slack-integration';
import {
  errorResponse,
  getErrorStatusCode,
  notFoundResponse,
  successMessageResponse,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import { COMM_ERROR_MESSAGES, COMM_SUCCESS_MESSAGES } from '../constants';
import {
  validateBotToken,
  validateBotUserId,
  validateWorkspaceId,
  validateWorkspaceName
} from './slack-integration.validation';

/**
 * Handler: Verify Slack Bot Token
 * POST /tenants/:tenantId/integrations/slack/verify
 */
const verifyTokenHandler = (service: SlackIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { botToken } = req.body;

      const tokenError = validateBotToken(botToken);
      if (tokenError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('botToken', tokenError)
        );
        return;
      }

      const verificationResult = await service.verifyToken(botToken);

      res.status(HTTP_STATUS.OK).json(successResponse({
        verified: verificationResult.isValid,
        message: verificationResult.message,
        workspaceId: verificationResult.workspaceId,
        workspaceName: verificationResult.workspaceName,
        botUserId: verificationResult.botUserId,
        details: verificationResult.details
      }));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_ERROR_MESSAGES.VERIFY_TOKEN_FAILED)
      );
    }
  };

/**
 * Handler: Fetch Slack Channels
 * POST /tenants/:tenantId/integrations/slack/channels
 */
const fetchChannelsHandler = (service: SlackIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { botToken } = req.body;

      const tokenError = validateBotToken(botToken);
      if (tokenError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('botToken', tokenError)
        );
        return;
      }

      const channelsResult = await service.fetchChannels(botToken);

      res.status(HTTP_STATUS.OK).json(successResponse({
        channels: channelsResult.channels ?? [],
        metadata: channelsResult.metadata
      }));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_ERROR_MESSAGES.FETCH_CHANNELS_FAILED)
      );
    }
  };

/**
 * Handler: Create or Update Slack Integration
 * POST /tenants/:tenantId/integrations/slack
 */
const createOrUpdateIntegrationHandler = (service: SlackIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const { botToken, botUserId, workspaceId, workspaceName } = req.body;

      const tokenError = validateBotToken(botToken);
      if (tokenError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('botToken', tokenError)
        );
        return;
      }

      const botUserIdError = validateBotUserId(botUserId);
      if (botUserIdError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('botUserId', botUserIdError)
        );
        return;
      }

      const workspaceIdError = validateWorkspaceId(workspaceId);
      if (workspaceIdError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('workspaceId', workspaceIdError)
        );
        return;
      }

      const workspaceNameError = validateWorkspaceName(workspaceName);
      if (workspaceNameError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('workspaceName', workspaceNameError)
        );
        return;
      }

      const data: CreateOrUpdateIntegrationDto = {
        tenantId,
        data: {
          botToken,
          botUserId,
          workspaceId,
          workspaceName
        }
      };

      const result = await service.createOrUpdateIntegration(data);

      const statusCode = result.isNew ? HTTP_STATUS.CREATED : HTTP_STATUS.OK;
      const message = result.isNew
        ? COMM_SUCCESS_MESSAGES.INTEGRATION_CREATED
        : COMM_SUCCESS_MESSAGES.INTEGRATION_UPDATED;

      res.status(statusCode).json(successResponse(result.integration, message));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_ERROR_MESSAGES.CREATE_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Handler: Get Slack Integration
 * GET /tenants/:tenantId/integrations/slack
 */
const getIntegrationHandler = (service: SlackIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      const integration = await service.getIntegration(tenantId);

      if (!integration) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Slack integration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse(integration));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_ERROR_MESSAGES.FETCH_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Handler: Update Slack Integration
 * PATCH /tenants/:tenantId/integrations/slack
 */
const updateIntegrationHandler = (service: SlackIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const { botToken, botUserId, workspaceId, workspaceName } = req.body;

      if (botToken) {
        const tokenError = validateBotToken(botToken);
        if (tokenError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('botToken', tokenError)
          );
          return;
        }
      }

      if (botUserId) {
        const botUserIdError = validateBotUserId(botUserId);
        if (botUserIdError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('botUserId', botUserIdError)
          );
          return;
        }
      }

      if (workspaceId) {
        const workspaceIdError = validateWorkspaceId(workspaceId);
        if (workspaceIdError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('workspaceId', workspaceIdError)
          );
          return;
        }
      }

      if (workspaceName) {
        const workspaceNameError = validateWorkspaceName(workspaceName);
        if (workspaceNameError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('workspaceName', workspaceNameError)
          );
          return;
        }
      }

      const updateData: any = {};
      if (botToken) updateData.slackBotToken = botToken;
      if (botUserId) updateData.slackBotUserId = botUserId;
      if (workspaceId) updateData.slackWorkspaceId = workspaceId;
      if (workspaceName) updateData.slackWorkspaceName = workspaceName;

      const updated = await service.updateIntegration(tenantId, updateData);

      res.status(HTTP_STATUS.OK).json(
        successResponse(updated, COMM_SUCCESS_MESSAGES.INTEGRATION_UPDATED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_ERROR_MESSAGES.UPDATE_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Handler: Get Channels for Stored Integration
 * GET /tenants/:tenantId/integrations/slack/channels
 * 
 * Fetches Slack channels using the stored integration's bot token
 */
const getChannelsForIntegrationHandler = (service: SlackIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      // Get the stored Slack integration WITH token (for internal use)
      const integration = await service.getIntegrationWithToken(tenantId);

      if (!integration) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Slack integration not found. Please connect Slack first.')
        );
        return;
      }

      // Use the stored bot token to fetch channels
      const channelsResult = await service.fetchChannels(integration.slackBotToken);

      res.status(HTTP_STATUS.OK).json(successResponse({
        channels: channelsResult.channels ?? [],
        metadata: channelsResult.metadata
      }));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_ERROR_MESSAGES.FETCH_CHANNELS_FAILED)
      );
    }
  };

/**
 * Handler: Delete Slack Integration
 * DELETE /tenants/:tenantId/integrations/slack
 */
const deleteIntegrationHandler = (service: SlackIntegrationService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      await service.deleteIntegration(tenantId);

      res.status(HTTP_STATUS.OK).json(
        successMessageResponse(COMM_SUCCESS_MESSAGES.INTEGRATION_DELETED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, COMM_ERROR_MESSAGES.DELETE_INTEGRATION_FAILED)
      );
    }
  };

/**
 * Create integration controller with service dependencies
 */
export const createSlackIntegrationController = (service: SlackIntegrationService) => ({
  verifyToken: verifyTokenHandler(service),
  fetchChannels: fetchChannelsHandler(service),
  getChannelsForIntegration: getChannelsForIntegrationHandler(service),
  createOrUpdateIntegration: createOrUpdateIntegrationHandler(service),
  getIntegration: getIntegrationHandler(service),
  updateIntegration: updateIntegrationHandler(service),
  deleteIntegration: deleteIntegrationHandler(service)
});
