/**
 * Type definitions for Release Management
 * 
 * Follows cursorrules: No 'any' types - use explicit types or 'unknown'
 */

import { Request, Response } from 'express';
import { Sequelize } from 'sequelize';
import * as storageTypes from '../../storage/storage';
import { ReleaseType, Phase } from '../../models/release/release.interface';

/**
 * Extended Storage interface that includes Sequelize instance
 * (Sequelize is added dynamically by the storage implementation)
 */
export interface StorageWithSequelize extends storageTypes.Storage {
  sequelize: Sequelize;
}

/**
 * Express Request with typed user
 * User is set by authentication middleware
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
    name?: string;
  };
}

/**
 * API Response type
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

/**
 * Active stage enum - simplified view of where the release is
 * Null indicates terminal state (COMPLETED or ARCHIVED)
 */
export type ActiveStage = 
  | 'PRE_KICKOFF'
  | 'KICKOFF'
  | 'REGRESSION'
  | 'PRE_RELEASE'
  | 'RELEASE_SUBMISSION'
  | 'RELEASE'
  | null;

/**
 * Platform-Target-Version mapping for release creation
 */
export interface PlatformTargetVersion {
  platform: string;  // e.g., "ANDROID", "IOS"
  target: string;    // e.g., "PLAY_STORE", "APP_STORE"
  version: string;   // e.g., "v6.5.0"
}

/**
 * Lightweight release data with platform targets
 * Used for scheduled release version bumping
 */
export type ReleaseWithPlatformTargets = {
  id: string;
  releaseId: string;
  releaseConfigId: string | null;
  tenantId: string;
  platformTargets: PlatformTargetVersion[];
};

/**
 * Release creation payload (internal service layer)
 * Note: Uses Date objects (not strings) since this is internal to the service layer
 */
export interface CreateReleasePayload {
  tenantId: string;
  accountId: string;
  platformTargets: PlatformTargetVersion[]; // Array of platform-target-version combinations
  type: 'MAJOR' | 'MINOR' | 'HOTFIX';
  releaseConfigId?: string;
  branch?: string;
  baseBranch?: string;
  baseReleaseId?: string;
  targetReleaseDate?: Date;
  kickOffReminderDate?: Date;
  kickOffDate?: Date;
  releasePilotAccountId?: string;
  regressionBuildSlots?: any[];
  cronConfig?: {
    kickOffReminder?: boolean;
    preRegressionBuilds?: boolean;
    automationBuilds?: boolean;
    automationRuns?: boolean;
    testFlightBuilds?: boolean;
  };
  hasManualBuildUpload?: boolean;
}

/**
 * Release creation result (returned by service)
 */
export interface CreateReleaseResult {
  release: any;
  cronJob: any;
  stage1TaskIds: string[];
}

/**
 * Release creation request body (HTTP API)
 */
export interface CreateReleaseRequestBody {
  type: string;
  platformTargets: Array<{
    platform: string;  // e.g., "ANDROID", "IOS"
    target: string;    // e.g., "PLAY_STORE", "APP_STORE"
    version: string;   // e.g., "v6.5.0"
  }>;
  releaseConfigId?: string;
  branch?: string;
  baseBranch?: string;
  baseReleaseId?: string;
  targetReleaseDate?: string;
  kickOffReminderDate?: string;
  kickOffDate?: string;
  releasePilotAccountId?: string;
  hasManualBuildUpload?: boolean;
  regressionBuildSlots?: Array<{
    date: string;
    config: Record<string, unknown>;
  }>;
  cronConfig?: {
    kickOffReminder?: boolean;
    preRegressionBuilds?: boolean;
    automationBuilds?: boolean;
    automationRuns?: boolean;
  };
}

/**
 * Regression build slot type
 */
export interface RegressionBuildSlot {
  date: Date;
  config: Record<string, unknown>;
}


/**
 * Cron job configuration in release response
 */
