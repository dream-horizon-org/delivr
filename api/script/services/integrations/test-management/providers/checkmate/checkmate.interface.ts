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

