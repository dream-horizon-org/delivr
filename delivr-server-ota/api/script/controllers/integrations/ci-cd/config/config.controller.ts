import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "~constants/http";
import { ERROR_MESSAGES } from "../constants";
import { formatErrorMessage } from "~utils/error.utils";
import { getErrorStatusCode } from "~utils/response.utils";
import { getStorage } from "../../../../storage/storage-instance";
import type { CICDConfigService } from "../../../../services/integrations/ci-cd/config/config.service";
import { validateCreateConfig, validateUpdateConfig } from "../../../../services/integrations/ci-cd/config/config.validation";

/**
 * Helper: Validate workflow integrations
 * Checks that each workflow's integration exists, is enabled, and belongs to tenant
 */
async function validateWorkflowIntegrations(
  workflows: any[],
  tenantId: string,
  cicdIntegrationRepo: any,
  res: Response
): Promise<boolean> {
  for (let i = 0; i < workflows.length; i++) {
    const workflow = workflows[i];
    const integration = await cicdIntegrationRepo.findById(workflow.integrationId);
    
    if (!integration) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Integration not found',
        details: {
          errorCode: 'integration_not_found',
          message: `CI/CD integration not found for workflows[${i}].integrationId`
        }
      });
      return false;
    }
    
    if (integration.tenantId !== tenantId) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Access denied',
        details: {
          errorCode: 'integration_access_denied',
          message: `Integration does not belong to this tenant for workflows[${i}].integrationId`
        }
      });
      return false;
    }
    
    if (!integration.isEnabled) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Integration is disabled',
        details: {
          errorCode: 'integration_disabled',
          message: `CI/CD integration is disabled for workflows[${i}].integrationId`
        }
      });
      return false;
    }
  }
  
  return true;
}

export const createConfig = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const accountId = req.user?.id;
  const missingUser = !accountId || typeof accountId !== 'string';
  if (missingUser) {
    // Route: POST /tenants/:tenantId/integrations/ci-cd/configs
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'Unauthorized',
      details: {
        errorCode: 'unauthorized',
        message: 'Authentication required'
      }
    });
  }
  
  const body = req.body || {};
  
  // Validate request body using Yup
  const validated = await validateCreateConfig(body, res, tenantId);
  if (!validated) {
    return; // Response already sent by validateWithYup
  }

  try {
    const storage = getStorage();
    const service = (storage as any).cicdConfigService as CICDConfigService;
    const cicdIntegrationRepo = (storage as any).cicdIntegrationRepository;
    
    // Validate each workflow's integration exists, is enabled, and belongs to tenant
    const workflows = validated.workflows;
    const isValid = await validateWorkflowIntegrations(workflows, tenantId, cicdIntegrationRepo, res);
    if (!isValid) {
      return; // Response already sent by validation function
    }
    
    const result = await service.createConfig({
      tenantId,
      createdByAccountId: accountId,
      workflows: workflows as any
    });
    
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      configId: result.configId,
      workflowIds: result.workflowIds
    });
  } catch (e: any) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.CONFIG_CREATE_FAILED);
    const statusCode = getErrorStatusCode(e);
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: {
        errorCode: e.code || 'config_create_failed',
        message: e.message || 'An unexpected error occurred while creating the configuration'
      }
    });
  }
};

/**
 * List all CI/CD configs for a tenant.
 */
export const listConfigsByTenant = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  try {
    const storage = getStorage();
    const service = (storage as any).cicdConfigService as CICDConfigService;
    const items = await service.listByTenant(tenantId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      configs: items
    });
  } catch (e: any) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.CONFIG_LIST_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: message,
      details: {
        errorCode: e.code || 'config_list_failed',
        message: e.message || 'An unexpected error occurred while listing configurations'
      }
    });
  }
};

/**
 * Fetch a CI/CD config by id (tenant-scoped).
 */
export const getConfigById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const configId = req.params.configId;
  try {
    const storage = getStorage();
    const service = (storage as any).cicdConfigService as CICDConfigService;
    const config = await service.findById(configId);
    const notFound = !config || config.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_MESSAGES.CONFIG_NOT_FOUND,
        details: {
          errorCode: 'config_not_found',
          message: 'The requested CI/CD configuration does not exist'
        }
      });
    }
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      config
    });
  } catch (e: any) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.CONFIG_FETCH_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: message,
      details: {
        errorCode: e.code || 'config_fetch_failed',
        message: e.message || 'An unexpected error occurred while fetching the configuration'
      }
    });
  }
};

/**
 * Update a CI/CD config by id. Supports updating workflowIds.
 */
export const updateConfigById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const configId = req.params.configId;
  const body = req.body || {};
  const accountId = req.user?.id;

  // Validate request body using Yup
  const validated = await validateUpdateConfig(body, res, tenantId);
  if (!validated) {
    return; // Response already sent by validateWithYup
  }

  try {
    const storage = getStorage();
    const service = (storage as any).cicdConfigService as CICDConfigService;
    const cicdIntegrationRepo = (storage as any).cicdIntegrationRepository;
    
    // Validate each workflow's integration exists, is enabled, and belongs to tenant
    const workflows = validated.workflows;
    const isValid = await validateWorkflowIntegrations(workflows, tenantId, cicdIntegrationRepo, res);
    if (!isValid) {
      return; // Response already sent by validation function
    }
    
    const updated = await service.updateConfig({
      tenantId,
      configId,
      createdByAccountId: accountId,
      workflows: workflows as any
    });
    
    const notFound = !updated;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_MESSAGES.CONFIG_NOT_FOUND,
        details: {
          errorCode: 'config_not_found',
          message: 'The requested CI/CD configuration does not exist'
        }
      });
    }
    
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      config: updated
    });
  } catch (e: any) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.CONFIG_UPDATE_FAILED);
    const statusCode = getErrorStatusCode(e);
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: {
        errorCode: e.code || 'config_update_failed',
        message: e.message || 'An unexpected error occurred while updating the configuration'
      }
    });
  }
};

/**
 * Delete a CI/CD config by id.
 */
export const deleteConfigById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const configId = req.params.configId;
  try {
    const storage = getStorage();
    const service = (storage as any).cicdConfigService as CICDConfigService;
    const deleted = await service.deleteConfig(configId, tenantId);
    const notFound = !deleted;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_MESSAGES.CONFIG_NOT_FOUND,
        details: {
          errorCode: 'config_not_found',
          message: 'The requested CI/CD configuration does not exist'
        }
      });
    }
    return res.status(HTTP_STATUS.OK).json({
      success: true
    });
  } catch (e: any) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.CONFIG_DELETE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: message,
      details: {
        errorCode: e.code || 'config_delete_failed',
        message: e.message || 'An unexpected error occurred while deleting the configuration'
      }
    });
  }
};


