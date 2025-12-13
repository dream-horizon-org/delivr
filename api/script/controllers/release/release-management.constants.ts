/**
 * Constants for Release Management Controller
 * 
 * Note: File extension validation is in build-artifact.utils.ts
 * Use: isValidArtifactExtension, getFileExtension from there
 */

import { ALLOWED_ARTIFACT_EXTENSIONS } from '../../services/release/build/build-artifact.constants';

/**
 * Error messages for release management operations
 */
export const RELEASE_MANAGEMENT_ERROR_MESSAGES = {
  INVALID_FILE_EXTENSION: `Invalid file extension. Allowed extensions: ${ALLOWED_ARTIFACT_EXTENSIONS.join(', ')}`,
  FILE_REQUIRED: 'Build artifact file is required',
  RELEASE_ID_REQUIRED: 'Release ID is required',
  STAGE_REQUIRED: 'Stage is required',
  PLATFORM_REQUIRED: 'Platform is required',
  MANUAL_UPLOAD_SERVICE_NOT_CONFIGURED: 'Manual upload service not configured',
  FAILED_TO_UPLOAD_BUILD: 'Failed to upload build',
} as const;

/**
 * Valid upload stages
 */
export const VALID_UPLOAD_STAGES = ['KICK_OFF', 'REGRESSION', 'PRE_RELEASE'] as const;
