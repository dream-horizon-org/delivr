import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "~constants/http";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants";
import { getStorage } from "../../../../storage/storage-instance";
import { normalizePlatform, validateGitHubWorkflowUrl, validateJenkinsWorkflowUrl } from "../../../../services/integrations/ci-cd/utils/cicd.utils";
import { formatErrorMessage } from "~utils/error.utils";
import {
  successResponse,
  successMessageResponse,
  detailedErrorResponse,
  simpleErrorResponse,
  notFoundResponse
} from "~utils/response.utils";
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
  tenantId: string,
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
      const result = await service.fetchWorkflowInputs(tenantId, workflowUrl);
      actualParameters = result.parameters;
    } else if (providerType === CICDProviderType.JENKINS) {
      const service = new JenkinsWorkflowService();
      const result = await service.fetchJobParameters(tenantId, workflowUrl);
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
  const tenantId = req.params.tenantId;
  const accountId: string = req.user.id;

  const body = req.body as Partial<CreateWorkflowDto>;
  /**
   * Required attributes for provider-agnostic workflow metadata.
   * Keep validation minimal here; domain-specific checks live in services.
   */
  const missingRequired = !body.providerType || !body.integrationId || !body.workflowUrl || !body.displayName || !body.platform || !body.workflowType;
  if (missingRequired) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(ERROR_MESSAGES.WORKFLOW_CREATE_REQUIRED, 'missing_required_fields')
    );
  }

  try {
    const cicd = getCICDIntegrationRepository();
    const integration = await cicd.findById(body.integrationId);
    const invalidIntegration = !integration || integration.id !== body.integrationId;
    if (invalidIntegration || integration.tenantId !== tenantId || integration.providerType !== body.providerType) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        simpleErrorResponse(ERROR_MESSAGES.WORKFLOW_INTEGRATION_INVALID, 'invalid_integration')
      );
    }

    // Validate workflow URL based on provider type
    const isGitHubActions = integration.providerType === CICDProviderType.GITHUB_ACTIONS;
    const isJenkins = integration.providerType === CICDProviderType.JENKINS;
    
    if (isGitHubActions) {
      try {
        validateGitHubWorkflowUrl(body.workflowUrl as string);
      } catch (validationError: unknown) {
        const errorMessage = validationError instanceof Error ? validationError.message : ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL;
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          simpleErrorResponse(errorMessage, 'invalid_workflow_url')
        );
      }
    } else if (isJenkins) {
      try {
        validateJenkinsWorkflowUrl(body.workflowUrl as string);
      } catch (validationError: unknown) {
        const errorMessage = validationError instanceof Error ? validationError.message : ERROR_MESSAGES.JENKINS_INVALID_WORKFLOW_URL;
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          simpleErrorResponse(errorMessage, 'invalid_workflow_url')
        );
      }
    }

    // Validate workflow parameters if provided
    if (body.parameters) {
      const parameterValidationError = await validateWorkflowParameters(
        tenantId,
        integration.providerType as CICDProviderType,
        body.workflowUrl as string,
        body.parameters
      );
      
      if (parameterValidationError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          simpleErrorResponse(parameterValidationError, 'invalid_parameters')
        );
      }
    }

    const wfRepository = getWorkflowRepository();

    // Check for duplicate workflow name within the tenant
    const existingWorkflows = await wfRepository.findAll({ tenantId });
    const duplicateName = existingWorkflows.some(
      workflow => workflow.displayName.toLowerCase() === body.displayName?.toLowerCase()
    );
    
    if (duplicateName) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        detailedErrorResponse(
          ERROR_MESSAGES.WORKFLOW_DUPLICATE_NAME,
          'duplicate_workflow_name',
          [`Workflow name "${body.displayName}" is already in use for this tenant. Please choose a different name.`]
        )
      );
    }

    const createdWorkflow = await wfRepository.create({
      id: shortid.generate(),
      tenantId,
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

    return res.status(HTTP_STATUS.CREATED).json(
      successResponse({ workflowId: createdWorkflow.id })
    );
  } catch (error) {
    const message = formatErrorMessage(error, ERROR_MESSAGES.WORKFLOW_CREATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      simpleErrorResponse(message, 'workflow_create_failed')
    );
  }
};

/**
 * List workflows for a tenant, optionally filtered by providerType, integrationId, platform, workflowType.
 */
export const listWorkflows = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const { providerType, integrationId, platform, workflowType } = req.query as any;

  try {
    const wfRepository = getWorkflowRepository();
    const items = await wfRepository.findAll({
      tenantId,
      providerType: providerType as any,
      integrationId: integrationId as string | undefined,
      platform: normalizePlatform(platform),
      workflowType: workflowType as any,
    });
    return res.status(HTTP_STATUS.OK).json(
      successResponse({ workflows: items })
    );
  } catch (error) {
    const message = formatErrorMessage(error, ERROR_MESSAGES.WORKFLOW_LIST_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      simpleErrorResponse(message, 'workflow_list_failed')
    );
  }
};

