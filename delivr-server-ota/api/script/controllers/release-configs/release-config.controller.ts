/**
 * Release Config Controller
 * HTTP handlers for release configuration endpoints
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { ReleaseConfigService } from '~services/release-configs';
import type { ReleaseConfigActivityLogService } from '~services/release-configs';
import type { CreateReleaseConfigRequest } from '~types/release-configs';
import type { PlatformTargetMappingAttributes } from '~models/release';
import { getErrorStatusCode, successResponse } from '~utils/response.utils';
import { RELEASE_CONFIG_ERROR_MESSAGES, RELEASE_CONFIG_SUCCESS_MESSAGES, VALID_PLATFORMS, VALID_TARGETS } from './constants';
import { validateCreateConfig, validateUpdateConfig } from '~services/release-configs/release-config.validation';
import { getStorage } from '~storage/storage-instance';

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

      // Validate platform values
      if (requestBody.platformTargets && Array.isArray(requestBody.platformTargets)) {
        for (const pt of requestBody.platformTargets) {
          if (pt.platform) {
            const isValidPlatform = VALID_PLATFORMS.includes(pt.platform as PlatformTargetMappingAttributes['platform']);
            if (!isValidPlatform) {
              res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Invalid platform',
                details: {
                  errorCode: 'invalid_platform',
                  message: `Invalid platform: ${pt.platform}. Must be one of: ${VALID_PLATFORMS.join(', ')}`
                }
              });
              return;
            }
          }

          if (pt.target) {
            const isValidTarget = VALID_TARGETS.includes(pt.target as PlatformTargetMappingAttributes['target']);
            if (!isValidTarget) {
              res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Invalid target',
                details: {
                  errorCode: 'invalid_target',
                  message: `Invalid target: ${pt.target}. Must be one of: ${VALID_TARGETS.join(', ')}`
                }
              });
              return;
            }
          }
        }
      }

      // Validate request body using Yup
      const validated = await validateCreateConfig(requestBody, res);
      if (!validated) {
        return; // Response already sent by validateWithYup
      }

      // ========================================================================
      // STEP 1: Validate integration configs exist and belong to tenant
      // ========================================================================
      const storage = getStorage();

      // Validate CI/CD config if provided
      if (validated.ciConfigId) {
        const ciConfigService = (storage as any).cicdConfigService;
        if (ciConfigService) {
          const ciConfig = await ciConfigService.findById(validated.ciConfigId);
          if (!ciConfig) {
            res.status(HTTP_STATUS.NOT_FOUND).json({
              success: false,
              error: 'CI/CD configuration not found',
              details: {
                errorCode: 'config_not_found',
                message: 'The specified CI/CD configuration does not exist'
              }
            });
            return;
          }
          if (ciConfig.tenantId !== tenantId) {
            res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              error: 'Access denied',
              details: {
                errorCode: 'config_access_denied',
                message: 'CI/CD configuration does not belong to this tenant'
              }
            });
            return;
          }
        }
      }

      // Validate Test Management config if provided
      if (validated.testManagementConfigId) {
        const testMgmtConfigRepository = (storage as any).testManagementConfigRepository;
        if (testMgmtConfigRepository) {
          const testMgmtConfig = await testMgmtConfigRepository.findById(validated.testManagementConfigId);
          if (!testMgmtConfig) {
            res.status(HTTP_STATUS.NOT_FOUND).json({
              success: false,
              error: 'Test Management configuration not found',
              details: {
                errorCode: 'config_not_found',
                message: 'The specified Test Management configuration does not exist'
              }
            });
            return;
          }
          if (testMgmtConfig.tenantId !== tenantId) {
            res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              error: 'Access denied',
              details: {
                errorCode: 'config_access_denied',
                message: 'Test Management configuration does not belong to this tenant'
              }
            });
            return;
          }
        }
      }

      // Validate Project Management config if provided
      if (validated.projectManagementConfigId) {
        const projectMgmtConfigRepository = (storage as any).projectManagementConfigRepository;
        if (projectMgmtConfigRepository) {
          const projectMgmtConfig = await projectMgmtConfigRepository.findById(validated.projectManagementConfigId);
          if (!projectMgmtConfig) {
            res.status(HTTP_STATUS.NOT_FOUND).json({
              success: false,
              error: 'Project Management configuration not found',
              details: {
                errorCode: 'config_not_found',
                message: 'The specified Project Management configuration does not exist'
              }
            });
            return;
          }
          if (projectMgmtConfig.tenantId !== tenantId) {
            res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              error: 'Access denied',
              details: {
                errorCode: 'config_access_denied',
                message: 'Project Management configuration does not belong to this tenant'
              }
            });
            return;
          }
        }
      }

      // Validate Communication config if provided
      if (validated.commsConfigId) {
        const commConfigRepository = (storage as any).commConfigRepository;
        if (commConfigRepository) {
          const commConfig = await commConfigRepository.findById(validated.commsConfigId);
          if (!commConfig) {
            res.status(HTTP_STATUS.NOT_FOUND).json({
              success: false,
              error: 'Communication configuration not found',
              details: {
                errorCode: 'config_not_found',
                message: 'The specified Communication configuration does not exist'
              }
            });
            return;
          }
          if (commConfig.tenantId !== tenantId) {
            res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              error: 'Access denied',
              details: {
                errorCode: 'config_access_denied',
                message: 'Communication configuration does not belong to this tenant'
              }
            });
            return;
          }
        }
      }

      // ========================================================================
      // STEP 2: Create release config with integration orchestration
      // ========================================================================

      // Override body's tenantId with URL param (security: prevent tenant spoofing)
      const requestWithTenant = { ...validated, tenantId } as any;
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
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || RELEASE_CONFIG_ERROR_MESSAGES.CREATE_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_create_failed',
          message: error.message || 'An unexpected error occurred while creating the release configuration'
        }
      });
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
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Release configuration not found',
          details: {
            errorCode: 'config_not_found',
            message: 'The requested release configuration does not exist'
          }
        });
        return;
      }

      // For verbose response, we don't use toSafeConfig as we want full nested objects
      res.status(HTTP_STATUS.OK).json(successResponse(config));
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || RELEASE_CONFIG_ERROR_MESSAGES.GET_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_fetch_failed',
          message: error.message || 'An unexpected error occurred while fetching the release configuration'
        }
      });
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
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Tenant ID is required',
          details: {
            errorCode: 'missing_tenant_id',
            message: 'tenantId parameter is required'
          }
        });
        return;
      }

      // Return verbose format to match other endpoints
      const verboseConfigs = await service.listConfigsByTenantVerbose(tenantId, includeArchived);

      res.status(HTTP_STATUS.OK).json(successResponse(verboseConfigs));
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || RELEASE_CONFIG_ERROR_MESSAGES.LIST_CONFIGS_FAILED,
        details: {
          errorCode: error.code || 'config_list_failed',
          message: error.message || 'An unexpected error occurred while listing release configurations'
        }
      });
    }
  };

/**
 * Handler: Update config
 */