export interface CronJobResponse {
  id: string;
  stage1Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage2Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage3Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage4Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cronStatus: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  pauseType: 'NONE' | 'AWAITING_STAGE_TRIGGER' | 'USER_REQUESTED' | 'TASK_FAILURE';
  cronConfig: Record<string, unknown>;
  upcomingRegressions: any[] | null;
  cronCreatedAt: string;
  cronStoppedAt: string | null;
  cronCreatedByAccountId: string;
  autoTransitionToStage2: boolean;
  autoTransitionToStage3: boolean;
  stageData: any;
}

/**
 * Release task response
 */
export interface ReleaseTaskResponse {
  id: string;
  taskId: string;
  taskType: string;
  stage: string;
  taskStatus: string;
  taskConclusion: string | null;
  accountId: string | null;
  isReleaseKickOffTask: boolean;
  isRegressionSubTasks: boolean;
  identifier: string | null;
  externalId: string | null;
  externalData: Record<string, unknown> | null;
  branch: string | null;
  regressionId: string | null;
  builds: BuildInfoResponse[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Release retrieval response body (single release)
 */
export interface ReleaseResponseBody {
  id: string;
  releaseId: string;
  releaseConfigId: string | null;
  tenantId: string;
  type: 'MAJOR' | 'MINOR' | 'HOTFIX';
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'COMPLETED' | 'ARCHIVED';
  currentActiveStage?: ActiveStage;
  releasePhase?: Phase;
  branch: string | null;
  baseBranch: string | null;
  baseReleaseId: string | null;
  platformTargetMappings: any[];
  kickOffReminderDate: string | null;
  kickOffDate: string | null;
  targetReleaseDate: string | null;
  releaseDate: string | null;
  hasManualBuildUpload: boolean;
  createdByAccountId: string;
  releasePilotAccountId: string | null;
  lastUpdatedByAccountId: string;
  createdAt: string;
  updatedAt: string;
  cronJob?: CronJobResponse;
  tasks?: ReleaseTaskResponse[];
}

/**
 * Release list response body (multiple releases)
 */
export interface ReleaseListResponseBody {
  success: boolean;
  releases: ReleaseResponseBody[];
}

/**
 * Single release response body
 */
export interface SingleReleaseResponseBody {
  success: boolean;
  release: ReleaseResponseBody;
}

/**
 * Regression cycle response structure
 */
export interface RegressionCycleResponse {
  id: string;
  releaseId: string;
  isLatest: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'ABANDONED';
  cycleTag: string | null;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Build info response structure
 */
export interface BuildInfoResponse {
  // Mandatory fields (in both builds and uploads)
  id: string;
  tenantId: string;
  releaseId: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  buildStage: 'KICK_OFF' | 'REGRESSION' | 'PRE_RELEASE';
  artifactPath: string | null;
  internalTrackLink: string | null;
  testflightNumber: string | null;
  createdAt: string;
  updatedAt: string;

  // Optional fields (only in builds table)
  buildType?: 'MANUAL' | 'CI_CD';
  buildUploadStatus?: 'PENDING' | 'UPLOADED' | 'FAILED';
  storeType?: 'APP_STORE' | 'PLAY_STORE' | 'TESTFLIGHT' | 'MICROSOFT_STORE' | 'FIREBASE' | 'WEB' | null;
  buildNumber?: string | null;
  artifactVersionName?: string | null;
  regressionId?: string | null;
  ciRunId?: string | null;
  queueLocation?: string | null;
  workflowStatus?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null;
  ciRunType?: 'JENKINS' | 'GITHUB_ACTIONS' | 'CIRCLE_CI' | 'GITLAB_CI' | null;
  taskId?: string | null;

  // Optional fields (only in uploads table)
  isUsed?: boolean;
  usedByTaskId?: string | null;
}

/**
 * Regression slot structure
 */
export interface RegressionSlotResponse {
  date: string;
  config: Record<string, unknown>;
}

/**
 * Stage tasks response - common structure for KICKOFF and PRE_RELEASE
 * API #2: GET /tenants/:tenantId/releases/:releaseId/tasks?stage={stage}
 */
export interface StageTasksResponseBody {
  success: true;
  stage: 'KICKOFF' | 'PRE_RELEASE';
  releaseId: string;
  tasks: ReleaseTaskResponse[];
  uploadedBuilds: BuildInfoResponse[];
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

/**
 * Approval status for regression stage
 * Indicates whether the regression stage can be approved
 */
export interface ApprovalStatusResponse {
  canApprove: boolean;
  approvalRequirements: {
    testManagementPassed: boolean;
    cherryPickStatusOk: boolean;
    cyclesCompleted: boolean;
  };
}

/**
 * REGRESSION stage tasks response - includes additional fields
 * API #2: GET /tenants/:tenantId/releases/:releaseId/tasks?stage=REGRESSION
 */
export interface RegressionStageTasksResponseBody {
  success: true;
  stage: 'REGRESSION';
  releaseId: string;
  tasks: ReleaseTaskResponse[];
  stageStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cycles: RegressionCycleResponse[];
  uploadedBuilds: BuildInfoResponse[];
  currentCycle: RegressionCycleResponse | null;
  approvalStatus: ApprovalStatusResponse;
  upcomingSlot: RegressionSlotResponse[] | null;
}

/**
 * Error response for stage tasks
 */
export interface StageTasksErrorResponse {
  success: false;
  error: string;
  statusCode: number;
}

/**
 * Union type for stage tasks result
 */
export type StageTasksResult = StageTasksResponseBody | RegressionStageTasksResponseBody | StageTasksErrorResponse;

/**
 * Update release request body (HTTP API)
 */
export interface UpdateReleaseRequestBody {
  id?: string;
  releaseId?: string;
  releaseConfigId?: string;
  tenantId?: string;
  type?: 'MAJOR' | 'MINOR' | 'HOTFIX';
  status?: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'COMPLETED' | 'ARCHIVED';
  branch?: string;
  baseBranch?: string;
  baseReleaseId?: string;
  kickOffReminderDate?: string;
  kickOffDate?: string;
  targetReleaseDate?: string;
  delayReason?: string;  // Required when extending targetReleaseDate
  releaseDate?: string;
  hasManualBuildUpload?: boolean;
  createdByAccountId?: string;
  releasePilotAccountId?: string;
  lastUpdatedByAccountId?: string;
  createdAt?: string;
  updatedAt?: string;
  platformTargetMappings?: Array<{
    id: string;
    releaseId?: string;
    platform: string;
    target: string;
    version: string;
    projectManagementRunId?: string | null;
    testManagementRunId?: string | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
  tasks?: Array<{
    id: string;
    taskId: string;
    taskType: string;
    stage: string;
    taskStatus: string;
    taskConclusion?: string | null;
    accountId: string;
    regressionId?: string | null;
    isReleaseKickOffTask: boolean;
    isRegressionSubTasks: boolean;
    identifier: string;
    externalId?: string | null;
    externalData?: any;
    branch?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  cronJob?: {
    id?: string;
    stage1Status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    stage2Status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    stage3Status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    cronStatus?: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
    cronConfig?: Record<string, unknown>;
    upcomingRegressions?: Array<{
      date: string;
      config: Record<string, unknown>;
    }>;
    cronCreatedAt?: string;
    cronStoppedAt?: string | null;
    cronCreatedByAccountId?: string;
    autoTransitionToStage2?: boolean;
    stageData?: any;
  };
}

/**
 * Type guard to check if storage has Sequelize
 */
export function hasSequelize(storage: storageTypes.Storage): storage is StorageWithSequelize {
  return 'sequelize' in storage && storage.sequelize instanceof Sequelize;
}

