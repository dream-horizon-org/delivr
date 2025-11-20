import { CICD_CONFIG_ERROR_MESSAGES } from './config.constants';
import { CICDProviderType, WorkflowType, type CreateWorkflowDto } from '~types/integrations/ci-cd/workflow.interface';

const isNonEmptyString = (value: unknown): value is string => {
  const isString = typeof value === 'string';
  const trimmed = isString ? value.trim() : '';
  const isNonEmpty = trimmed.length > 0;
  return isString && isNonEmpty;
};

export const validateAndNormalizeWorkflowsForConfig = (
  inputWorkflows: unknown[],
  tenantId: string,
  createdByAccountId: string
): CreateWorkflowDto[] => {
  const hasNoWorkflows = !Array.isArray(inputWorkflows) || inputWorkflows.length === 0;
  if (hasNoWorkflows) {
    throw new Error(CICD_CONFIG_ERROR_MESSAGES.WORKFLOWS_REQUIRED);
  }

  const normalized: CreateWorkflowDto[] = [];

  for (const wf of inputWorkflows) {
    const isObject = wf !== null && typeof wf === 'object';
    if (!isObject) {
      throw new Error(CICD_CONFIG_ERROR_MESSAGES.WORKFLOWS_REQUIRED);
    }

    const providerType = (wf as any).providerType;
    const integrationId = (wf as any).integrationId;
    const displayName = (wf as any).displayName;
    const workflowUrl = (wf as any).workflowUrl;
    const platform = (wf as any).platform;
    const workflowType = (wf as any).workflowType;
    const providerIdentifiers = (wf as any).providerIdentifiers;
    const parameters = (wf as any).parameters;
    const wfTenantId = (wf as any).tenantId;

    const integrationIdInvalid = !isNonEmptyString(integrationId);
    const displayNameInvalid = !isNonEmptyString(displayName);
    const workflowUrlInvalid = !isNonEmptyString(workflowUrl);
    const platformInvalid = !isNonEmptyString(platform);
    const providerTypeMissing = providerType === undefined || providerType === null;
    const workflowTypeMissing = workflowType === undefined || workflowType === null;
    const hasMissingRequired =
      providerTypeMissing ||
      workflowTypeMissing ||
      integrationIdInvalid ||
      displayNameInvalid ||
      workflowUrlInvalid ||
      platformInvalid;
    if (hasMissingRequired) {
      throw new Error(CICD_CONFIG_ERROR_MESSAGES.WORKFLOW_FIELDS_REQUIRED);
    }

    const providerInvalid = !Object.values(CICDProviderType).includes(providerType as CICDProviderType);
    const typeInvalid = !Object.values(WorkflowType).includes(workflowType as WorkflowType);
    const hasInvalidEnum = providerInvalid || typeInvalid;
    if (hasInvalidEnum) {
      throw new Error(CICD_CONFIG_ERROR_MESSAGES.WORKFLOW_PROVIDER_OR_TYPE_INVALID);
    }

    const tenantIdProvided = wfTenantId !== undefined && wfTenantId !== null;
    const tenantIdMismatch = tenantIdProvided && wfTenantId !== tenantId;
    if (tenantIdMismatch) {
      throw new Error(CICD_CONFIG_ERROR_MESSAGES.TENANT_MISMATCH);
    }

    const normalizedItem: CreateWorkflowDto = {
      tenantId,
      providerType: providerType as CICDProviderType,
      integrationId: (integrationId as string).trim(),
      displayName: (displayName as string).trim(),
      workflowUrl: (workflowUrl as string).trim(),
      providerIdentifiers: (providerIdentifiers as Record<string, unknown> | null | undefined) ?? null,
      platform: (platform as string).trim(),
      workflowType: workflowType as WorkflowType,
      parameters: (parameters as Record<string, unknown> | null | undefined) ?? null,
      createdByAccountId
    };
    normalized.push(normalizedItem);
  }

  return normalized;
};


