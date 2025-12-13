/**
 * Upload Stage Constants
 * 
 * Valid stages for manual build uploads and TestFlight verification.
 * Used by release_uploads staging table.
 */

/**
 * Valid upload stages for manual build uploads and TestFlight verification
 */
export const VALID_UPLOAD_STAGES = ['KICK_OFF', 'REGRESSION', 'PRE_RELEASE'] as const;

/**
 * Type for valid upload stages
 */
export type UploadStageValue = typeof VALID_UPLOAD_STAGES[number];

