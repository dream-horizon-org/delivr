/**
 * Error Types for Distribution Module
 * 
 * Comprehensive error definitions for all possible API error states
 * Reference: docs/02-product-specs/distribution-api-specification.md (Section 6)
 */

import type { Platform } from './distribution.types';

// ============================================================================
// ERROR CATEGORIES
// ============================================================================

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTH = 'AUTH',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  EXTERNAL = 'EXTERNAL',
  INTERNAL = 'INTERNAL',
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Validation Errors (400)
 */
export enum ValidationErrorCode {
  INVALID_AAB_FILE = 'INVALID_AAB_FILE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  INVALID_ROLLOUT_PERCENTAGE = 'INVALID_ROLLOUT_PERCENTAGE',
  BUILDS_NOT_READY = 'BUILDS_NOT_READY',
  UNTESTED_COMMITS = 'UNTESTED_COMMITS',
}

/**
 * Authorization Errors (401/403)
 */
export enum AuthErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED = 'ACCESS_DENIED',
}

/**
 * Not Found Errors (404)
 */
export enum NotFoundErrorCode {
  RELEASE_NOT_FOUND = 'RELEASE_NOT_FOUND',
  BUILD_NOT_FOUND = 'BUILD_NOT_FOUND',
  SUBMISSION_NOT_FOUND = 'SUBMISSION_NOT_FOUND',
  TESTFLIGHT_BUILD_NOT_FOUND = 'TESTFLIGHT_BUILD_NOT_FOUND',
}

/**
 * Conflict Errors (409)
 */
export enum ConflictErrorCode {
  BUILD_ALREADY_EXISTS = 'BUILD_ALREADY_EXISTS',
  VERSION_EXISTS = 'VERSION_EXISTS',
  VERSION_EXISTS_DRAFT = 'VERSION_EXISTS_DRAFT',
  EXPOSURE_CONTROL_CONFLICT = 'EXPOSURE_CONTROL_CONFLICT',
  ALREADY_APPROVED = 'ALREADY_APPROVED',
  CANNOT_RETRY = 'CANNOT_RETRY',
  ROLLOUT_PAUSED = 'ROLLOUT_PAUSED',
  PM_APPROVAL_REQUIRED = 'PM_APPROVAL_REQUIRED',
}

/**
 * External Service Errors (502/503)
 */
export enum ExternalErrorCode {
  TESTFLIGHT_BUILD_PROCESSING = 'TESTFLIGHT_BUILD_PROCESSING',
  STORE_API_ERROR = 'STORE_API_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  PM_TICKET_UNREACHABLE = 'PM_TICKET_UNREACHABLE',
}

/**
 * Internal Errors (500)
 */
