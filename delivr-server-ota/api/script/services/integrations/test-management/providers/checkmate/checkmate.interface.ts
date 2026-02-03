/**
 * Checkmate Provider Type Definitions
 * All Checkmate-specific types and interfaces
 */

import type { TenantTestManagementIntegrationConfig } from '~types/integrations/test-management/tenant-integration';

/**
 * Checkmate-specific configuration
 */
export type CheckmateConfig = TenantTestManagementIntegrationConfig & {
  baseUrl: string;
  authToken: string;
  orgId: number;
};

/**
 * Checkmate API request/response types
 */
export type CheckmateCreateRunRequest = {
  projectId: number;  // Checkmate's project ID (not Delivr's tenantId)
  runName: string;
  runDescription?: string;
  sectionIds?: number[];
  labelIds?: number[];
  squadIds?: number[];
  platformIds?: number[];
  filterType?: 'and' | 'or';
  createdBy?: number;
};

export type CheckmateCreateRunResponse = {
  data: {
    runId: number;
    runName: string;
    testsAdded: number;
    message: string;
  };
};

export type CheckmateRunStateData = {
  total: number;
  passed: number;
  failed: number;
  untested: number;
  blocked: number;
  retest?: number;
  archived?: number;
  skipped?: number;
  inProgress?: number;
  squadData?: unknown[];
};

export type CheckmateRunStateResponse = {
  data: CheckmateRunStateData;
};

/**
 * Checkmate Metadata API Response Types
 */
export type CheckmateProject = {
  projectId: number;
  projectName: string;
  projectDescription: string | null;
  orgId: number;
  createdByName: string | null;
  createdOn: number;
};

/**
 * Raw response from Checkmate API
 * Internal use only - use CheckmateProjectsResponse for typed access
 */
type CheckmateProjectsApiResponse = {
  data: {
    projectsList: CheckmateProject[];
    projectCount: Array<{ count: number }>;
  };
};

/**
 * Simplified projects response for internal use
 */
export type CheckmateProjectsResponse = {
  data: {
    projectsList: CheckmateProject[];
    projectCount: number;
  };
};

export type CheckmateSection = {
  sectionId: number;
  sectionName: string;
  projectId: number;
  parentSectionId: number | null;
  sectionDepth: number;
  createdOn: string;
  createdBy: number | null;
  updatedOn: string;
  updatedBy: number | null;
};

export type CheckmateSectionsResponse = {
  data: CheckmateSection[];
};

export type CheckmateLabel = {
  labelId: number;
  labelName: string;
  labelType: 'System' | 'Custom';
  projectId: number;
  createdOn: string | null;
  createdBy: number | null;
  updatedOn: string;
  updatedBy: number | null;
};

export type CheckmateLabelsResponse = {
  data: CheckmateLabel[];
};

export type CheckmateSquad = {
  squadId: number;
  squadName: string;
  projectId: number;
  createdOn: string | null;
  createdBy: number | null;
};

export type CheckmateSquadsResponse = {
  data: CheckmateSquad[];
};

/**
 * Result object for metadata API operations
 * Used for consistent error handling across all metadata endpoints
 */
export type CheckmateMetadataResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
};

