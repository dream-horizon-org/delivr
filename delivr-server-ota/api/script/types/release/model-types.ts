/**
 * Sequelize Model Attribute Interfaces for Release Orchestration
 * 
 * 
 * Pattern: Model<Attributes, CreationAttributes>
 * - Attributes: All fields (including auto-generated like id, timestamps)
 * - CreationAttributes: Fields required for .create() (Optional<> for auto-generated fields)
 */

import { Model, Optional } from 'sequelize';
import {
  ReleaseType,
  ReleaseStatus,
  CronStatus,
  StageStatus,
  TaskType,
  TaskStatus,
  TaskStage,
  ReleaseTaskConclusion,
  TaskIdentifier,
  RegressionCycleStatus
} from '../../models/release/release.interface';
import type { RegressionSlot, CronConfig } from '../../models/release/release.interface';

/**
 * Pre-created build information
 */
export interface PreCreatedBuild {
  platform: string;
  target: string;
  buildNumber: string;
  buildUrl: string;
}

// ============================================================================
// RELEASE MODEL ATTRIBUTES
// ============================================================================

/**
 * Release Model Attributes
 */
export interface ReleaseAttributes {
  // Primary key
  id: string;
  
  // Release identification
  releaseKey: string;
  version: string;
  
  // Multi-tenancy
  appId: string | null;
  
  // Release metadata
  type: ReleaseType;
  status: ReleaseStatus;
  
  // Dates
  kickOffReminderDate: Date | null;
  plannedDate: Date;
  releaseDate: Date | null;
  targetReleaseDate: Date;
  
  // Delay tracking
  delayed: boolean;
  delayedReason: string | null;
  
  // Version control
  baseVersion: string;
  baseBranch: string | null;
  branchRelease: string | null;
  branchCodepush: string | null;
  
  // Update settings
  updateType: 'OPTIONAL' | 'FORCE';
  
  // Ownership & permissions
  createdByAccountId: string | null;
  releasePilotAccountId: string;
  lastUpdatedByAccountId: string;
  
  // Parent release (for hotfixes)
  parentId: string | null;
  
  // Test run IDs
  iosTestRunId: string | null;
  webTestRunId: string | null;
  playStoreRunId: string | null;
  
  // Epic IDs (Jira)
  webEpicId: string | null;
  playStoreEpicId: string | null;
  iosEpicId: string | null;
  
  // Release tag
  releaseTag: string | null;
  
  // Slack integration
  slackMessageTimestamps: Record<string, unknown> | null;
  
  // User adoption
  iosUserAdoption: number | null;
  playstoreUserAdoption: number | null;
  webUserAdoption: number | null;
  
  // Autopilot
  autoPilot: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | null;
  
  // Final build numbers
  webFinalBuildNumber: string | null;
  psFinalBuildNumber: string | null;
  iosFinalBuildNumber: string | null;
  
  // Orchestration additions (from migration 011 & 012)
  releaseConfigId: string | null;
  stageData: Record<string, unknown> | string | null;
  customIntegrationConfigs: Record<string, unknown> | string | null;
  regressionBuildSlots: RegressionSlot[] | string | null;
  preCreatedBuilds: PreCreatedBuild[] | string | null;
  
  // Timestamps (auto-generated)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Release Creation Attributes
 * Optional fields: id (auto-generated), timestamps, defaults
 */
export interface ReleaseCreationAttributes extends Optional<
  ReleaseAttributes,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'type' | 'delayed' | 'updateType' | 'autoPilot' |
  'iosUserAdoption' | 'playstoreUserAdoption' | 'webUserAdoption' | 
  'appId' | 'kickOffReminderDate' | 'releaseDate' | 'delayedReason' | 'baseBranch' | 'branchRelease' |
  'branchCodepush' | 'createdByAccountId' | 'parentId' | 'iosTestRunId' | 'webTestRunId' | 'playStoreRunId' |
  'webEpicId' | 'playStoreEpicId' | 'iosEpicId' | 'releaseTag' | 'slackMessageTimestamps' |
  'webFinalBuildNumber' | 'psFinalBuildNumber' | 'iosFinalBuildNumber' |
  'releaseConfigId' | 'stageData' | 'customIntegrationConfigs' | 'regressionBuildSlots' | 'preCreatedBuilds'
> {}

/**
 * Release Model Type
 * Use in DTOs: ModelStatic<ReleaseModel>
 */
export type ReleaseModel = Model<ReleaseAttributes, ReleaseCreationAttributes>;

// ============================================================================
// CRON JOB MODEL ATTRIBUTES
// ============================================================================

/**
 * Cron Job Model Attributes
 */
export interface CronJobAttributes {
  // Primary key
  id: string;
  
