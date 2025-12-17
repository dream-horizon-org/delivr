import type { SubmissionStatus, BuildType, IosReleaseType } from './submission.constants';

/**
 * iOS Submission Build entity
 */
export type IosSubmissionBuild = {
  id: string;
  distributionId: string;
  testflightNumber: string;
  version: string;
  buildType: BuildType;
  storeType: string;
  status: SubmissionStatus;
  releaseNotes: string | null;
  phasedRelease: boolean | null;
  releaseType: IosReleaseType;
  resetRating: boolean | null;
  rolloutPercentage: number | null;
  appStoreVersionId: string | null;
  isActive: boolean;
  submittedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  statusUpdatedAt: Date;
};

/**
 * DTO for creating a new iOS submission
 */
export type CreateIosSubmissionDto = {
  id: string;
  distributionId: string;
  testflightNumber: string;
  version: string;
  buildType: BuildType;
  storeType?: string;
  status?: SubmissionStatus;
  releaseNotes?: string | null;
  phasedRelease?: boolean | null;
  releaseType?: IosReleaseType;
  resetRating?: boolean | null;
  rolloutPercentage?: number | null;
  isActive?: boolean;
  submittedBy?: string | null;
};

/**
 * DTO for updating an existing iOS submission
 */
export type UpdateIosSubmissionDto = {
  testflightNumber?: string;
  version?: string;
  buildType?: BuildType;
  storeType?: string;
  status?: SubmissionStatus;
  releaseNotes?: string | null;
  phasedRelease?: boolean | null;
  releaseType?: IosReleaseType;
  resetRating?: boolean | null;
  rolloutPercentage?: number | null;
  appStoreVersionId?: string | null;
  isActive?: boolean;
  submittedBy?: string | null;
  submittedAt?: Date | null;
};

/**
 * Filters for querying iOS submissions
 */
export type IosSubmissionFilters = {
  distributionId?: string;
  status?: SubmissionStatus;
  buildType?: BuildType;
  isActive?: boolean;
  submittedBy?: string;
};

