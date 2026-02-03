/**
 * Release Config Controller
 * HTTP handlers for release configuration endpoints
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { ReleaseConfigService } from '~services/release-configs';
import type { UnifiedActivityLogService } from '~services/activity-log';
import { EntityType } from '~models/activity-log/activity-log.interface';
import type { CreateReleaseConfigRequest } from '~types/release-configs';
import type { PlatformTargetMappingAttributes } from '~models/release';
import { errorResponse, getErrorStatusCode, notFoundResponse, successResponse, validationErrorResponse } from '~utils/response.utils';
import { RELEASE_CONFIG_ERROR_MESSAGES, RELEASE_CONFIG_SUCCESS_MESSAGES, VALID_PLATFORMS, VALID_TARGETS } from './constants';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize releaseSchedule.releaseFrequency to uppercase
 * Frontend may send lowercase values, but backend expects uppercase enum values
 */
const normalizeReleaseSchedule = (data: any): any => {
  if (data?.releaseSchedule?.releaseFrequency && typeof data.releaseSchedule.releaseFrequency === 'string') {
    return {
      ...data,
      releaseSchedule: {
        ...data.releaseSchedule,
        releaseFrequency: data.releaseSchedule.releaseFrequency.toUpperCase()
      }
    };
  }
  return data;
};

// ============================================================================
// HANDLERS
// ============================================================================
// NOTE: All handlers return VERBOSE format (no more "safe" format)
// Verbose format includes full nested integration config objects

/**
 * Handler: Create release config
 */
const createConfigHandler = (service: ReleaseConfigService) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawRequestBody: CreateReleaseConfigRequest = req.body;
      // Normalize releaseSchedule.releaseFrequency to uppercase
      const requestBody = normalizeReleaseSchedule(rawRequestBody);
      const { tenantId } = req.params;
      const currentUserId = req.user?.id || 'default-user';
      console.log('createConfigHandler requestBody:', requestBody);

      // Validate required fields
      if (!requestBody.name) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('name', 'Configuration name is required')
        );
        return;
      }

      if (!requestBody.releaseType) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('releaseType', 'Release type is required')
        );
        return;
      }

      if (!requestBody.platformTargets || !Array.isArray(requestBody.platformTargets) || requestBody.platformTargets.length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platformTargets', 'platformTargets must be a non-empty array')
        );
        return;
      }

      // Validate each platform-target pair
      for (const pt of requestBody.platformTargets) {
        if (!pt.platform || !pt.target) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('platformTargets', 'Each platformTarget must have platform and target fields')
          );
          return;
        }

        // Type-safe validation: check if platform is in valid list
        const isValidPlatform = VALID_PLATFORMS.includes(pt.platform as PlatformTargetMappingAttributes['platform']);
        if (!isValidPlatform) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('platformTargets', `Invalid platform: ${pt.platform}. Must be one of: ${VALID_PLATFORMS.join(', ')}`)
          );
          return;
        }

        // Type-safe validation: check if target is in valid list
        const isValidTarget = VALID_TARGETS.includes(pt.target as PlatformTargetMappingAttributes['target']);
        if (!isValidTarget) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('platformTargets', `Invalid target: ${pt.target}. Must be one of: ${VALID_TARGETS.join(', ')}`)
          );
          return;
        }
      }

      // ========================================================================
      // STEP 1: Create release config with integration orchestration
      // ========================================================================

      // Override body's tenantId with URL param (security: prevent tenant spoofing)
      const requestWithTenant = { ...requestBody, tenantId };
      const result = await service.createConfig(requestWithTenant, currentUserId);
      
      if (!result.success) {
        const errorResult = result as { success: false; error: any };
        
        // Log full error details for debugging
        console.error('[createConfigHandler] Error response:', JSON.stringify({
          tenantId,
          errorType: errorResult.error.type,
          errorMessage: errorResult.error.message,
          errorCode: errorResult.error.code,
          errorDetails: errorResult.error.details
        }, null, 2));
        
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: errorResult.error.message,
          code: errorResult.error.code,
          details: errorResult.error.details
        });
        return;
      }

      // Return verbose format to match GET and UPDATE responses
      const verboseConfig = await service.getConfigByIdVerbose(result.data.id);
      res.status(HTTP_STATUS.CREATED).json(
        successResponse(verboseConfig, RELEASE_CONFIG_SUCCESS_MESSAGES.CONFIG_CREATED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.CREATE_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: Get config by ID (with verbose integration data)
 */
const getConfigByIdHandler = (service: ReleaseConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      const config = await service.getConfigByIdVerbose(configId);

      if (!config) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Release configuration')
        );
        return;
      }

      // For verbose response, we don't use toSafeConfig as we want full nested objects
      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.GET_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: List configs by tenant (verbose format)
 */
const listConfigsByTenantHandler = (service: ReleaseConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const includeArchived = req.query.includeArchived === 'true';

      if (!tenantId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('tenantId', 'tenantId parameter is required')
        );
        return;
      }

      // Return verbose format to match other endpoints
      const verboseConfigs = await service.listConfigsByTenantVerbose(tenantId, includeArchived);

      res.status(HTTP_STATUS.OK).json(successResponse(verboseConfigs));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.LIST_CONFIGS_FAILED)
      );
    }
  };

