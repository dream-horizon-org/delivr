import { WorkflowStatus } from '~controllers/integrations/ci-cd/workflows/workflow-adapter.utils';
import type { CICDProvider } from '../provider.interface';
import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';

/**
 * Jenkins build result values we care about.
 * SUCCESS = completed, FAILURE (or anything else) = failed.
 */
export const JENKINS_BUILD_RESULTS = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE'
} as const;

export type JenkinsVerifyParams = {
  hostUrl: string;
  username: string;
  apiToken: string;
  useCrumb: boolean;
  crumbPath: string;
};

export type JenkinsVerifyResult = {
  success: boolean;           // Renamed from isValid for consistency
  message: string;
  statusCode?: number;        // HTTP status code (401, 403, 404, 408, 503, etc.)
  details?: {
    errorCode?: string;
    message?: string;
  };
};

export type JenkinsJobParamsRequest = {
  workflowUrl: string;
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
  options?: string[];
};

export type JenkinsJobParamsResult = {
  parameters: JenkinsJobParam[];
};

export type JenkinsTriggerRequest = {
  workflowUrl: string;
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
/**
 * Enhanced result from queue status check.
 * Includes executableUrl when job transitions from queue to running.
 */
export type JenkinsQueueStatusResult = {
  status: WorkflowStatus;
  /** 
   * The actual build URL (executable.url from Jenkins API).
   * Available when job has started running (status !== 'pending').
   * This is the ciRunId for Jenkins builds.
   */
  executableUrl?: string;
};

/**
 * Request to check status of a running Jenkins build.
 * Use this when you have the build URL (ciRunId) from a previous queue status check.
 */
export type JenkinsBuildStatusRequest = {
  buildUrl: string;
  authHeader: string;
  timeoutMs: number;
};

/**
 * Result from build status check.
 */
export type JenkinsBuildStatusResult = {
  status: WorkflowStatus;
  buildUrl: string;
};

export interface JenkinsProviderContract extends CICDProvider {
  readonly type: CICDProviderType.JENKINS;
  verifyConnection(params: JenkinsVerifyParams): Promise<JenkinsVerifyResult>;
  fetchJobParameters(req: JenkinsJobParamsRequest): Promise<JenkinsJobParamsResult>;
  triggerJob(req: JenkinsTriggerRequest): Promise<JenkinsTriggerResult>;
  getQueueStatus(req: JenkinsQueueStatusRequest): Promise<JenkinsQueueStatusResult>;
  getBuildStatus(req: JenkinsBuildStatusRequest): Promise<JenkinsBuildStatusResult>;
}


