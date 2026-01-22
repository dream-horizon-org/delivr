import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "~constants/http";
import { ERROR_MESSAGES } from "../constants";
import { formatErrorMessage } from "~utils/error.utils";
import { getStorage } from "../../../../storage/storage-instance";
import type { CICDConfigService } from "../../../../services/integrations/ci-cd/config/config.service";
import { CICD_CONFIG_ERROR_MESSAGES } from "../../../../services/integrations/ci-cd/config/config.constants";

export const triggerWorkflowByConfig = async (req: Request, res: Response): Promise<any> => {
  const configId = req.params.configId;
  const tenantId = req.params.tenantId;
  const body = req.body ?? {};
  const platform = typeof body.platform === 'string' ? body.platform : (typeof body.platformType === 'string' ? body.platformType : undefined);
  const workflowType = typeof body.workflowType === 'string' ? body.workflowType : undefined;
  const jobParameters = (body.jobParameters && typeof body.jobParameters === 'object') ? body.jobParameters as Record<string, unknown> : {};

  const missingInputs = !platform || !workflowType;
  if (missingInputs) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: RESPONSE_STATUS.FAILURE,
      error: ERROR_MESSAGES.WORKFLOW_SELECTION_REQUIRED
    });
  }

  const missingTenantId = !tenantId;
  if (missingTenantId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: RESPONSE_STATUS.FAILURE,
      error: ERROR_MESSAGES.TENANT_ID_REQUIRED
    });
  }

  try {
    const storage = getStorage();
    const configService = (storage as any).cicdConfigService as CICDConfigService;

    const result = await configService.triggerWorkflowByConfig({
      configId,
      tenantId,
      platform,
      workflowType,
      jobParameters
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: RESPONSE_STATUS.SUCCESS,
      queueLocation: result.queueLocation,
      workflowId: result.workflowId,
      providerType: result.providerType
    });
  } catch (e: unknown) {
    // Handle specific service errors with appropriate HTTP status codes
    const errorMessage = e instanceof Error ? e.message : String(e);
    
    const isNotFound = errorMessage === CICD_CONFIG_ERROR_MESSAGES.CONFIG_NOT_FOUND ||
                       errorMessage === CICD_CONFIG_ERROR_MESSAGES.NO_MATCHING_WORKFLOW;
    if (isNotFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: errorMessage
      });
    }

    const isBadRequest = errorMessage === CICD_CONFIG_ERROR_MESSAGES.MULTIPLE_WORKFLOWS_FOUND ||
                         errorMessage === CICD_CONFIG_ERROR_MESSAGES.TRIGGER_NOT_SUPPORTED;
    if (isBadRequest) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: errorMessage
      });
    }

    const message = formatErrorMessage(e, ERROR_MESSAGES.CONFIG_TRIGGER_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message
    });
  }
};
