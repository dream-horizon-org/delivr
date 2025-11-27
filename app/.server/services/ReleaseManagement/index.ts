// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Release Management Service
 * Consolidated service for all release operations
 * Uses real backend API calls for release CRUD operations
 */

import type { CreateReleaseBackendRequest } from '~/types/release-creation-backend';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3010';

/**
 * Backend release response structure
 */
export interface BackendReleaseResponse {
  id: string;
  releaseId: string;
  releaseConfigId: string | null;
  tenantId: string;
  type: 'PLANNED' | 'HOTFIX' | 'UNPLANNED';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
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
  cronJob?: any;
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
      const url = `${BACKEND_API_URL}/tenants/${tenantId}/releases${includeTasks ? '?includeTasks=true' : ''}`;

      console.log('[ReleaseManagementService] GET:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch releases' }));
        console.error('[ReleaseManagementService] List failed:', errorData);
        return {
          success: false,
          error: errorData.error || 'Failed to fetch releases',
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
      const url = `${BACKEND_API_URL}/tenants/${tenantId}/releases/${releaseId}`;

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
      const url = `${BACKEND_API_URL}/tenants/${tenantId}/releases`;
      
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
      const url = `${BACKEND_API_URL}/tenants/${tenantId}/releases/${releaseId}`;

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
