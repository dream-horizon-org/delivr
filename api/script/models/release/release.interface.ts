/**
 * Release Management Interfaces
 * Definitions for Release, CronJob, Tasks, History, Junction Tables, and Reference Tables
 */

// ============================================================================
// ENUMS (Database Schema Tied)
// ============================================================================

export enum PlatformName {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB'
}

export enum TargetName {
  WEB = 'WEB',
  PLAY_STORE = 'PLAY_STORE',
  APP_STORE = 'APP_STORE'
}

export enum ReleaseType {
  HOTFIX = 'HOTFIX',
  MINOR = 'MINOR',
  MAJOR = 'MAJOR'
}

/**
 * ReleaseStatus - Release lifecycle states
 */
export enum ReleaseStatus {
  PENDING = 'PENDING',           // Release created, not started
  IN_PROGRESS = 'IN_PROGRESS',   // Release actively running (replaces STARTED)
  PAUSED = 'PAUSED',             // Paused by user or task failure
  SUBMITTED = 'SUBMITTED',       // Build submitted, awaiting store approval
  COMPLETED = 'COMPLETED',       // Release successfully completed
  ARCHIVED = 'ARCHIVED'          // Release cancelled/archived
}

export enum StateChangeType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  REMOVE = 'REMOVE',
  ADD = 'ADD'
}

export enum ReleaseTaskConclusion {
  SUCCESS = 'success',
  FAILURE = 'failure',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped'
}

/**
 * RegressionCycleStatus - Regression cycle states
 */
export enum RegressionCycleStatus {
  NOT_STARTED = 'NOT_STARTED',   // Cycle created but not started
  IN_PROGRESS = 'IN_PROGRESS',   // Cycle actively running
  DONE = 'DONE',                 // Cycle completed
  ABANDONED = 'ABANDONED'        // Cycle abandoned by user (Feature 12)
}

export enum TaskType {
  // Stage 1: Kickoff (5 tasks)
  PRE_KICK_OFF_REMINDER = 'PRE_KICK_OFF_REMINDER',
  FORK_BRANCH = 'FORK_BRANCH',
  CREATE_PROJECT_MANAGEMENT_TICKET = 'CREATE_PROJECT_MANAGEMENT_TICKET',
  CREATE_TEST_SUITE = 'CREATE_TEST_SUITE',
  TRIGGER_PRE_REGRESSION_BUILDS = 'TRIGGER_PRE_REGRESSION_BUILDS',
  // Stage 2: Regression Testing (7 tasks)
  RESET_TEST_SUITE = 'RESET_TEST_SUITE',
  CREATE_RC_TAG = 'CREATE_RC_TAG',
  CREATE_RELEASE_NOTES = 'CREATE_RELEASE_NOTES',
  TRIGGER_REGRESSION_BUILDS = 'TRIGGER_REGRESSION_BUILDS',
  TRIGGER_AUTOMATION_RUNS = 'TRIGGER_AUTOMATION_RUNS',
  AUTOMATION_RUNS = 'AUTOMATION_RUNS',
  SEND_REGRESSION_BUILD_MESSAGE = 'SEND_REGRESSION_BUILD_MESSAGE',
  // Stage 3: Post-Regression (7 tasks)
  PRE_RELEASE_CHERRY_PICKS_REMINDER = 'PRE_RELEASE_CHERRY_PICKS_REMINDER',
  CREATE_RELEASE_TAG = 'CREATE_RELEASE_TAG',
  CREATE_FINAL_RELEASE_NOTES = 'CREATE_FINAL_RELEASE_NOTES',
  TRIGGER_TEST_FLIGHT_BUILD = 'TRIGGER_TEST_FLIGHT_BUILD',
  CREATE_AAB_BUILD = 'CREATE_AAB_BUILD', // Android AAB build task
  SEND_POST_REGRESSION_MESSAGE = 'SEND_POST_REGRESSION_MESSAGE',
  CHECK_PROJECT_RELEASE_APPROVAL = 'CHECK_PROJECT_RELEASE_APPROVAL',
  // Manual API (1 task)
  SUBMIT_TO_TARGET = 'SUBMIT_TO_TARGET'
}

