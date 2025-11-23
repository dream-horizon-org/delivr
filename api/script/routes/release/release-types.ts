/**
 * Type definitions for Release Management routes
 * 
 * Follows cursorrules: No 'any' types - use explicit types or 'unknown'
 */

import { Request, Response } from 'express';
import { Sequelize } from 'sequelize';
import * as storageTypes from '../../storage/storage';

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
 * Release creation request body
 */
export interface CreateReleaseRequestBody {
  targetReleaseDate: string;
  plannedDate: string;
  type: string;
  baseBranch: string;
  platformVersions: Record<string, string>; // e.g., { "ANDROID": "v6.5.0", "IOS": "v6.3.0" }
  targets: string[]; // e.g., ["ANDROID_PLAYSTORE", "IOS_APPSTORE"]
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
  releasePilotAccountId?: string;
  baseVersion?: string;
  kickOffReminderDate?: string;
  parentId?: string;
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
 * Type guard to check if storage has Sequelize
 */
export function hasSequelize(storage: storageTypes.Storage): storage is StorageWithSequelize {
  return 'sequelize' in storage && storage.sequelize instanceof Sequelize;
}

