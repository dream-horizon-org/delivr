import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "~constants/http";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants";
import { getStorage } from "../../../../storage/storage-instance";
import { normalizePlatform, validateGitHubWorkflowUrl, validateJenkinsWorkflowUrl } from "../../../../services/integrations/ci-cd/utils/cicd.utils";
import { formatErrorMessage } from "~utils/error.utils";
import type { CreateWorkflowDto, UpdateWorkflowDto, WorkflowType } from "~types/integrations/ci-cd/workflow.interface";
import shortid = require("shortid");
import { CICDProviderType } from "~types/integrations/ci-cd";
import { GitHubActionsWorkflowService } from "../../../../services/integrations/ci-cd/workflows/github-actions-workflow.service";
import { JenkinsWorkflowService } from "../../../../services/integrations/ci-cd/workflows/jenkins-workflow.service";

const getCICDIntegrationRepository = () => {
  const storage = getStorage();
  return (storage as any).cicdIntegrationRepository;
};

const getWorkflowRepository = () => {
  const storage = getStorage();
  return (storage as any).cicdWorkflowRepository;
};

const getConfigRepository = () => {
  const storage = getStorage();
  return (storage as any).cicdConfigRepository;
};

/**
 * Validate workflow parameters against actual workflow definition.
 * Ensures only valid parameter names are provided (no extra/unknown parameters).
 */
