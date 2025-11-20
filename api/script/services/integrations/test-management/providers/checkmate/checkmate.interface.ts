/**
 * Checkmate Provider Type Definitions
 * All Checkmate-specific types and interfaces
 */

import type { ProjectTestManagementIntegrationConfig } from '~types/integrations/test-management/project-integration';

/**
 * Checkmate-specific configuration
 */
export type CheckmateConfig = ProjectTestManagementIntegrationConfig & {
  baseUrl: string;
  authToken: string;
  orgId: number;
};

/**
 * Checkmate API request/response types
 */
export type CheckmateCreateRunRequest = {
  projectId: number;
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
  runId: number;
  status: number;
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
  status: number;
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

export type CheckmateProjectsResponse = {
  data: {
    projectsList: CheckmateProject[];
    projectCount: Array<{ count: number }>;
  };
  status: number;
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
  status: number;
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
  status: number;
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
  status: number;
};

