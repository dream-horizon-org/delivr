import type { DistributionStatus, DistributionPlatform, DistributionStoreType } from './distribution.constants';

/**
 * Distribution entity - represents a release distribution across platforms
 */
export type Distribution = {
  id: string;
  tenantId: string;
  releaseId: string;
  branch: string;
  configuredListOfPlatforms: DistributionPlatform[];
  configuredListOfStoreTypes: DistributionStoreType[];
  status: DistributionStatus;
  createdAt: Date;
  updatedAt: Date;
  statusUpdatedAt: Date;
};

/**
 * DTO for creating a new distribution
 */
export type CreateDistributionDto = {
  id: string;
  tenantId: string;
  releaseId: string;
  branch: string;
  configuredListOfPlatforms: DistributionPlatform[];
  configuredListOfStoreTypes: DistributionStoreType[];
  status?: DistributionStatus;
};

/**
 * DTO for updating an existing distribution
 */
export type UpdateDistributionDto = {
  branch?: string;
  configuredListOfPlatforms?: DistributionPlatform[];
  configuredListOfStoreTypes?: DistributionStoreType[];
  status?: DistributionStatus;
};

/**
 * Filters for querying distributions
 */
export type DistributionFilters = {
  tenantId?: string;
  releaseId?: string;
  branch?: string;
  status?: DistributionStatus;
};

