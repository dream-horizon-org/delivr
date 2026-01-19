import { getStorage } from "../../../../storage/storage-instance";
import { ERROR_MESSAGES } from "../constants";
import type { CICDIntegrationRepository } from "~models/integrations/ci-cd/connection/connection.repository";
import { CICDProviderType } from "~types/integrations/ci-cd/connection.interface";
import { createJenkinsAdapter } from "./jenkins-workflow-adapter.utils";
import { createGitHubActionsAdapter } from "./github-actions-workflow-adapter.utils";

export type ParametersResult = {
  parameters: Array<{
    name: string; type: string; description?: string; defaultValue?: unknown; options?: string[]; required?: boolean; choices?: string[];
  }>;
};

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type WorkflowAdapter = {
  fetchParameters: (tenantId: string, body: { workflowUrl?: string }) => Promise<ParametersResult>;
  trigger?: (tenantId: string, input: { workflowId?: string; workflowType?: string; platform?: string; jobParameters?: Record<string, unknown> }) => Promise<{ queueLocation: string }>;
  queueStatus?: (tenantId: string, body: { queueUrl: string }) => Promise<WorkflowStatus>;
  runStatus?: (tenantId: string, body: { runUrl?: string; owner?: string; repo?: string; runId?: string }) => Promise<WorkflowStatus>;
};

export const getWorkflowAdapter = (provider: CICDProviderType): WorkflowAdapter => {
  const isJenkins = provider === CICDProviderType.JENKINS;
  if (isJenkins) return createJenkinsAdapter();
  const isGha = provider === CICDProviderType.GITHUB_ACTIONS;
  if (isGha) return createGitHubActionsAdapter();
  throw new Error(ERROR_MESSAGES.OPERATION_NOT_SUPPORTED);
};

export const getIntegrationForTenant = async (tenantId: string, integrationId: string) => {
  const storage = getStorage();
  const repo = (storage as any).cicdIntegrationRepository as CICDIntegrationRepository;
  const integration = await repo.findById(integrationId);
  const invalid = !integration || integration.tenantId !== tenantId;
  if (invalid) {
    return null;
  }
  return integration;
};


