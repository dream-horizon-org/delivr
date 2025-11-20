import type { CICDProvider } from '../provider.interface';
import { CICDProviderType } from '../../../../../storage/integrations/ci-cd/ci-cd-types';

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

export type GHARunStatus = 'pending' | 'running' | 'completed';

export interface GitHubActionsProviderContract extends CICDProvider {
  readonly type: CICDProviderType.GITHUB_ACTIONS;
  verifyConnection(params: GHAVerifyParams): Promise<GHAVerifyResult>;
  fetchWorkflowInputs(params: GHAWorkflowInputsParams): Promise<GHAWorkflowInputsResult>;
  getRunStatus(params: GHARunStatusParams): Promise<GHARunStatus>;
}


