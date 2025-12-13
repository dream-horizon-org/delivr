/**
 * Constants for Release Management Controller
 * 
 * Note: File extension validation is in build-artifact.utils.ts
 * Use: isValidArtifactExtension, getFileExtension from there
 */

import { ALLOWED_ARTIFACT_EXTENSIONS } from '../../services/release/build/build-artifact.constants';
import { VALID_UPLOAD_STAGES } from '../../constants/upload-stage';

/**
 * Error messages for release management operations
 * 
 * Convention:
 * - Use camelCase for field names (e.g., releaseId, tenantId)
 * - No trailing periods
 * - Field validation: "[fieldName] is required"
 */
export const RELEASE_MANAGEMENT_ERROR_MESSAGES = {
  INVALID_FILE_EXTENSION: `Invalid file extension. Allowed: ${ALLOWED_ARTIFACT_EXTENSIONS.join(', ')}`,
  FILE_REQUIRED: 'Build artifact file is required',
  RELEASE_ID_REQUIRED: 'releaseId is required',
  STAGE_REQUIRED: `stage is required (${VALID_UPLOAD_STAGES.join(', ')})`,
  INVALID_STAGE: `Invalid stage. Must be one of: ${VALID_UPLOAD_STAGES.join(', ')}`,
  PLATFORM_REQUIRED: 'platform is required',
  MANUAL_UPLOAD_SERVICE_NOT_CONFIGURED: 'Manual upload service not configured',
  FAILED_TO_UPLOAD_BUILD: 'Failed to upload build'
} as const;
