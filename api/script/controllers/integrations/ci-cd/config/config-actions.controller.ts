import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "~constants/http";
import { ERROR_MESSAGES } from "../constants";
import { formatErrorMessage } from "~utils/error.utils";
import { getStorage } from "../../../../storage/storage-instance";
import { normalizePlatform, normalizeWorkflowType } from "../../../../services/integrations/ci-cd/utils/cicd.utils";
import { getIntegrationForTenant, getWorkflowAdapter } from "../workflows/workflow-adapter.utils";

export const triggerWorkflowByConfig = async (req: Request, res: Response): Promise<any> => {
  const configId = req.params.configId;
  const body = req.body || {};
  const platformRaw = typeof body.platform === 'string' ? body.platform : (typeof body.platformType === 'string' ? body.platformType : undefined);
  const workflowTypeRaw = typeof body.workflowType === 'string' ? body.workflowType : undefined;
  const jobParameters = (body.jobParameters && typeof body.jobParameters === 'object') ? body.jobParameters as Record<string, unknown> : {};

  const platform = normalizePlatform(platformRaw);
  const normalizedWorkflowType = normalizeWorkflowType(workflowTypeRaw);
  const missingInputs = !platform || !normalizedWorkflowType;
  if (missingInputs) {
    // Requires platform and workflowType to resolve a unique workflow in the config
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: RESPONSE_STATUS.FAILURE,
      error: ERROR_MESSAGES.WORKFLOW_SELECTION_REQUIRED
    });
  }

  try {
    const storage = getStorage() as any;
    const configService = storage.cicdConfigService;
    const workflowRepository = storage.cicdWorkflowRepository;

    const config = await configService.findById(configId);
    const configNotFound = !config;
    if (configNotFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.CONFIG_NOT_FOUND
      });
    }

    const tenantId = config.tenantId;
    const workflowIds: string[] = Array.isArray(config.workflowIds) ? config.workflowIds : [];

    const loadedWorkflows = await Promise.all(
      workflowIds.map((id) => workflowRepository.findById(id))
    );
    const workflows = loadedWorkflows.filter((w: any) => !!w);

    // Narrow to tenant + matching platform and workflowType
    const matches = workflows.filter((w: any) => {
      const tenantMatches = w.tenantId === tenantId;
      const platformMatches = typeof w.platform === 'string' && normalizePlatform(w.platform) === platform;
      const typeMatches = w.workflowType === normalizedWorkflowType;
      const isMatch = tenantMatches && platformMatches && typeMatches;
      return isMatch;
    });

    const noneFound = matches.length === 0;
    if (noneFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.CONFIG_WORKFLOW_NOT_FOUND
      });
    }

    const multipleFound = matches.length > 1;
    if (multipleFound) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.WORKFLOW_MULTIPLE_FOUND
      });
    }

    const selected = matches[0];
    const integration = await getIntegrationForTenant(tenantId, selected.integrationId);
    const integrationNotFound = !integration;
    if (integrationNotFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND
      });
    }

    const adapter = getWorkflowAdapter(integration.providerType);
    const adapterSupportsTrigger = typeof adapter.trigger === 'function';
    if (!adapterSupportsTrigger) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.OPERATION_NOT_SUPPORTED
      });
    }

    const result = await adapter.trigger(tenantId, {
      workflowId: selected.id,
      workflowType: selected.workflowType,
      platform: platform,
      jobParameters
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: RESPONSE_STATUS.SUCCESS,
      queueLocation: result.queueLocation
    });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.CONFIG_TRIGGER_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message
    });
  }
};