const validateWorkflowParameters = async (
  appId: string,
  providerType: CICDProviderType,
  workflowUrl: string,
  providedParameters: Array<{ name: string }> | null | undefined
): Promise<string | null> => {
  if (!providedParameters || providedParameters.length === 0) {
    return null;
  }

  try {
    let actualParameters: Array<{ name: string }> = [];

    if (providerType === CICDProviderType.GITHUB_ACTIONS) {
      const service = new GitHubActionsWorkflowService();
      const result = await service.fetchWorkflowInputs(appId, workflowUrl);
      actualParameters = result.parameters;
    } else if (providerType === CICDProviderType.JENKINS) {
      const service = new JenkinsWorkflowService();
      const result = await service.fetchJobParameters(appId, workflowUrl);
      actualParameters = result.parameters;
    }

    const validParameterNames = new Set(actualParameters.map(p => p.name));
    const providedParameterNames = providedParameters.map(p => p.name);
    const extraParameters = providedParameterNames.filter(name => !validParameterNames.has(name));

    const hasExtraParameters = extraParameters.length > 0;
    if (hasExtraParameters) {
      const extraParamsList = extraParameters.join(', ');
      const validParamsList = Array.from(validParameterNames).join(', ');
      return `Invalid parameter(s): ${extraParamsList}. Valid parameters are: ${validParamsList}`;
    }

    return null;
  } catch (error) {
    return `Failed to validate parameters: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

export const createWorkflow = async (req: Request, res: Response): Promise<any> => {
  const appId = req.params.appId;
  const accountId: string = req.user.id;

  const body = req.body as Partial<CreateWorkflowDto>;
  /**
   * Required attributes for provider-agnostic workflow metadata.
   * Keep validation minimal here; domain-specific checks live in services.
   */
  const missingRequired = !body.providerType || !body.integrationId || !body.workflowUrl || !body.displayName || !body.platform || !body.workflowType;
  if (missingRequired) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_CREATE_REQUIRED });
  }

  try {
    const cicd = getCICDIntegrationRepository();
    const integration = await cicd.findById(body.integrationId);
    const invalidIntegration = !integration || integration.id !== body.integrationId;
    if (invalidIntegration || integration.appId !== appId || integration.providerType !== body.providerType) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_INTEGRATION_INVALID });
    }

    // Validate workflow URL based on provider type
    const isGitHubActions = integration.providerType === CICDProviderType.GITHUB_ACTIONS;
    const isJenkins = integration.providerType === CICDProviderType.JENKINS;
    
    if (isGitHubActions) {
      try {
        validateGitHubWorkflowUrl(body.workflowUrl as string);
      } catch (validationError: unknown) {
        const errorMessage = validationError instanceof Error ? validationError.message : ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL;
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: errorMessage });
      }
    } else if (isJenkins) {
      try {
        validateJenkinsWorkflowUrl(body.workflowUrl as string);
      } catch (validationError: unknown) {
        const errorMessage = validationError instanceof Error ? validationError.message : ERROR_MESSAGES.JENKINS_INVALID_WORKFLOW_URL;
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: errorMessage });
      }
    }

    // Validate workflow parameters if provided
    if (body.parameters) {
      const parameterValidationError = await validateWorkflowParameters(
        appId,
        integration.providerType as CICDProviderType,
        body.workflowUrl as string,
        body.parameters
      );
      
      if (parameterValidationError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: RESPONSE_STATUS.FAILURE, 
          error: parameterValidationError 
        });
      }
    }

    const wfRepository = getWorkflowRepository();

    const createdWorkflow = await wfRepository.create({
      id: shortid.generate(),
      appId,
      providerType: integration.providerType as CICDProviderType,
      integrationId: body.integrationId,
      displayName: body.displayName,
      workflowUrl: body.workflowUrl,
      providerIdentifiers: body.providerIdentifiers ?? null,
      platform: normalizePlatform(body.platform),
      workflowType: body.workflowType as WorkflowType,
      parameters: body.parameters ?? null,
      createdByAccountId: accountId,
    });

    return res.status(HTTP_STATUS.CREATED).json({ 
      success: RESPONSE_STATUS.SUCCESS,
      workflowId: createdWorkflow.id
    });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.WORKFLOW_CREATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

/**
 * List workflows for a tenant, optionally filtered by providerType, integrationId, platform, workflowType.
 */
export const listWorkflows = async (req: Request, res: Response): Promise<any> => {
  const appId = req.params.appId;
  const { providerType, integrationId, platform, workflowType } = req.query as any;

  try {
    const wfRepository = getWorkflowRepository();
    const items = await wfRepository.findAll({
      appId,
      providerType: providerType as any,
      integrationId: integrationId as string | undefined,
      platform: normalizePlatform(platform),
      workflowType: workflowType as any,
    });
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, workflows: items });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.WORKFLOW_LIST_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

/**
 * Get a workflow by id within tenant scope.
 */
export const getWorkflowById = async (req: Request, res: Response): Promise<any> => {
  const appId = req.params.appId;
  const id = req.params.workflowId;
  try {
    const wfRepository = getWorkflowRepository();
    const item = await wfRepository.findById(id);
    const notFound = !item || item.appId !== appId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
    }
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, workflow: item });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.WORKFLOW_FETCH_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

/**
 * Update a workflow by id.
 */
export const updateWorkflow = async (req: Request, res: Response): Promise<any> => {
  const appId = req.params.appId;
  const id = req.params.workflowId;
  const body = req.body as UpdateWorkflowDto;
  try {
    const wfRepository = getWorkflowRepository();
    const existing = await wfRepository.findById(id);
    const notFound = !existing || existing.appId !== appId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
    }

    // Validate workflow URL based on provider type if being updated
    const isGitHubActions = existing.providerType === CICDProviderType.GITHUB_ACTIONS;
    const isJenkins = existing.providerType === CICDProviderType.JENKINS;
    const isUpdatingWorkflowUrl = body.workflowUrl !== undefined;
    const isUpdatingParameters = body.parameters !== undefined;
    
    if (isUpdatingWorkflowUrl) {
      if (isGitHubActions) {
        try {
          validateGitHubWorkflowUrl(body.workflowUrl as string);
        } catch (validationError: unknown) {
          const errorMessage = validationError instanceof Error ? validationError.message : ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL;
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: errorMessage });
        }
      } else if (isJenkins) {
        try {
          validateJenkinsWorkflowUrl(body.workflowUrl as string);
        } catch (validationError: unknown) {
          const errorMessage = validationError instanceof Error ? validationError.message : ERROR_MESSAGES.JENKINS_INVALID_WORKFLOW_URL;
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: errorMessage });
        }
      }
    }

    // Validate workflow parameters if being updated
    if (isUpdatingParameters) {
      const urlToValidateAgainst = body.workflowUrl ?? existing.workflowUrl;
      const parameterValidationError = await validateWorkflowParameters(
        appId,
        existing.providerType as CICDProviderType,
        urlToValidateAgainst,
        body.parameters
      );
      
      if (parameterValidationError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: RESPONSE_STATUS.FAILURE, 
          error: parameterValidationError 
        });
      }
    }

    const updated = await wfRepository.update(id, body);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, workflow: updated });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.WORKFLOW_UPDATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

/**
 * Delete a workflow by id.
 * 
 * Validates that the workflow is not referenced by any CI/CD config before deletion.
 * If referenced, returns 400 with WORKFLOW_IN_USE_BY_CONFIG error.
 */
export const deleteWorkflow = async (req: Request, res: Response): Promise<any> => {
  const appId = req.params.appId;
  const workflowId = req.params.workflowId;
  try {
    const wfRepository = getWorkflowRepository();
    const configRepository = getConfigRepository();

    const existing = await wfRepository.findById(workflowId);
    const notFound = !existing || existing.appId !== appId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.WORKFLOW_NOT_FOUND });
    }

    // Check if workflow is referenced by any config
    const configs = await configRepository.findByApp(appId);
    const isWorkflowReferenced = configs.some((config: { workflowIds: string[] }) => {
      const workflowIds = Array.isArray(config.workflowIds) ? config.workflowIds : [];
      return workflowIds.includes(workflowId);
    });

    if (isWorkflowReferenced) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: RESPONSE_STATUS.FAILURE, 
        error: ERROR_MESSAGES.WORKFLOW_IN_USE_BY_CONFIG 
      });
    }

    await wfRepository.delete(workflowId);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, message: SUCCESS_MESSAGES.WORKFLOW_DELETED });
  } catch (e: unknown) {
    const message = formatErrorMessage(e, ERROR_MESSAGES.WORKFLOW_DELETE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};


