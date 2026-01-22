/**
 * Backend-Compatible Release Creation Types
 * 
 * These types match the exact backend API contract for release creation.
 * No 'any' or 'unknown' types - all fields are explicitly typed.
 * 
 * Backend Endpoint: POST /tenants/:tenantId/releases
 */


// ============================================================================
// Core Types
// ============================================================================

/**
 * Release type as expected by backend
 * Updated: Backend now uses MAJOR/MINOR/HOTFIX (not PLANNED/UNPLANNED)
 */
export type ReleaseType = 'MAJOR' | 'MINOR' | 'HOTFIX';

/**
 * Platform name for platformTargets
 */
export type PlatformName = 'ANDROID' | 'IOS' | 'WEB';

/**
 * Target name for platformTargets
 */
export type TargetName = 'PLAY_STORE' | 'APP_STORE' | 'WEB';

/**
 * Platform-Target-Version combination
 * Backend expects this exact structure
 */
export interface PlatformTargetWithVersion {
  platform: PlatformName;
  target: TargetName;
  version: string; // Format: vX.Y.Z (e.g., 'v6.5.0')
}

/**
 * Regression build slot in backend format
 * Uses absolute ISO date strings (not offset-based like config)
 */
export interface RegressionBuildSlotBackend {
  date: string; // ISO date string (e.g., '2024-01-17T09:00:00.000Z')
  config: RegressionSlotConfig;
}

/**
 * Configuration for a regression slot
 */
export interface RegressionSlotConfig {
  regressionBuilds: boolean;
  postReleaseNotes?: boolean;
  automationBuilds?: boolean;
  automationRuns?: boolean;
  [key: string]: boolean | string | number | undefined; // Allow additional config fields
}

/**
 * Cron job configuration
 */
export interface CronConfig {
  kickOffReminder?: boolean;
  preRegressionBuilds?: boolean;
  automationBuilds?: boolean;
  automationRuns?: boolean;
}

/**
 * Complete backend-compatible release creation request
 * Matches exact backend API contract
 */
export interface CreateReleaseBackendRequest {
  // REQUIRED FIELDS
  type: ReleaseType;
  platformTargets: PlatformTargetWithVersion[];
  releaseConfigId: string;
  baseBranch: string;
  kickOffDate: string; // ISO date string
  targetReleaseDate: string; // ISO date string

  // OPTIONAL FIELDS
  branch?: string;
  baseReleaseId?: string;
  kickOffReminderDate?: string; // ISO date string
  hasManualBuildUpload?: boolean;
  regressionBuildSlots?: RegressionBuildSlotBackend[];
  cronConfig?: CronConfig;
}

// ============================================================================
// Conversion Types (for UI state management)
// ============================================================================

/**
 * UI state for release creation
 * Used internally in components before converting to backend format
 */
export interface ReleaseCreationState {
  // Basic Info
  type: ReleaseType;
  platformTargets: PlatformTargetWithVersion[];
  releaseConfigId?: string;
  baseBranch: string;

  // Dates (can be separate date + time in UI, converted to ISO on submit)
  kickOffDate: string; // Date string (YYYY-MM-DD)
  kickOffTime?: string; // Time string (HH:MM)
  targetReleaseDate: string; // Date string (YYYY-MM-DD)
  targetReleaseTime?: string; // Time string (HH:MM)
  kickOffReminderDate?: string; // Date string (YYYY-MM-DD)
  kickOffReminderTime?: string; // Time string (HH:MM)
  delayReason?: string; // Required when extending targetReleaseDate (edit mode)

  // Optional
  branch?: string;
  baseReleaseId?: string;
  hasManualBuildUpload?: boolean;

  // Regression Slots
  regressionBuildSlots?: RegressionBuildSlotBackend[];

  // Cron Config
  cronConfig?: CronConfig;

  // Description (UI-only, not sent to backend)
  description?: string;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Validation result for form fields
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Platform target selection state (for UI)
 */
export interface PlatformTargetSelection {
  platform: PlatformName;
  target: TargetName;
  selected: boolean;
  version: string;
}

// ============================================================================
// Update Release Types
// ============================================================================

/**
 * Platform target mapping for update (includes id for existing mappings)
 */
export interface PlatformTargetMappingUpdate {
  id: string;
  platform: PlatformName;
  target: TargetName;
  version: string;
  projectManagementRunId?: string | null;
  testManagementRunId?: string | null;
}

/**
 * Update release request body
 * Matches backend UpdateReleaseRequestBody
 * All fields are optional - only send what needs to be updated
 */
export interface UpdateReleaseBackendRequest {
  type?: ReleaseType;
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  branch?: string | null;
  baseBranch?: string | null;
  baseReleaseId?: string | null;
  kickOffReminderDate?: string; // ISO date string
  kickOffDate?: string; // ISO date string
  targetReleaseDate?: string; // ISO date string
  delayReason?: string; // Required when extending targetReleaseDate
  releaseDate?: string; // ISO date string
  hasManualBuildUpload?: boolean;
  releasePilotAccountId?: string;
  platformTargetMappings?: PlatformTargetMappingUpdate[];
  cronJob?: {
    cronConfig?: Record<string, unknown>;
    upcomingRegressions?: Array<{
      date: string;
      config: Record<string, unknown>;
    }>;
  };
}

/**
 * UI state for updating a release
 */
export interface UpdateReleaseState {
  // Basic Info
  type?: ReleaseType;
  branch?: string | null;
  baseBranch?: string | null;
  baseReleaseId?: string | null;

  // Dates (can be separate date + time in UI, converted to ISO on submit)
  kickOffDate?: string; // Date string (YYYY-MM-DD)
  kickOffTime?: string; // Time string (HH:MM)
  targetReleaseDate?: string; // Date string (YYYY-MM-DD)
  targetReleaseTime?: string; // Time string (HH:MM)
  kickOffReminderDate?: string; // Date string (YYYY-MM-DD)
  kickOffReminderTime?: string; // Time string (HH:MM)
  delayReason?: string; // Required when extending targetReleaseDate

  // Platform Targets
  platformTargetMappings?: PlatformTargetMappingUpdate[];

  // Cron Config
  cronConfig?: CronConfig;
  upcomingRegressions?: RegressionBuildSlotBackend[] | null;

  // Other
  hasManualBuildUpload?: boolean;
  releasePilotAccountId?: string;
}