const updateConfigHandler = (service: ReleaseConfigService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;
      const { tenantId } = req.params;
      // Strip tenantId from update data - configs cannot change tenant (defense in depth)
      const { tenantId: _ignoredTenantId, ...rawUpdateData } = req.body;
      // Normalize releaseSchedule.releaseFrequency to uppercase
      const updateData = normalizeReleaseSchedule(rawUpdateData);
      const currentUserId = req.user?.id;
      console.log('updateConfigHandler updateData:', updateData);
      
      if (!currentUserId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Authentication required',
          details: {
            errorCode: 'unauthorized',
            message: 'User ID not found in request'
          }
        });
        return;
      }

      // Validate platform values if being updated
      if (updateData.platformTargets && Array.isArray(updateData.platformTargets)) {
        for (const pt of updateData.platformTargets) {
          if (pt.platform) {
            const isValidPlatform = VALID_PLATFORMS.includes(pt.platform as PlatformTargetMappingAttributes['platform']);
            if (!isValidPlatform) {
              res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Invalid platform',
                details: {
                  errorCode: 'invalid_platform',
                  message: `Invalid platform: ${pt.platform}. Must be one of: ${VALID_PLATFORMS.join(', ')}`
                }
              });
              return;
            }
          }

          if (pt.target) {
            const isValidTarget = VALID_TARGETS.includes(pt.target as PlatformTargetMappingAttributes['target']);
            if (!isValidTarget) {
              res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Invalid target',
                details: {
                  errorCode: 'invalid_target',
                  message: `Invalid target: ${pt.target}. Must be one of: ${VALID_TARGETS.join(', ')}`
                }
              });
              return;
            }
          }
        }
      }

      // Validate request body using Yup
      const validated = await validateUpdateConfig(updateData, res);
      if (!validated) {
        return; // Response already sent by validateWithYup
      }

      // Get existing config to check tenant
      const existingConfig = await service.getConfigByIdVerbose(configId);
      if (!existingConfig) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Release configuration not found',
          details: {
            errorCode: 'config_not_found',
            message: 'The requested release configuration does not exist'
          }
        });
        return;
      }

      // Use tenantId from existing config for integration validation
      const configTenantId = existingConfig.tenantId;

      // ========================================================================
      // Validate integration configs exist and belong to tenant (if being updated)
      // ========================================================================
      const storage = getStorage();

      // Validate CI/CD config if being updated
      if (validated.ciConfigId) {
        const ciConfigService = (storage as any).cicdConfigService;
        if (ciConfigService) {
          const ciConfig = await ciConfigService.findById(validated.ciConfigId);
          if (!ciConfig) {
            res.status(HTTP_STATUS.NOT_FOUND).json({
              success: false,
              error: 'CI/CD configuration not found',
              details: {
                errorCode: 'config_not_found',
                message: 'The specified CI/CD configuration does not exist'
              }
            });
            return;
          }
          if (ciConfig.tenantId !== configTenantId) {
            res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              error: 'Access denied',
              details: {
                errorCode: 'config_access_denied',
                message: 'CI/CD configuration does not belong to this tenant'
              }
            });
            return;
          }
        }
      }

      // Validate Test Management config if being updated
      if (validated.testManagementConfigId) {
        const testMgmtConfigRepository = (storage as any).testManagementConfigRepository;
        if (testMgmtConfigRepository) {
          const testMgmtConfig = await testMgmtConfigRepository.findById(validated.testManagementConfigId);
          if (!testMgmtConfig) {
            res.status(HTTP_STATUS.NOT_FOUND).json({
              success: false,
              error: 'Test Management configuration not found',
              details: {
                errorCode: 'config_not_found',
                message: 'The specified Test Management configuration does not exist'
              }
            });
            return;
          }
          if (testMgmtConfig.tenantId !== configTenantId) {
            res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              error: 'Access denied',
              details: {
                errorCode: 'config_access_denied',
                message: 'Test Management configuration does not belong to this tenant'
              }
            });
            return;
          }
        }
      }

      // Validate Project Management config if being updated
      if (validated.projectManagementConfigId) {
        const projectMgmtConfigRepository = (storage as any).projectManagementConfigRepository;
        if (projectMgmtConfigRepository) {
          const projectMgmtConfig = await projectMgmtConfigRepository.findById(validated.projectManagementConfigId);
          if (!projectMgmtConfig) {
            res.status(HTTP_STATUS.NOT_FOUND).json({
              success: false,
              error: 'Project Management configuration not found',
              details: {
                errorCode: 'config_not_found',
                message: 'The specified Project Management configuration does not exist'
              }
            });
            return;
          }
          if (projectMgmtConfig.tenantId !== configTenantId) {
            res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              error: 'Access denied',
              details: {
                errorCode: 'config_access_denied',
                message: 'Project Management configuration does not belong to this tenant'
              }
            });
            return;
          }
        }
      }

      // Validate Communication config if being updated
      if (validated.commsConfigId) {
        const commConfigRepository = (storage as any).commConfigRepository;
        if (commConfigRepository) {
          const commConfig = await commConfigRepository.findById(validated.commsConfigId);
          if (!commConfig) {
            res.status(HTTP_STATUS.NOT_FOUND).json({
              success: false,
              error: 'Communication configuration not found',
              details: {
                errorCode: 'config_not_found',
                message: 'The specified Communication configuration does not exist'
              }
            });
            return;
          }
          if (commConfig.tenantId !== configTenantId) {
            res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              error: 'Access denied',
              details: {
                errorCode: 'config_access_denied',
                message: 'Communication configuration does not belong to this tenant'
              }
            });
            return;
          }
        }
      }

      // Update returns ServiceResult to handle validation errors
      const result = await service.updateConfig(configId, validated as any, currentUserId);

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
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || RELEASE_CONFIG_ERROR_MESSAGES.UPDATE_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_update_failed',
          message: error.message || 'An unexpected error occurred while updating the release configuration'
        }
      });
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
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Release configuration not found',
          details: {
            errorCode: 'config_not_found',
            message: 'The requested release configuration does not exist'
          }
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse(undefined, RELEASE_CONFIG_SUCCESS_MESSAGES.CONFIG_DELETED)
      );
    } catch (error: any) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || RELEASE_CONFIG_ERROR_MESSAGES.DELETE_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'config_delete_failed',
          message: error.message || 'An unexpected error occurred while deleting the release configuration'
        }
      });
    }
  };

