import { WorkflowStatus } from '~controllers/integrations/ci-cd/workflows/workflow-adapter.utils';
import type { CICDProvider } from '../provider.interface';
import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';

export type GHAVerifyParams = {
  apiToken: string;
  githubApiBase: string;
  userAgent: string;
  acceptHeader: string;
  timeoutMs: number;
};

export type GHAVerifyResult = {
  isValid: boolean;
  message: string;
  details?: any;
};

export type GHAWorkflowInputsParams = {
  token: string;
  workflowUrl: string;
  acceptHeader: string;
  userAgent: string;
  timeoutMs: number;
};

export type GHAInput = {
  name: string;
  type: string;
  description?: string;
  defaultValue?: unknown;
  options?: string[];
  required?: boolean;
};

export type GHAWorkflowInputsResult = {
  inputs: GHAInput[];
};

export type GHARunStatusParams = {
  token: string;
  owner: string;
  repo: string;
  runId: string;
  acceptHeader: string;
  userAgent: string;
  timeoutMs: number;
};

export type GHAWorkflowDispatchParams = {
  token: string;
  owner: string;
  repo: string;
  workflow: string; // file name or workflow path
  ref: string;
  inputs: Record<string, unknown>;
  acceptHeader: string;
  userAgent: string;
  timeoutMs: number;
};

export type GHAWorkflowDispatchResult = {
  accepted: boolean;
  htmlUrl?: string;
};

export type GHAFindDispatchedRunParams = {
  token: string;
  owner: string;
  repo: string;
  workflow: string;
  ref: string;
  createdSinceIso: string;
  acceptHeader: string;
  userAgent: string;
  timeoutMs: number;
};

export type GHAFindDispatchedRunResult = {
  runId: string;
  htmlUrl: string;
} | null;

export interface GitHubActionsProviderContract extends CICDProvider {
  readonly type: CICDProviderType.GITHUB_ACTIONS;
  verifyConnection(params: GHAVerifyParams): Promise<GHAVerifyResult>;
  fetchWorkflowInputs(params: GHAWorkflowInputsParams): Promise<GHAWorkflowInputsResult>;
  getRunStatus(params: GHARunStatusParams): Promise<WorkflowStatus>;
  triggerWorkflowDispatch(params: GHAWorkflowDispatchParams): Promise<GHAWorkflowDispatchResult>;
  findLatestWorkflowDispatchRun(params: GHAFindDispatchedRunParams): Promise<GHAFindDispatchedRunResult>;
}


