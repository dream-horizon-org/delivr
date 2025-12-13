// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Release Management Types
 * Based on OG Delivr schema with tenant-centric modifications
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ReleaseType {
  HOTFIX = 'HOTFIX',
  MINOR = 'MINOR',
  MAJOR = 'MAJOR'
}

// Backend release statuses (matches database enum)
export enum ReleaseStatus {
  IN_PROGRESS = 'IN_PROGRESS', // Release is in progress
  COMPLETED = 'COMPLETED',     // Release is completed
  ARCHIVED = 'ARCHIVED'        // Release is archived
}

export enum UpdateType {
  OPTIONAL = 'OPTIONAL',
  FORCE = 'FORCE'
}

export enum PlatformName {
  ANDROID = 'ANDROID',
  IOS = 'IOS'
}

export enum TargetName {
  WEB = 'WEB',
  PLAY_STORE = 'PLAY_STORE',
  APP_STORE = 'APP_STORE'
}

export enum BuildStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum TaskType {
  PRE_KICK_OFF_REMINDER = 'PRE_KICK_OFF_REMINDER',
  FORK_BRANCH = 'FORK_BRANCH',
  UPDATE_GITHUB_VARIABLES = 'UPDATE_GITHUB_VARIABLES',
  PRE_RELEASE_CHERRY_PICKS_REMINDER = 'PRE_RELEASE_CHERRY_PICKS_REMINDER',
  ADD_L6_APPROVAL_CHECK = 'ADD_L6_APPROVAL_CHECK',
  FINAL_PRE_REGRESSION_BUILDS = 'FINAL_PRE_REGRESSION_BUILDS',
  TRIGGER_REGRESSION_BUILDS = 'TRIGGER_REGRESSION_BUILDS',
  AUTOMATION_RUNS = 'AUTOMATION_RUNS',
  TRIGGER_AUTOMATION_RUNS = 'TRIGGER_AUTOMATION_RUNS',
  RESET_TEST_RAIL_STATUS = 'RESET_TEST_RAIL_STATUS',
  CHERRY_REMINDER = 'CHERRY_REMINDER',
  CREATE_RELEASE_NOTES = 'CREATE_RELEASE_NOTES',
  TEST_FLIGHT_BUILD = 'TEST_FLIGHT_BUILD',
  CREATE_RELEASE_TAG = 'CREATE_RELEASE_TAG'
}

export enum CherryPickStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PICKED = 'PICKED',
  FAILED = 'FAILED'
}

export enum IntegrationType {
  GITHUB = 'GITHUB',
  GITLAB = 'GITLAB',
  JENKINS = 'JENKINS',
  GITHUB_ACTIONS = 'GITHUB_ACTIONS',
  SLACK = 'SLACK',
  TEAMS = 'TEAMS',
  JIRA = 'JIRA',
  APP_STORE_CONNECT = 'APP_STORE_CONNECT',
  PLAY_STORE = 'PLAY_STORE',
  TEST_RAIL = 'TEST_RAIL'
}


