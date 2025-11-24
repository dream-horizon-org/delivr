/**
 * Release Management Interfaces
 * Definitions for Release, CronJob, Tasks, History, and Junction Tables
 */

import { ReleaseType, ReleaseStatus, UpdateType, StageStatus, CronStatus, TaskType, TaskStage, TaskStatus, TaskIdentifier, ReleaseTaskConclusion, StateChangeType, PlatformName, TargetName } from '../../storage/release/release-models';

// --- Release ---

export interface Release {
  id: string;
  tenantId: string;
  type: ReleaseType;
  status: ReleaseStatus;
  targetReleaseDate: Date;
  plannedDate: Date;
  baseBranch: string | null;
  baseVersion: string;
  parentId: string | null;
  releasePilotAccountId: string;
  createdByAccountId: string | null;
  lastUpdateByAccountId: string;
  kickOffReminderDate: Date | null;
  customIntegrationConfigs: Record<string, unknown> | null;
  regressionBuildSlots: any[] | null; // TODO: Type strictly
  preCreatedBuilds: any[] | null; // TODO: Type strictly
  branchRelease: string | null;
  releaseKey: string;
  hasManualBuildUpload: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Associations
  platformTargetMappings?: ReleasePlatformTargetMapping[];
}

export interface CreateReleaseDto {
  id: string;
  tenantId: string;
  accountId: string; // Creator
  type: ReleaseType;
  status?: ReleaseStatus;
  targetReleaseDate: Date;
  plannedDate: Date;
  baseBranch?: string;
  baseVersion?: string; // Defaults to version if not provided
  parentId?: string;
  releasePilotAccountId: string;
  kickOffReminderDate?: Date;
  customIntegrationConfigs?: Record<string, unknown>;
  regressionBuildSlots?: any[];
  preCreatedBuilds?: any[];
  releaseKey: string; // e.g. "REL-001"
  hasManualBuildUpload?: boolean;
}

// --- Release Platforms Targets Mapping (Consolidated) ---

export interface ReleasePlatformTargetMapping {
  id: string;
  releaseId: string;
  platform: PlatformName;
  target: TargetName;
  version: string;
  projectManagementRunId: string | null;
  testManagementRunId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReleasePlatformTargetMappingDto {
  id: string;
  releaseId: string;
  platform: PlatformName;
  target: TargetName;
  version: string;
  projectManagementRunId?: string | null;
  testManagementRunId?: string | null;
}

// --- Cron Job ---

export interface CronJob {
  id: string;
  releaseId: string;
  stage1Status: StageStatus;
  stage2Status: StageStatus;
  stage3Status: StageStatus;
  cronStatus: CronStatus;
  cronConfig: {
    kickOffReminder?: boolean;
    preRegressionBuilds?: boolean;
    automationBuilds?: boolean;
    automationRuns?: boolean;
    testFlightBuilds?: boolean;
  };
  upcomingRegressions: any[] | null;
  regressionTimings: string;
  cronCreatedByAccountId: string;
  autoTransitionToStage3: boolean;
}

export interface CreateCronJobDto {
  id: string;
  releaseId: string;
  accountId: string;
  cronConfig: Record<string, unknown>;
  upcomingRegressions?: any[];
  regressionTimings?: string;
}

// --- Release Task ---

export interface ReleaseTask {
  id: string;
  releaseId: string;
  taskId: string;
  taskType: TaskType;
  stage: TaskStage;
  taskStatus: TaskStatus;
  taskConclusion: ReleaseTaskConclusion | null;
  accountId: string | null;
  isReleaseKickOffTask: boolean;
  isRegressionSubTasks: boolean;
  identifier: TaskIdentifier | null;
  externalId: string | null;
  externalData: Record<string, unknown> | null;
  branch: string | null;
  regressionId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateReleaseTaskDto {
  id: string;
  releaseId: string;
  taskId: string;
  taskType: TaskType;
  stage: TaskStage;
  accountId: string;
  isReleaseKickOffTask?: boolean;
  isRegressionSubTasks?: boolean;
  identifier?: TaskIdentifier;
  branch?: string;
  regressionId?: string;
}

// --- State History ---

export interface StateHistory {
  id: string;
  releaseId: string;
  accountId: string;
  action: StateChangeType;
}

export interface CreateStateHistoryDto {
  id: string;
  releaseId: string;
  accountId: string;
  action: StateChangeType;
}

export interface CreateStateHistoryItemDto {
  id: string;
  historyId: string;
  group: string;
  type: StateChangeType;
  key: string;
  value: string | null;
  oldValue: string | null;
  metadata: Record<string, unknown> | null;
}