/**
 * Get a workflow by id within tenant scope.
 */
export const getWorkflowById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const id = req.params.workflowId;
  try {
    const wfRepository = getWorkflowRepository();
    const item = await wfRepository.findById(id);
    const notFound = !item || item.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        notFoundResponse('Workflow', 'workflow_not_found')
      );
    }
    return res.status(HTTP_STATUS.OK).json(
      successResponse({ workflow: item })
    );
  } catch (error) {
    const message = formatErrorMessage(error, ERROR_MESSAGES.WORKFLOW_FETCH_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      simpleErrorResponse(message, 'workflow_fetch_failed')
    );
  }
};

/**
 * Update a workflow by id.
 */
export const updateWorkflow = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const id = req.params.workflowId;
  const body = req.body as UpdateWorkflowDto;
  try {
    const wfRepository = getWorkflowRepository();
    const existing = await wfRepository.findById(id);
    const notFound = !existing || existing.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        notFoundResponse('Workflow', 'workflow_not_found')
      );
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
          return res.status(HTTP_STATUS.BAD_REQUEST).json(
            simpleErrorResponse(errorMessage, 'invalid_workflow_url')
          );
        }
      } else if (isJenkins) {
        try {
          validateJenkinsWorkflowUrl(body.workflowUrl as string);
        } catch (validationError: unknown) {
          const errorMessage = validationError instanceof Error ? validationError.message : ERROR_MESSAGES.JENKINS_INVALID_WORKFLOW_URL;
          return res.status(HTTP_STATUS.BAD_REQUEST).json(
            simpleErrorResponse(errorMessage, 'invalid_workflow_url')
          );
        }
      }
    }

    // Validate workflow parameters if being updated
    if (isUpdatingParameters) {
      const urlToValidateAgainst = body.workflowUrl ?? existing.workflowUrl;
      const parameterValidationError = await validateWorkflowParameters(
        tenantId,
        existing.providerType as CICDProviderType,
        urlToValidateAgainst,
        body.parameters
      );
      
      if (parameterValidationError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          simpleErrorResponse(parameterValidationError, 'invalid_parameters')
        );
      }
    }

    // Check for duplicate workflow name if displayName is being updated
    if (body.displayName !== undefined && body.displayName !== existing.displayName) {
      const existingWorkflows = await wfRepository.findAll({ tenantId });
      const duplicateName = existingWorkflows.some(
        workflow => workflow.id !== id && workflow.displayName.toLowerCase() === body.displayName?.toLowerCase()
      );
      
      if (duplicateName) {
        return res.status(HTTP_STATUS.CONFLICT).json(
          detailedErrorResponse(
            ERROR_MESSAGES.WORKFLOW_DUPLICATE_NAME,
            'duplicate_workflow_name',
            [`Workflow name "${body.displayName}" is already in use for this tenant. Please choose a different name.`]
          )
        );
      }
    }

    const updated = await wfRepository.update(id, body);
    return res.status(HTTP_STATUS.OK).json(
      successResponse({ workflow: updated })
    );
  } catch (error) {
    const message = formatErrorMessage(error, ERROR_MESSAGES.WORKFLOW_UPDATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      simpleErrorResponse(message, 'workflow_update_failed')
    );
  }
};

/**
 * Delete a workflow by id.
 * 
 * Validates that the workflow is not referenced by any CI/CD config before deletion.
 * If referenced, returns 400 with WORKFLOW_IN_USE_BY_CONFIG error.
 */
export const deleteWorkflow = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const workflowId = req.params.workflowId;
  try {
    const wfRepository = getWorkflowRepository();
    const configRepository = getConfigRepository();

    const existing = await wfRepository.findById(workflowId);
    const notFound = !existing || existing.tenantId !== tenantId;
    if (notFound) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        notFoundResponse('Workflow', 'workflow_not_found')
      );
    }

    // Check if workflow is referenced by any config
    const configs = await configRepository.findByTenant(tenantId);
    const isWorkflowReferenced = configs.some((config: { workflowIds: string[] }) => {
      const workflowIds = Array.isArray(config.workflowIds) ? config.workflowIds : [];
      return workflowIds.includes(workflowId);
    });

    if (isWorkflowReferenced) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        simpleErrorResponse(ERROR_MESSAGES.WORKFLOW_IN_USE_BY_CONFIG, 'workflow_in_use')
      );
    }

    await wfRepository.delete(workflowId);
    return res.status(HTTP_STATUS.OK).json(
      successMessageResponse(SUCCESS_MESSAGES.WORKFLOW_DELETED)
    );
  } catch (error) {
    const message = formatErrorMessage(error, ERROR_MESSAGES.WORKFLOW_DELETE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      simpleErrorResponse(message, 'workflow_delete_failed')
    );
  }
};


