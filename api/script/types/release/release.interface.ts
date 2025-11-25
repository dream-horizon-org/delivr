/**
 * Type definitions for Release Management
 * 
 * Follows cursorrules: No 'any' types - use explicit types or 'unknown'
 */

import { Request, Response } from 'express';
import { Sequelize } from 'sequelize';
import * as storageTypes from '../../storage/storage';
import { ReleaseType } from '../../storage/release/release-models';

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
 * Platform-Target-Version mapping for release creation
 */
export interface PlatformTargetVersion {
  platform: string;  // e.g., "ANDROID", "IOS"
  target: string;    // e.g., "PLAY_STORE", "APP_STORE"
  version: string;   // e.g., "v6.5.0"
}

/**
 * Release creation payload (internal service layer)
 * Note: Uses Date objects (not strings) since this is internal to the service layer
 */
export interface CreateReleasePayload {
  tenantId: string;
  accountId: string;
  platformTargets: PlatformTargetVersion[]; // Array of platform-target-version combinations
  type: 'PLANNED' | 'HOTFIX' | 'UNPLANNED';
  releaseConfigId?: string;
  branch?: string;
  baseBranch?: string;
  baseReleaseId?: string;
  targetReleaseDate?: Date;
  kickOffReminderDate?: Date;
  kickOffDate?: Date;
  customIntegrationConfigs?: Record<string, unknown>;
  regressionBuildSlots?: any[];
  preCreatedBuilds?: any[];
  cronConfig?: {
    kickOffReminder?: boolean;
    preRegressionBuilds?: boolean;
    automationBuilds?: boolean;
    automationRuns?: boolean;
    testFlightBuilds?: boolean;
  };
  regressionTimings?: string;
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
  hasManualBuildUpload?: boolean;
  regressionBuildSlots?: Array<{
    date: string;
    config: Record<string, unknown>;
  }>;
  preCreatedBuilds?: Array<{
    platform: string;
    target: string;
    buildNumber: string;
    buildUrl: string;
  }>;
  customIntegrationConfigs?: Record<string, unknown>;
  cronConfig?: {
    kickOffReminder?: boolean;
    preRegressionBuilds?: boolean;
    automationBuilds?: boolean;
    automationRuns?: boolean;
  };
  regressionTimings?: string;
}

/**
 * Regression build slot type
 */
export interface RegressionBuildSlot {
  date: Date;
  config: Record<string, unknown>;
}

/**
 * Pre-created build type
 */
export interface PreCreatedBuild {
  platform: string;
  target: string;
  buildNumber: string;
  buildUrl: string;
}

/**
 * Cron job configuration in release response
 */
export interface CronJobResponse {
  id: string;
  stage1Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage2Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage3Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cronStatus: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  cronConfig: Record<string, unknown>;
  regressionTimings: string | null;
  upcomingRegressions: any[] | null;
  cronCreatedAt: string;
  cronStoppedAt: string | null;
  cronCreatedByAccountId: string;
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
  type: 'PLANNED' | 'HOTFIX' | 'UNPLANNED';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  branch: string | null;
  baseBranch: string | null;
  baseReleaseId: string | null;
  platformTargetMappings: any[];
  kickOffReminderDate: string | null;
  kickOffDate: string | null;
  targetReleaseDate: string | null;
  releaseDate: string | null;
  hasManualBuildUpload: boolean;
  customIntegrationConfigs: Record<string, unknown> | null;
  preCreatedBuilds: any[] | null;
  createdBy: string;
  lastUpdatedBy: string;
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
 * Type guard to check if storage has Sequelize
 */
export function hasSequelize(storage: storageTypes.Storage): storage is StorageWithSequelize {
  return 'sequelize' in storage && storage.sequelize instanceof Sequelize;
}

