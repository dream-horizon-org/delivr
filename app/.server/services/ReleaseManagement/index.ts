// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Release Management Service
 * Consolidated service for all release operations
 * Uses real backend API calls for release CRUD operations
 * 
 * Supports mock mode via DELIVR_MOCK_MODE=true or DELIVR_HYBRID_MODE=true
 * In HYBRID_MODE, Release Process APIs (including /tenants/{tenantId}/releases) go to mock server
 */

import type { CreateReleaseBackendRequest } from '~/types/release-creation-backend';

/**
 * Determine the base URL for Release Management APIs
 * - If DELIVR_MOCK_MODE=true → use mock server (full mock mode)
 * - If DELIVR_HYBRID_MODE=true → use mock server (Release Process APIs in hybrid mode)
 * - Otherwise → use real backend
 */
function getReleaseManagementBaseURL(): string {
  const isMockMode = process.env.DELIVR_MOCK_MODE === 'true';
  const isHybridMode = process.env.DELIVR_HYBRID_MODE === 'true';
  const mockURL = process.env.DELIVR_MOCK_URL || 'http://localhost:4000';
  const backendURL = process.env.DELIVR_BACKEND_URL || 
                     process.env.BACKEND_API_URL || 
                     'http://localhost:3010';
  
  if (isMockMode || isHybridMode) {
    console.log('[ReleaseManagementService] Using mock server:', mockURL);
    return mockURL;
  }
  
  console.log('[ReleaseManagementService] Using real backend:', backendURL);
  return backendURL;
}

const BACKEND_API_URL = getReleaseManagementBaseURL();

/**
 * Backend release response structure
 */
import type { Phase, ReleaseStatus, CronStatus, PauseType } from '~/types/release-process-enums';

export interface BackendReleaseResponse {
  id: string;
  releaseId: string;
  releaseConfigId: string | null;
  tenantId: string;
  type: 'PLANNED' | 'HOTFIX' | 'UNPLANNED';
  status: ReleaseStatus;  // Updated: Use enum - matches API #1: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'COMPLETED' | 'ARCHIVED'
  releasePhase?: Phase;   // NEW: From API #1 - detailed phase
  branch: string | null;
  baseBranch: string | null;
  baseReleaseId: string | null;
  platformTargetMappings: any[];
  kickOffReminderDate: string | null;
  kickOffDate: string | null;
  targetReleaseDate: string | null;
  releaseDate: string | null;
  hasManualBuildUpload: boolean;
  customIntegrationConfigs: Record<string, unknown> | null;
  preCreatedBuilds: any[] | null;
  createdBy: string;
  lastUpdatedBy: string;
  createdAt: string;
  updatedAt: string;
  cronJob?: {
    cronStatus: CronStatus;
    pauseType: PauseType;
    // ... other cronJob fields if needed
    [key: string]: unknown;
  };
  tasks?: any[];
}

export interface ListReleasesResponse {
  success: boolean;
  releases?: BackendReleaseResponse[];
  error?: string;
}

/**
 * Response structure for release creation
 */
export interface CreateReleaseResponse {
  success: boolean;
  release?: {
    id: string;
    releaseId: string;
    [key: string]: string | number | boolean | null | undefined;
  };
  error?: string;
  message?: string;
}

class ReleaseManagementService {
  // ============================================================================
  // RELEASES - Real Backend API Calls
  // ============================================================================