export enum InternalErrorCode {
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

/**
 * All Error Codes (Union)
 */
export type ErrorCode = 
  | ValidationErrorCode
  | AuthErrorCode
  | NotFoundErrorCode
  | ConflictErrorCode
  | ExternalErrorCode
  | InternalErrorCode;

// ============================================================================
// ERROR HANDLING STRATEGIES
// ============================================================================

export type ErrorHandlingAction = 
  | 'RETRY'           // User can retry the action
  | 'FIX_INPUT'       // User must fix input data
  | 'CONTACT_SUPPORT' // User should contact support
  | 'WAIT'            // User should wait and try again
  | 'CHOOSE_OPTION';  // User must choose from options

export type ErrorHandlingStrategy = {
  code: string;
  userAction: ErrorHandlingAction;
  canAutoRetry: boolean;
  showInlineError: boolean;
  showModal: boolean;
  logSeverity: 'ERROR' | 'WARNING' | 'INFO';
};

// ============================================================================
// SPECIFIC ERROR TYPES
// ============================================================================

/**
 * Version Conflict Error
 */
export type VersionConflictError = {
  code: ConflictErrorCode.VERSION_EXISTS | ConflictErrorCode.VERSION_EXISTS_DRAFT;
  message: string;
  details: {
    platform: Platform;
    version: string;
    existingStatus: 'LIVE' | 'IN_REVIEW' | 'DRAFT';
    resolution: {
      title: string;
      options: Array<{
        action: 'CREATE_NEW_RELEASE' | 'DELETE_DRAFT';
        label: string;
        recommended?: boolean;
        availableIf?: string;
      }>;
    };
  };
};

/**
 * Exposure Control Conflict Error
 */
export type ExposureControlConflictError = {
  code: ConflictErrorCode.EXPOSURE_CONTROL_CONFLICT;
  message: string;
  details: {
    platform: Platform;
    currentRelease: {
      version: string;
      rolloutPercent: number;
      status: string;
    };
    resolution: {
      title: string;
      message: string;
      impact: string;
      options: Array<{
        action: 'COMPLETE_PREVIOUS' | 'HALT_PREVIOUS' | 'PROCEED_ANYWAY';
        label: string;
        recommended?: boolean;
        warning?: string;
      }>;
    };
  };
};

/**
 * Build Validation Error
 */
export type BuildValidationError = {
  code: ValidationErrorCode.BUILDS_NOT_READY;
  message: string;
  details: {
    android: {
      exists: boolean;
      ready: boolean;
      reason?: string;
    };
    ios: {
      exists: boolean;
      ready: boolean;
      reason?: string;
    };
    missingPlatforms: Platform[];
  };
};

/**
 * TestFlight Processing Error
 */
export type TestFlightProcessingError = {
  code: ExternalErrorCode.TESTFLIGHT_BUILD_PROCESSING;
  message: string;
  details: {
    testflightNumber: string;
    buildStatus: 'PROCESSING' | 'UPLOADING';
    estimatedTimeRemaining: number; // minutes
    suggestion: string;
  };
};

/**
 * PM Approval Required Error
 */
export type PMApprovalRequiredError = {
  code: ConflictErrorCode.PM_APPROVAL_REQUIRED;
  message: string;
  details: {
    pmTicket: {
      id: string;
      status: string;
      url: string;
    };
    requiredStatus: string;
  };
};

/**
 * Untested Commits Error
 */
export type UntestedCommitsError = {
  code: ValidationErrorCode.UNTESTED_COMMITS;
  message: string;
  details: {
    commitsAhead: number;
    lastRegressionCommit: string;
    currentHeadCommit: string;
    warning: string;
    recommendation: string;
  };
};

// ============================================================================
// ERROR UTILITIES
// ============================================================================

/**
 * Type guard to check if error is a version conflict
 */
export function isVersionConflictError(error: unknown): error is { error: VersionConflictError } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as { error: { code?: string } }).error === 'object' &&
    ((error as { error: { code?: string } }).error.code === ConflictErrorCode.VERSION_EXISTS ||
     (error as { error: { code?: string } }).error.code === ConflictErrorCode.VERSION_EXISTS_DRAFT)
  );
}

/**
 * Type guard to check if error is an exposure control conflict
 */
export function isExposureControlConflictError(error: unknown): error is { error: ExposureControlConflictError } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as { error: { code?: string } }).error === 'object' &&
    (error as { error: { code?: string } }).error.code === ConflictErrorCode.EXPOSURE_CONTROL_CONFLICT
  );
}

/**
 * Type guard to check if error is a build validation error
 */
export function isBuildValidationError(error: unknown): error is { error: BuildValidationError } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as { error: { code?: string } }).error === 'object' &&
    (error as { error: { code?: string } }).error.code === ValidationErrorCode.BUILDS_NOT_READY
  );
}

/**
 * Type guard to check if error is a PM approval required error
 */
export function isPMApprovalRequiredError(error: unknown): error is { error: PMApprovalRequiredError } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as { error: { code?: string } }).error === 'object' &&
    (error as { error: { code?: string } }).error.code === ConflictErrorCode.PM_APPROVAL_REQUIRED
  );
}

