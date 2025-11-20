// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * SCM Service Types
 * Type definitions for Source Control Management operations
 */

export enum SCMType {
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket'
}

export enum WorkflowStatus {
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  WAITING = 'waiting',
  REQUESTED = 'requested'
}

export enum WorkflowConclusion {
  SUCCESS = 'success',
  FAILURE = 'failure',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped',
  TIMED_OUT = 'timed_out',
  ACTION_REQUIRED = 'action_required',
  NEUTRAL = 'neutral'
}

/**
 * Branch Operations
 */
export interface CreateBranchArgs {
  baseBranch: string;
  newBranch: string;
}

export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected?: boolean;
}

/**
 * Workflow Operations
 */
export interface TriggerWorkflowArgs<T = Record<string, any>> {
  workflowId: string;
  ref: string;
  inputs?: T;
}

export interface WorkflowRun {
  id: number;
  status: WorkflowStatus;
  conclusion: WorkflowConclusion | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
}

export interface RerunFailedJobsArgs {
  runId: string;
}

/**
 * Tag & Release Operations
 */
export interface CreateTagArgs {
  tagName: string;
  branchName: string;
  message?: string;
}

export interface Tag {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  zipball_url?: string;
  tarball_url?: string;
}

export interface CreateReleaseArgs {
  tagName: string;
  previousTag?: string;
  releaseName?: string;
  releaseBody?: string;
  draft?: boolean;
  prerelease?: boolean;
}

export interface Release {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  created_at: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
}

/**
 * Commit & PR Operations
 */
export interface CommitComparison {
  total_commits: number;
  commits: Array<{
    sha: string;
    commit: {
      message: string;
      author: {
        name: string;
        email: string;
        date: string;
      };
    };
  }>;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  html_url: string;
  user: {
    login: string;
  };
  merged: boolean;
}

/**
 * Webhook Operations
 */
export interface CreateWebhookArgs {
  webhookUrl: string;
  secret: string;
  events?: string[];
  active?: boolean;
}

export interface Webhook {
  id: number;
  name: string;
  active: boolean;
  events: string[];
  config: {
    url: string;
    content_type: string;
    secret?: string;
    insecure_ssl: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * SCM Configuration
 */
export interface SCMConfig {
  scmType: SCMType;
  owner: string;
  repo: string;
  accessToken: string;
  webhookSecret?: string;
}

/**
 * Release Notes Generation
 */
export interface ReleaseNotes {
  markdown: string;
  commits: number;
  pullRequests: number;
}