  /**
   * List all releases for a tenant
   * Uses real backend API
   */
  async listReleases(
    tenantId: string,
    userId: string,
    options?: {
      includeTasks?: boolean;
    }
  ): Promise<ListReleasesResponse> {
    try {
      const includeTasks = options?.includeTasks || false;
      const url = `${BACKEND_API_URL}/api/v1/tenants/${tenantId}/releases${includeTasks ? '?includeTasks=true' : ''}`;

      console.log('[ReleaseManagementService] GET:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
      });

      if (!response.ok) {
        console.error('[ReleaseManagementService] List failed - Status:', response.status, response.statusText);
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('[ReleaseManagementService] List failed - Response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error('[ReleaseManagementService] List failed - Parsed error:', errorData);
        return {
          success: false,
          error: errorData.error || errorData.message || `Failed to fetch releases: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();

      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Failed to fetch releases',
        };
      }

      console.log('[ReleaseManagementService] List successful:', data.releases?.length || 0, 'releases');
      return {
        success: true,
        releases: data.releases || [],
      };
    } catch (error: any) {
      console.error('[ReleaseManagementService] List error:', error);
      console.error('[ReleaseManagementService] List error details:', {
        message: error.message,
        name: error.name,
        code: error.code,
        cause: error.cause,
        stack: error.stack,
      });
      
      // Check if it's a network error
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message?.includes('fetch failed')) {
        return {
          success: false,
          error: `Cannot connect to backend server at ${BACKEND_API_URL}. Please ensure the server is running.`,
        };
      }
      
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  /**
   * Get a single release by ID
   * Uses real backend API
   */
  async getReleaseById(
    releaseId: string,
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; release?: BackendReleaseResponse; error?: string }> {
    try {
      const url = `${BACKEND_API_URL}/api/v1/tenants/${tenantId}/releases/${releaseId}`;

      console.log('[ReleaseManagementService] GET:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Release not found' }));
        console.error('[ReleaseManagementService] Get failed:', errorData);
        return {
          success: false,
          error: errorData.error || 'Release not found',
        };
      }

      const data = await response.json();

      if (!data.success || !data.release) {
        return {
          success: false,
          error: data.error || 'Release not found',
        };
      }

      console.log('[ReleaseManagementService] Get successful:', data.release.id);
      return {
        success: true,
        release: data.release,
      };
    } catch (error: any) {
      console.error('[ReleaseManagementService] Get error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  /**
   * Create a new release
   * Uses real backend API
   */
  async createRelease(
    request: CreateReleaseBackendRequest,
    tenantId: string,
    userId: string
  ): Promise<CreateReleaseResponse> {
    try {
      const url = `${BACKEND_API_URL}/api/v1/tenants/${tenantId}/releases`;
      
      console.log('[ReleaseManagementService] POST to:', url);
      console.log('[ReleaseManagementService] Payload:', JSON.stringify(request, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
        body: JSON.stringify(request),
      });

      console.log('[ReleaseManagementService] Response status:', response.status, response.statusText);

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[ReleaseManagementService] Non-JSON response:', text);
        return {
          success: false,
          error: `Invalid response format: ${response.statusText}`,
        };
      }

      const data = await response.json();

      if (!response.ok) {
        console.error('[ReleaseManagementService] Backend error:', data);
        return {
          success: false,
          error: data.message || data.error || `Failed to create release: ${response.statusText}`,
        };
      }

      console.log('[ReleaseManagementService] Release created successfully:', data.release?.id);

      return {
        success: true,
        release: data.release,
      };
    } catch (error) {
      console.error('[ReleaseManagementService] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update a release by ID
   * Uses real backend API
   */
  async updateRelease(
    releaseId: string,
    tenantId: string,
    userId: string,
    updates: any
  ): Promise<{ success: boolean; release?: BackendReleaseResponse; error?: string }> {
    try {
      const url = `${BACKEND_API_URL}/api/v1/tenants/${tenantId}/releases/${releaseId}`;

      console.log('[ReleaseManagementService] PATCH:', url);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update release' }));
        console.error('[ReleaseManagementService] Update failed:', errorData);
        return {
          success: false,
          error: errorData.error || 'Failed to update release',
        };
      }

      const data = await response.json();

      if (!data.success || !data.release) {
        return {
          success: false,
          error: data.error || 'Failed to update release',
        };
      }

      console.log('[ReleaseManagementService] Update successful:', data.release.id);
      return {
        success: true,
        release: data.release,
      };
    } catch (error: any) {
      console.error('[ReleaseManagementService] Update error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

}

const releaseManagementService = new ReleaseManagementService();

// Export named functions for convenience (using arrow functions to maintain context)
// Active methods (real backend API)
export const listReleases = (...args: Parameters<ReleaseManagementService['listReleases']>) => 
  releaseManagementService.listReleases(...args);

export const getReleaseById = (...args: Parameters<ReleaseManagementService['getReleaseById']>) => 
  releaseManagementService.getReleaseById(...args);

export const createRelease = (...args: Parameters<ReleaseManagementService['createRelease']>) => 
  releaseManagementService.createRelease(...args);

export const updateRelease = (...args: Parameters<ReleaseManagementService['updateRelease']>) => 
  releaseManagementService.updateRelease(...args);

export default releaseManagementService;