/**
 * TaskStatus - Task execution states
 * 
 * AWAITING_CALLBACK vs AWAITING_MANUAL_BUILD:
 * - AWAITING_CALLBACK: CI/CD mode - waiting for external callback from build system
 * - AWAITING_MANUAL_BUILD: Manual mode - waiting for user to upload builds via API
 * 
 * Reference: MANUAL_BUILD_UPLOAD_FLOW_1.md
 */
export enum TaskStatus {
  PENDING = 'PENDING',                             // Task not started
  IN_PROGRESS = 'IN_PROGRESS',                     // Task currently executing
  AWAITING_CALLBACK = 'AWAITING_CALLBACK',         // CI/CD mode: waiting for external callback
  AWAITING_MANUAL_BUILD = 'AWAITING_MANUAL_BUILD', // Manual mode: waiting for user upload
  COMPLETED = 'COMPLETED',                         // Task finished successfully
  FAILED = 'FAILED',                               // Task failed
  SKIPPED = 'SKIPPED'                              // Task intentionally skipped (e.g., platform not applicable)
}

export enum TaskIdentifier {
  PRE_REGRESSION = 'PRE_REGRESSION_',
  REGRESSION = 'REGRESSION_',
  REGRESSION_SUB = 'REGRESSION_SUB_',
  PRE_RELEASE = 'PRE_RELEASE_'
}

export enum CronStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

/**
 * PauseType - Reason for release pause
 */
export enum PauseType {
  NONE = 'NONE',                             // Not paused
  AWAITING_STAGE_TRIGGER = 'AWAITING_STAGE_TRIGGER', // Waiting for manual stage trigger
  USER_REQUESTED = 'USER_REQUESTED',         // User manually paused
  TASK_FAILURE = 'TASK_FAILURE'              // Paused due to critical task failure
}

export enum StageStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum TaskStage {
  KICKOFF = 'KICKOFF',
  REGRESSION = 'REGRESSION',
  POST_REGRESSION = 'POST_REGRESSION'
}

/**
 * Phase - Derived UI display phase (14 values)
 * Calculated from: releaseStatus, stageStatuses, cronStatus, pauseType, cycleStatus
 */
export type Phase =
  | 'NOT_STARTED'                    // Release created, not started
  | 'KICKOFF'                        // Stage 1 running
  | 'AWAITING_REGRESSION'            // Stage 1 complete, waiting for Stage 2 trigger
  | 'REGRESSION'                     // Stage 2 running (current cycle active)
  | 'REGRESSION_AWAITING_NEXT_CYCLE' // Between regression cycles
  | 'AWAITING_POST_REGRESSION'       // Stage 2 complete, waiting for Stage 3 trigger
  | 'POST_REGRESSION'                // Stage 3 running
  | 'AWAITING_SUBMISSION'            // Stage 3 complete, waiting for Stage 4 trigger
  | 'SUBMISSION'                     // Stage 4 running, release IN_PROGRESS
  | 'SUBMITTED_PENDING_APPROVAL'     // Stage 4 running, release SUBMITTED
  | 'COMPLETED'                      // All stages complete
  | 'PAUSED_BY_USER'                 // User paused release
  | 'PAUSED_BY_FAILURE'              // Task failure paused release
  | 'ARCHIVED';                      // Release cancelled

// ============================================================================
// INTERFACES
// ============================================================================

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
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'COMPLETED' | 'ARCHIVED';
  type: 'MINOR' | 'HOTFIX' | 'MAJOR';
  branch: string | null;
  baseBranch: string | null;
  baseReleaseId: string | null; // Parent release ID (for hotfixes)
  releaseTag: string | null; // Final release tag (e.g., "v1.0.0_IOS_ANDROID")
  kickOffReminderDate: Date | null;
  kickOffDate: Date | null;
  targetReleaseDate: Date | null; // Target/planned release date
  releaseDate: Date | null; // Actual release date when marked as COMPLETED
  hasManualBuildUpload: boolean;
  createdByAccountId: string;
  releasePilotAccountId: string | null;
  lastUpdatedByAccountId: string;
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
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'COMPLETED' | 'ARCHIVED';
  type: 'MINOR' | 'HOTFIX' | 'MAJOR';
  branch: string | null;
  baseBranch: string | null;
  baseReleaseId: string | null;
  releaseTag?: string | null;
  kickOffReminderDate: Date | null;
  kickOffDate: Date | null;
  targetReleaseDate: Date | null;
  releaseDate: Date | null;
  hasManualBuildUpload: boolean;
  createdByAccountId: string;
  releasePilotAccountId: string | null;
  lastUpdatedByAccountId: string;
}

