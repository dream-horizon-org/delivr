/**
 * Release Management Interfaces
 * Definitions for Release, CronJob, Tasks, History, Junction Tables, and Reference Tables
 */

// --- Platform (Reference Table) ---

export interface Platform {
  id: string;
  name: 'ANDROID' | 'IOS' | 'WEB';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlatformDto {
  id: string;
  name: 'ANDROID' | 'IOS' | 'WEB';
}

// --- Target (Reference Table) ---

export interface Target {
  id: string;
  name: 'WEB' | 'PLAY_STORE' | 'APP_STORE';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTargetDto {
  id: string;
  name: 'WEB' | 'PLAY_STORE' | 'APP_STORE';
}

// --- Release ---

export interface Release {
  id: string;
  releaseId: string; // User-facing release ID (e.g., "REL-001")
  releaseConfigId: string | null;
  tenantId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  type: 'PLANNED' | 'HOTFIX' | 'UNPLANNED';
  branch: string | null;
  baseBranch: string | null;
  baseReleaseId: string | null; // Parent release ID (for hotfixes)
  kickOffReminderDate: Date | null;
  kickOffDate: Date | null;
  targetReleaseDate: Date | null; // Target/planned release date
  releaseDate: Date | null; // Actual release date when marked as COMPLETED
  hasManualBuildUpload: boolean;
  createdBy: string;
  lastUpdatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Associations
  platformTargetMappings?: ReleasePlatformTargetMapping[];
}

export interface CreateReleaseDto {
  id: string;
  releaseId: string;
  releaseConfigId: string | null;
  tenantId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  type: 'PLANNED' | 'HOTFIX' | 'UNPLANNED';
  branch: string | null;
  baseBranch: string | null;
  baseReleaseId: string | null;
  kickOffReminderDate: Date | null;
  kickOffDate: Date | null;
  targetReleaseDate: Date | null;
  releaseDate: Date | null;
  hasManualBuildUpload: boolean;
  createdBy: string;
  lastUpdatedBy: string;
}

export interface UpdateReleaseDto {
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  type?: 'PLANNED' | 'HOTFIX' | 'UNPLANNED';
  branch?: string | null;
  baseBranch?: string | null;
  kickOffDate?: Date | null;
  plannedDate?: Date | null;
  hasManualBuildUpload?: boolean;
  lastUpdatedBy?: string;
}

// --- Platform Target Mapping ---

export interface ReleasePlatformTargetMapping {
  id: string;
  releaseId: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  target: 'WEB' | 'PLAY_STORE' | 'APP_STORE';
  version: string;
  projectManagementRunId: string | null;
  testManagementRunId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReleasePlatformTargetMappingDto {
  id: string;
  releaseId: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  target: 'WEB' | 'PLAY_STORE' | 'APP_STORE';
  version: string;
  projectManagementRunId?: string | null;
  testManagementRunId?: string | null;
}

// --- Cron Job ---

export interface CronJob {
  id: string;
  releaseId: string;
  stage1Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage2Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage3Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cronStatus: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  cronConfig: Record<string, unknown>;
  upcomingRegressions: any[] | null;
  cronCreatedAt: Date;
  cronStoppedAt: Date | null;
  cronCreatedByAccountId: string;
  lockedBy: string | null;
  lockedAt: Date | null;
  lockTimeout: number;
  autoTransitionToStage3: boolean;
}

export interface CreateCronJobDto {
  id: string;
  releaseId: string;
  stage1Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage2Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage3Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cronStatus: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  cronConfig: Record<string, unknown>;
  upcomingRegressions?: any[] | null;
  cronCreatedByAccountId: string;
  autoTransitionToStage3?: boolean;
}

export interface UpdateCronJobDto {
  stage1Status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage2Status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage3Status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cronStatus?: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  cronConfig?: Record<string, unknown>;
  upcomingRegressions?: any[] | null;
  cronStoppedAt?: Date | null;
  lockedBy?: string | null;
  lockedAt?: Date | null;
  autoTransitionToStage3?: boolean;
}

// --- Release Task ---

export interface ReleaseTask {
  id: string;
  releaseId: string;
  taskId: string | null;
  taskType: string;
  taskStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  taskConclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  stage: 'KICKOFF' | 'REGRESSION' | 'POST_REGRESSION';
  branch: string | null;
  isReleaseKickOffTask: boolean;
  isRegressionSubTasks: boolean;
  identifier: string | null;
  accountId: string | null;
  regressionId: string | null;
  externalId: string | null;
  externalData: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReleaseTaskDto {
  id: string;
  releaseId: string;
  taskId?: string | null;
  taskType: string;
  taskStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  taskConclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  stage: 'KICKOFF' | 'REGRESSION' | 'POST_REGRESSION';
  branch?: string | null;
  isReleaseKickOffTask?: boolean;
  isRegressionSubTasks?: boolean;
  identifier?: string | null;
  accountId?: string | null;
  regressionId?: string | null;
  externalId?: string | null;
  externalData?: Record<string, unknown> | null;
}

export interface UpdateReleaseTaskDto {
  taskStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  taskConclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  externalId?: string | null;
  externalData?: Record<string, unknown> | null;
}

// --- State History ---

export interface StateHistory {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'REMOVE' | 'ADD';
  accountId: string;
  releaseId: string | null;
  codepushId: string | null;
  settingsId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStateHistoryDto {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'REMOVE' | 'ADD';
  accountId: string;
  releaseId?: string | null;
  codepushId?: string | null;
  settingsId?: string | null;
}