  // Foreign key
  releaseId: string;
  
  // Configuration
  cronConfig: CronConfig | string;
  upcomingRegressions: RegressionSlot[] | string | null;
  
  // Stage statuses
  stage1Status: StageStatus;
  stage2Status: StageStatus;
  stage3Status: StageStatus;
  
  // Auto-transition flags (from migration 014)
  autoTransitionToStage2: boolean;
  autoTransitionToStage3: boolean;
  hasManualBuildUpload: boolean;
  
  // Lock mechanism
  lockedBy: string | null;
  lockedAt: Date | null;
  lockExpiry: Date | null;
  
  // Status
  cronStatus: CronStatus;
  cronCreatedByAccountId: string;
  cronStoppedAt: Date | null;
  
  // Timestamps (auto-generated)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cron Job Creation Attributes
 * Optional fields: id (auto-generated), timestamps, defaults, nullable fields
 */
export interface CronJobCreationAttributes extends Optional<
  CronJobAttributes,
  'id' | 'createdAt' | 'updatedAt' | 'cronStatus' | 'stage1Status' | 'stage2Status' | 'stage3Status' |
  'lockedBy' | 'lockedAt' | 'lockExpiry' | 'cronStoppedAt' | 'upcomingRegressions' |
  'autoTransitionToStage2' | 'autoTransitionToStage3' | 'hasManualBuildUpload'
> {}

/**
 * Cron Job Model Type
 * Use in DTOs: ModelStatic<CronJobModel>
 */
export type CronJobModel = Model<CronJobAttributes, CronJobCreationAttributes>;

// ============================================================================
// RELEASE TASK MODEL ATTRIBUTES
// ============================================================================

/**
 * Release Task Model Attributes
 */
export interface ReleaseTaskAttributes {
  // Primary key
  id: string;
  
  // Task identification
  taskId: string;
  taskType: TaskType | null;
  taskStatus: TaskStatus;
  taskConclusion: ReleaseTaskConclusion | null;
  
  // Task metadata
  stage: TaskStage | null;
  branch: string | null;
  isReleaseKickOffTask: boolean;
  isRegressionSubTasks: boolean;
  identifier: TaskIdentifier | null;
  
  // External integration data (from migration 012)
  externalId: string | null;
  externalData: Record<string, unknown> | string | null;
  
  // Foreign keys
  releaseId: string | null;
  accountId: string | null;
  regressionId: string | null;
  
  // Timestamps (auto-generated)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Release Task Creation Attributes
 * Optional fields: id (auto-generated), taskId (can be generated), timestamps, defaults, nullable fields
 */
export interface ReleaseTaskCreationAttributes extends Optional<
  ReleaseTaskAttributes,
  'id' | 'createdAt' | 'updatedAt' | 'taskId' | 'taskStatus' | 'isReleaseKickOffTask' | 'isRegressionSubTasks' |
  'taskType' | 'taskConclusion' | 'stage' | 'branch' | 'identifier' | 'externalId' | 'externalData' |
  'releaseId' | 'accountId' | 'regressionId'
> {}

/**
 * Release Task Model Type
 * Use in DTOs: ModelStatic<ReleaseTaskModel>
 */
export type ReleaseTaskModel = Model<ReleaseTaskAttributes, ReleaseTaskCreationAttributes>;

// ============================================================================
// REGRESSION CYCLE MODEL ATTRIBUTES
// ============================================================================

/**
 * Regression Cycle Model Attributes
 */
export interface RegressionCycleAttributes {
  // Primary key
  id: string;
  
  // Foreign key
  releaseId: string;
  
  // Cycle metadata
  isLatest: boolean;
  status: RegressionCycleStatus;
  cycleTag: string;
  
  // Timestamps (auto-generated)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Regression Cycle Creation Attributes
 * Optional fields: id (auto-generated), timestamps, defaults
 */
export interface RegressionCycleCreationAttributes extends Optional<
  RegressionCycleAttributes,
  'id' | 'createdAt' | 'updatedAt' | 'isLatest' | 'status'
> {}

/**
 * Regression Cycle Model Type
 * Use in DTOs: ModelStatic<RegressionCycleModel>
 */
export type RegressionCycleModel = Model<RegressionCycleAttributes, RegressionCycleCreationAttributes>;