export interface UpdateReleaseDto {
  status?: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'COMPLETED' | 'ARCHIVED';
  type?: 'MINOR' | 'HOTFIX' | 'MAJOR';
  branch?: string | null;
  baseBranch?: string | null;
  baseReleaseId?: string | null;
  releaseTag?: string | null;
  releaseConfigId?: string | null;
  kickOffDate?: Date | null;
  kickOffReminderDate?: Date | null;
  targetReleaseDate?: Date | null;
  hasManualBuildUpload?: boolean;
  releasePilotAccountId?: string | null;
  lastUpdatedByAccountId?: string;
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
  stage4Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cronStatus: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  pauseType: 'NONE' | 'AWAITING_STAGE_TRIGGER' | 'USER_REQUESTED' | 'TASK_FAILURE';
  cronConfig: Record<string, unknown>;
  upcomingRegressions: any[] | null;
  cronCreatedAt: Date;
  cronStoppedAt: Date | null;
  cronCreatedByAccountId: string;
  lockedBy: string | null;
  lockedAt: Date | null;
  lockTimeout: number;
  autoTransitionToStage3: boolean;
  autoTransitionToStage2: boolean;
  stageData: any;
}

export interface CreateCronJobDto {
  id: string;
  releaseId: string;
  stage1Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage2Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage3Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage4Status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cronStatus: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  pauseType?: 'NONE' | 'AWAITING_STAGE_TRIGGER' | 'USER_REQUESTED' | 'TASK_FAILURE';
  cronConfig: Record<string, unknown>;
  upcomingRegressions?: any[] | null;
  cronCreatedByAccountId: string;
  autoTransitionToStage3?: boolean;
  autoTransitionToStage2?: boolean;
  stageData?: any;
}

export interface UpdateCronJobDto {
  stage1Status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage2Status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage3Status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage4Status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cronStatus?: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  pauseType?: 'NONE' | 'AWAITING_STAGE_TRIGGER' | 'USER_REQUESTED' | 'TASK_FAILURE';
  cronConfig?: Record<string, unknown>;
  upcomingRegressions?: any[] | null;
  cronStoppedAt?: Date | null;
  lockedBy?: string | null;
  lockedAt?: Date | null;
  autoTransitionToStage3?: boolean;
  autoTransitionToStage2?: boolean;
  stageData?: any;
}

// --- Release Task ---

export interface ReleaseTask {
  id: string;
  releaseId: string;
  taskId: string | null;
  taskType: TaskType;
  taskStatus: TaskStatus;
  taskConclusion: ReleaseTaskConclusion | null;
  stage: TaskStage;
  branch: string | null;
  isReleaseKickOffTask: boolean;
  isRegressionSubTasks: boolean;
  identifier: TaskIdentifier | null;
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
  taskType: TaskType;
  taskStatus?: TaskStatus;
  taskConclusion?: ReleaseTaskConclusion | null;
  stage: TaskStage;
  branch?: string | null;
  isReleaseKickOffTask?: boolean;
  isRegressionSubTasks?: boolean;
  identifier?: TaskIdentifier | null;
  accountId?: string | null;
  regressionId?: string | null;
  externalId?: string | null;
  externalData?: Record<string, unknown> | null;
}

export interface UpdateReleaseTaskDto {
  taskStatus?: TaskStatus;
  taskConclusion?: ReleaseTaskConclusion | null;
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

// --- Cron Configuration Types ---

/**
 * Cron configuration for release automation
 */
export interface CronConfig {
  automationBuilds?: boolean;
  automationRuns?: boolean;
  testFlightBuilds?: boolean; // For iOS TestFlight builds
  kickOffReminder?: boolean;
  preRegressionBuilds?: boolean;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Configuration for individual regression slot
 */
export interface RegressionSlotConfig {
  automationBuilds?: boolean;
  automationRuns?: boolean;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Regression slot with scheduled date and configuration
 */
export interface RegressionSlot {
  date: Date | string;
  config: RegressionSlotConfig;
}