/**
 * Handler: Get activity logs for a release config
 */
const getActivityLogsHandler = (activityLogService: ReleaseConfigActivityLogService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { configId } = req.params;

      if (!configId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Configuration ID is required',
          details: {
            errorCode: 'missing_config_id',
            message: 'configId is required'
          }
        });
        return;
      }

      // Delegate to activity log service directly
      const logs = await activityLogService.getActivityLogs(configId);

      res.status(HTTP_STATUS.OK).json(
        successResponse(logs)
      );
    } catch (error: any) {
      console.error('[Get Activity Logs] Error:', error);
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json({
        success: false,
        error: error.message || RELEASE_CONFIG_ERROR_MESSAGES.GET_CONFIG_FAILED,
        details: {
          errorCode: error.code || 'activity_logs_fetch_failed',
          message: error.message || 'An unexpected error occurred while fetching activity logs'
        }
      });
    }
  };

/**
 * Factory: Create controller with all handlers
 */
export const createReleaseConfigController = (
  service: ReleaseConfigService,
  activityLogService: ReleaseConfigActivityLogService
) => ({
  createConfig: createConfigHandler(service),
  getConfigById: getConfigByIdHandler(service),
  listConfigsByTenant: listConfigsByTenantHandler(service),
  updateConfig: updateConfigHandler(service),
  deleteConfig: deleteConfigHandler(service),
  getActivityLogs: getActivityLogsHandler(activityLogService)
});

