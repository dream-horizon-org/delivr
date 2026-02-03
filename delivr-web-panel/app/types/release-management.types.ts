/**
 * Release Management Types
 * Client-safe types for release management (moved from .server to avoid import errors)
 */

import type { Phase, ReleaseStatus, CronStatus, PauseType } from '~/types/release-process-enums';

/**
 * Backend release response structure
 * Moved from ~/.server/services/ReleaseManagement to make it client-safe
 */
export interface BackendReleaseResponse {
  id: string;
  releaseId: string;
  releaseConfigId: string | null;
  appId: string;
  type: 'MAJOR' | 'MINOR' | 'HOTFIX';
  status: ReleaseStatus;
  releasePhase?: Phase;
  currentActiveStage?: 'PRE_KICKOFF' | 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE' | 'RELEASE_SUBMISSION' | 'RELEASE' | null;
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
  releasePilotAccountId: string | null;
  releasePilot?: {
    id: string;
    email: string;
    name: string;
  } | null;
  createdBy: string; // Email if available, otherwise accountId
  lastUpdatedBy: string; // Email if available, otherwise accountId
  createdAt: string;
  updatedAt: string;
  cronJob?: {
    cronStatus: CronStatus;
    pauseType: PauseType;
    [key: string]: unknown;
  };
  tasks?: any[];
}