export interface SCMIntegration {
  id: string;
  tenantId: string;
  scmType: 'GITHUB' | 'GITLAB' | 'BITBUCKET';
  displayName: string;
  owner: string;
  repo: string;
  branch?: string;
  // accessToken excluded for security
  status: 'VALID' | 'INVALID' | 'PENDING';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Release {
  id: string;
  tenantId: string;
  releaseKey: string;
  version: string;
  type: ReleaseType;
  status: ReleaseStatus;
  updateType: UpdateType;
  baseVersion: string;
  baseBranch: string;
  branchRelease: string;
  branchCodepush?: string;
  plannedDate: string;
  targetReleaseDate: string;
  releaseDate?: string;
  kickOffReminderDate?: string;
  isDelayed: boolean;
  delayedReason?: string;
  releasePilot: {
    id: string;
    name: string;
    email: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  lastUpdatedBy: {
    id: string;
    name: string;
    email: string;
  };
  parentId?: string;
  releaseTag?: string;
  slackMessageTimestamps?: Record<string, string>;
  userAdoption: {
    ios: number;
    android: number;
    web: number;
  };
  finalBuildNumbers?: {
    ios?: string;
    android?: string;
    web?: string;
  };
  epicIds?: {
    ios?: string;
    android?: string;
    web?: string;
  };
  testRunIds?: {
    ios?: string;
    android?: string;
    web?: string;
  };
  autoPilot: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export interface Build {
  id: string;
  releaseId: string;
  platform: PlatformName;
  target: TargetName;
  buildNumber: string;
  buildLink?: string;
  status: BuildStatus;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ReleaseTask {
  id: string;
  releaseId: string;
  taskType: TaskType;
  status: TaskStatus;
  taskId?: string;
  branch?: string;
  workflowId?: string;
  runId?: string;
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CherryPick {
  id: string;
  releaseId: string;
  commitId: string;
  prLink: string;
  jiraLink?: string;
  status: CherryPickStatus;
  isApprovalRequired: boolean;
  author: {
    id: string;
    name: string;
    email: string;
  };
  approver?: {
    id: string;
    name: string;
    email: string;
  };
  approvalStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseAnalytics {
  releaseId: string;
  totalDuration: number; // in hours
  buildTime: number;
  testTime: number;
  deploymentTime: number;
  cherryPickCount: number;
  tasksCompleted: number;
  tasksTotal: number;
  bugCount: number;
  userAdoptionRate: {
    ios: number;
    android: number;
    web: number;
  };
  timeline: {
    kickOff: string;
    regressionStart: string;
    buildsSubmitted: string;
    released: string;
  };
}

export interface TenantIntegration {
  id: string;
  tenantId: string;
  integrationType: IntegrationType;
  isEnabled: boolean;
  isRequired: boolean;
  config: Record<string, any>;
  verificationStatus: 'NOT_VERIFIED' | 'VALID' | 'INVALID' | 'EXPIRED';
  lastVerifiedAt?: string;
  configuredBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseCycle {
  id: string;
  tenantId: string;
  name: string;
  duration: number; // in weeks
  phases: ReleasePhase[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReleasePhase {
  name: string;
  durationDays: number;
  tasks: TaskType[];
  order: number;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateReleaseRequest {
  tenantId: string;
  version: string;
  type: ReleaseType;
  baseVersion: string;
  baseBranch: string;
  plannedDate: string;
  targetReleaseDate: string;
  releasePilotId: string;
  updateType?: UpdateType;
  kickOffReminderDate?: string;
  parentId?: string;
}

export interface UpdateReleaseRequest {
  status?: ReleaseStatus;
  isDelayed?: boolean;
  delayedReason?: string;
  releasePilotId?: string;
  targetReleaseDate?: string;
  releaseDate?: string;
}

export interface CreateBuildRequest {
  releaseId: string;
  platform: PlatformName;
  target: TargetName;
  buildNumber: string;
}

export interface CreateCherryPickRequest {
  releaseId: string;
  commitId: string;
  prLink: string;
  jiraLink?: string;
  isApprovalRequired: boolean;
}

export interface ApproveCherryPickRequest {
  cherryPickId: string;
  approved: boolean;
  comments?: string;
}

export interface TriggerBuildRequest {
  releaseId: string;
  platform: PlatformName;
  target: TargetName;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ReleasesResponse {
  releases: Release[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReleaseDetailsResponse {
  release: Release;
  builds: Build[];
  tasks: ReleaseTask[];
  cherryPicks: CherryPick[];
  analytics: ReleaseAnalytics;
}

export interface IntegrationsResponse {
  integrations: TenantIntegration[];
}

export interface ReleaseCyclesResponse {
  cycles: ReleaseCycle[];
}


export interface VerifySCMRequest {
  tenantId: string;
  scmType: 'GITHUB' | 'GITLAB' | 'BITBUCKET';
  owner: string;
  repo: string;
  accessToken: string;
}

export interface VerifySCMResponse {
  success: boolean;
  repoDetails?: {
    fullName: string;
    description: string;
    defaultBranch: string;
    private: boolean;
  };
  error?: string;
}
