import type { Build } from '~models/release/build.repository';

/**
 * Result of polling a single build's workflow status
 */
export type BuildPollResult = {
  buildId: string;
  previousStatus: string;
  newStatus: string;
  updated: boolean;
  ciRunId?: string;
  error?: string;
};

/**
 * Result of polling all pending workflows for a release
 */
export type PollPendingResult = {
  releaseId: string;
  processed: number;
  updated: number;
  callbacks: number;
  results: BuildPollResult[];
};

/**
 * Result of polling all running workflows for a release
 */
export type PollRunningResult = {
  releaseId: string;
  processed: number;
  updated: number;
  callbacks: number;
  results: BuildPollResult[];
};

/**
 * Status check result from CI/CD provider
 */
export type WorkflowStatusCheckResult = {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  ciRunId?: string;
};

/**
 * Build with required fields for polling
 */
export type PollableBuild = Pick<Build, 
  | 'id' 
  | 'taskId' 
  | 'ciRunType' 
  | 'queueLocation' 
  | 'ciRunId' 
  | 'workflowStatus'
>;

