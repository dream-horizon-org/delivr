/**
 * Upload Stage Utilities
 * 
 * Helper functions for upload stage validation.
 */

import { VALID_UPLOAD_STAGES, UploadStageValue } from '../constants/upload-stage';

/**
 * Check if a string is a valid upload stage
 */
export const isValidUploadStage = (stage: string): stage is UploadStageValue => {
  const upperStage = stage.toUpperCase();
  return VALID_UPLOAD_STAGES.includes(upperStage as UploadStageValue);
};