/**
 * Handler: Update config
 */
const updateConfigHandler = (service: ReleaseConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;
      // Strip tenantId from update data - configs cannot change tenant (defense in depth)
      const { tenantId: _ignoredTenantId, ...rawUpdateData } = req.body;
      // Normalize releaseSchedule.releaseFrequency to uppercase
      const updateData = normalizeReleaseSchedule(rawUpdateData);
      const currentUserId = req.user?.id;
      console.log('updateConfigHandler updateData:', updateData);
      
      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          errorResponse(new Error('User ID not found'), 'Authentication required')
        );
        return;
      }

      // Update returns ServiceResult to handle validation errors
      const result = await service.updateConfig(configId, updateData, currentUserId);

      // Handle errors (NOT_FOUND, VALIDATION_ERROR, etc.)
      const isError = result.success === false;
      if (isError) {
        const errorType = result.error.type;
        const statusCode = errorType === 'NOT_FOUND' 
          ? HTTP_STATUS.NOT_FOUND 
          : HTTP_STATUS.BAD_REQUEST;
        
        // Log full error details for debugging
        console.error('[updateConfigHandler] Error response:', JSON.stringify({
          configId,
          errorType,
          statusCode,
          errorMessage: result.error.message,
          errorCode: result.error.code,
          errorDetails: result.error.details
        }, null, 2));
        
        res.status(statusCode).json({
          success: false,
          error: result.error.message,
          code: result.error.code,
          details: result.error.details
        });
        return;
      }

      // Fetch the verbose version to match GET format
      const verboseConfig = await service.getConfigByIdVerbose(configId);

      res.status(HTTP_STATUS.OK).json(
        successResponse(verboseConfig, RELEASE_CONFIG_SUCCESS_MESSAGES.CONFIG_UPDATED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.UPDATE_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: Delete config
 */
/**
 * Handler: Delete config (HARD DELETE)
 * Permanently removes the config from the database
 */
const deleteConfigHandler = (service: ReleaseConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      const deleted = await service.deleteConfig(configId);

      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Release configuration')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse(undefined, RELEASE_CONFIG_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.DELETE_CONFIG_FAILED)
      );
    }
  };

/**
 * Handler: Get activity logs for a release config
 */
const getActivityLogsHandler = (
  unifiedActivityLogService: UnifiedActivityLogService
) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      if (!configId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('configId', 'configId is required')
        );
        return;
      }

      // Get logs from unified service
      const logs = await unifiedActivityLogService.getActivityLogs(EntityType.CONFIGURATION, configId);

      res.status(HTTP_STATUS.OK).json(
        successResponse(logs)
      );
    } catch (error) {
      console.error('[Get Activity Logs] Error:', error);
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, RELEASE_CONFIG_ERROR_MESSAGES.GET_CONFIG_FAILED)
      );
    }
  };

/**
 * Factory: Create controller with all handlers
 */
export const createReleaseConfigController = (
  service: ReleaseConfigService,
  unifiedActivityLogService: UnifiedActivityLogService
) => ({
  createConfig: createConfigHandler(service),
  getConfigById: getConfigByIdHandler(service),
  listConfigsByTenant: listConfigsByTenantHandler(service),
  updateConfig: updateConfigHandler(service),
  deleteConfig: deleteConfigHandler(service),
  getActivityLogs: getActivityLogsHandler(unifiedActivityLogService)
});

