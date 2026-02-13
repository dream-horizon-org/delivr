import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "~constants/http";
import { ERROR_MESSAGES } from "../constants";
import { formatErrorMessage } from "~utils/error.utils";
import {
  successResponse,
  simpleErrorResponse,
  notFoundResponse
} from "~utils/response.utils";
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
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(ERROR_MESSAGES.WORKFLOW_SELECTION_REQUIRED, 'missing_required_fields')
    );
  }

  const missingTenantId = !tenantId;
  if (missingTenantId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(ERROR_MESSAGES.TENANT_ID_REQUIRED, 'tenant_id_required')
    );
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

    return res.status(HTTP_STATUS.CREATED).json(
      successResponse({
        queueLocation: result.queueLocation,
        workflowId: result.workflowId,
        providerType: result.providerType
      })
    );
  } catch (error) {
    // Handle specific service errors with appropriate HTTP status codes
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const isNotFound = errorMessage === CICD_CONFIG_ERROR_MESSAGES.CONFIG_NOT_FOUND ||
                       errorMessage === CICD_CONFIG_ERROR_MESSAGES.NO_MATCHING_WORKFLOW;
    if (isNotFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        simpleErrorResponse(errorMessage, 'not_found')
      );
    }

    const isBadRequest = errorMessage === CICD_CONFIG_ERROR_MESSAGES.MULTIPLE_WORKFLOWS_FOUND ||
                         errorMessage === CICD_CONFIG_ERROR_MESSAGES.TRIGGER_NOT_SUPPORTED;
    if (isBadRequest) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        simpleErrorResponse(errorMessage, 'bad_request')
      );
    }

    const message = formatErrorMessage(error, ERROR_MESSAGES.CONFIG_TRIGGER_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      simpleErrorResponse(message, 'trigger_failed')
    );
  }
};
