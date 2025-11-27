/**
 * Release Types
 * Types for actual release instances matching old UI structure
 */

import type { BackendReleaseResponse } from '~/.server/services/ReleaseManagement/release-retrieval.service';

export type ReleaseType = 'PLANNED' | 'HOTFIX' | 'MAJOR';

export type ReleaseStatus = 
  | 'KICKOFF_PENDING'    // Not started yet
  | 'PENDING'            // Pending
  | 'STARTED'            // Started
  | 'REGRESSION_IN_PROGRESS'  // In regression testing
  | 'BUILD_SUBMITTED'    // Build submitted
  | 'RELEASED'           // Released
  | 'CANCELLED'          // Cancelled
  | 'ARCHIVED';          // Archived

export interface PlatformFlags {
  web: boolean;
  playStore: boolean;
  appStore: boolean;
}

export interface ReleaseCustomizations {
  platforms?: PlatformFlags;
  testingPhases?: string[];
  approvalWorkflow?: string;
  notificationChannels?: string[];
  buildConfiguration?: {
    [key: string]: any;
  };
}

export interface Release {
  id: string;
  tenantId: string;
  releaseKey: string;        // e.g., "R-2024-01"
  
  // Basic Info
  version: string;           // e.g., "1.2.3", "2024.01.15"
  releaseType: ReleaseType;  // PLANNED | HOTFIX | MAJOR
  description?: string;
  baseVersion?: string;
  
  // Configuration Reference
  configId?: string;         // Reference to ReleaseConfiguration
  customizations?: ReleaseCustomizations;
  
  // Platforms
  platforms: PlatformFlags;
  
  // Dates
  kickoffDate: string;       // ISO 8601
  releaseDate: string;       // ISO 8601
  plannedDate?: string;      // ISO 8601
  createdAt: string;
  updatedAt: string;
  
  // Status
  status: ReleaseStatus;
  
  // Pilot & Owner
  releasePilot?: {
    id: string;
    name: string;
    email: string;
  };
  
  // Created By
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  
  lastUpdatedBy?: {
    id: string;
    name: string;
    email: string;
  };
  
  // Adoption Metrics
  userAdoption?: {
    ios: number;
    android: number;
    web: number;
  };
  
  // Metadata
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Input from old UI create release flow
 */
export interface CreateReleaseInput {
  tenantId: string;
  configId?: string;              // Selected configuration ID
  version: string;
  releaseType: ReleaseType;
  baseVersion?: string;
  kickoffDate: string;
  releaseDate: string;
  description?: string;
  platforms: PlatformFlags;       // { web, playStore, appStore }
  customizations?: ReleaseCustomizations;
  createdBy: string;              // User ID string
}

export interface UpdateReleaseInput {
  id: string;
  version?: string;
  releaseType?: ReleaseType;
  description?: string;
  status?: ReleaseStatus;
  kickoffDate?: string;
  releaseDate?: string;
  platforms?: PlatformFlags;
  customizations?: ReleaseCustomizations;
}

export interface ReleaseFilters {
  status?: ReleaseStatus[];
  releaseType?: ReleaseType[];
  fromDate?: string;
  toDate?: string;
  searchQuery?: string;
}

export interface ReleaseListResponse {
  releases: Release[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Props for ReleaseCard component
 */
export interface ReleaseCardProps {
  release: BackendReleaseResponse;
  org: string;
  onDelete: (releaseId: string) => void;
}

