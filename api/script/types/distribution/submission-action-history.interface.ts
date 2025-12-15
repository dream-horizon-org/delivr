import type { SubmissionPlatform, SubmissionAction } from './submission.constants';

/**
 * Submission Action History entity
 */
export type SubmissionActionHistory = {
  id: string;
  submissionId: string;
  platform: SubmissionPlatform;
  action: SubmissionAction;
  reason: string;
  createdAt: Date;
  createdBy: string;
};

/**
 * DTO for creating a new submission action history entry
 */
export type CreateSubmissionActionHistoryDto = {
  id: string;
  submissionId: string;
  platform: SubmissionPlatform;
  action: SubmissionAction;
  reason: string;
  createdBy: string;
};

/**
 * Filters for querying submission action history
 */
export type SubmissionActionHistoryFilters = {
  submissionId?: string;
  platform?: SubmissionPlatform;
  action?: SubmissionAction;
  createdBy?: string;
};

