import type { CICDProvider } from '../provider.interface';
import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';

export type JenkinsVerifyParams = {
  hostUrl: string;
  username: string;
  apiToken: string;
  useCrumb: boolean;
  crumbPath: string;
};

export type JenkinsVerifyResult = {
  isValid: boolean;
  message: string;
  details?: unknown;
};

export type JenkinsJobParamsRequest = {
  jobUrl: string;
  authHeader: string;
  useCrumb: boolean;
  crumbUrl: string;
  crumbHeaderFallback: string;
};

export type JenkinsJobParam = {
  name: string;
  type: 'boolean' | 'string' | 'choice';
  description?: string;
  defaultValue?: unknown;
  choices?: string[];
};

export type JenkinsJobParamsResult = {
  parameters: JenkinsJobParam[];
};

export type JenkinsTriggerRequest = {
  jobUrl: string;
  authHeader: string;
  useCrumb: boolean;
  crumbUrl: string;
  crumbHeaderFallback: string;
  formParams: Record<string, string>;
};

export type JenkinsTriggerResult = {
  accepted: boolean;
  queueLocation?: string;
  status?: number;
  statusText?: string;
  errorText?: string;
};

export type JenkinsQueueStatusRequest = {
  queueUrl: string;
  authHeader: string;
  timeoutMs: number;
};

export type JenkinsQueueStatus = 'pending' | 'running' | 'completed' | 'cancelled';

export interface JenkinsProviderContract extends CICDProvider {
  readonly type: CICDProviderType.JENKINS;
  verifyConnection(params: JenkinsVerifyParams): Promise<JenkinsVerifyResult>;
  fetchJobParameters(req: JenkinsJobParamsRequest): Promise<JenkinsJobParamsResult>;
  triggerJob(req: JenkinsTriggerRequest): Promise<JenkinsTriggerResult>;
  getQueueStatus(req: JenkinsQueueStatusRequest): Promise<JenkinsQueueStatus>;
}


