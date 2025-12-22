import type { AndroidSubmissionStatus, BuildType } from './submission.constants';

/**
 * Android Submission Build entity
 */
export type AndroidSubmissionBuild = {
  id: string;
  distributionId: string;
  internalTrackLink: string | null;
  artifactPath: string;
  version: string;
  versionCode: number;
  buildType: BuildType;
  storeType: string;
  status: AndroidSubmissionStatus;
  releaseNotes: string | null;
  inAppUpdatePriority: number | null;
  rolloutPercentage: number | null;
  submittedBy: string | null;
  isActive: boolean;
  cronicleJobId: string | null;
  cronicleCreatedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  statusUpdatedAt: Date;
};

/**
 * DTO for creating a new Android submission
 */
export type CreateAndroidSubmissionDto = {
  id: string;
  distributionId: string;
  internalTrackLink?: string | null;
  artifactPath: string;
  version: string;
  versionCode: number;
  buildType: BuildType;
  storeType?: string;
  status?: AndroidSubmissionStatus;
  releaseNotes?: string | null;
  inAppUpdatePriority?: number | null;
  rolloutPercentage?: number | null;
  submittedBy?: string | null;
  isActive?: boolean;
};

/**
 * DTO for updating an existing Android submission
 */
export type UpdateAndroidSubmissionDto = {
  internalTrackLink?: string | null;
  artifactPath?: string;
  version?: string;
  versionCode?: number;
  buildType?: BuildType;
  storeType?: string;
  status?: AndroidSubmissionStatus;
  releaseNotes?: string | null;
  inAppUpdatePriority?: number | null;
  rolloutPercentage?: number | null;
  submittedBy?: string | null;
  isActive?: boolean;
  cronicleJobId?: string | null;
  cronicleCreatedDate?: Date | null;
  submittedAt?: Date | null;
};

/**
 * Filters for querying Android submissions
 */
export type AndroidSubmissionFilters = {
  distributionId?: string;
  status?: AndroidSubmissionStatus;
  buildType?: BuildType;
  isActive?: boolean;
  submittedBy?: string;
};

