/**
 * Release Retrieval Service
 * Handles communication with backend Release Retrieval API
 * Follows the same pattern as ReleaseConfigService
 */

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

export class ReleaseRetrievalService {
  /**
   * List all releases for a tenant
   */
  static async list(
    tenantId: string,
    userId: string,
    options?: {
      includeTasks?: boolean;
    }
  ): Promise<ListReleasesResponse> {
    try {
      const includeTasks = options?.includeTasks || false;
      const url = `${BACKEND_API_URL}/tenants/${tenantId}/releases${includeTasks ? '?includeTasks=true' : ''}`;

      console.log('[ReleaseRetrievalService] GET:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch releases' }));
        console.error('[ReleaseRetrievalService] List failed:', errorData);
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

      console.log('[ReleaseRetrievalService] List successful:', data.releases?.length || 0, 'releases');
      return {
        success: true,
        releases: data.releases || [],
      };
    } catch (error: any) {
      console.error('[ReleaseRetrievalService] List error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  /**
   * Get a single release by ID
   */
  static async getById(
    releaseId: string,
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; release?: BackendReleaseResponse; error?: string }> {
    try {
      const url = `${BACKEND_API_URL}/tenants/${tenantId}/releases/${releaseId}`;

      console.log('[ReleaseRetrievalService] GET:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Release not found' }));
        console.error('[ReleaseRetrievalService] Get failed:', errorData);
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

      console.log('[ReleaseRetrievalService] Get successful:', data.release.id);
      return {
        success: true,
        release: data.release,
      };
    } catch (error: any) {
      console.error('[ReleaseRetrievalService] Get error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  /**
   * Delete a release by ID
   */
  static async delete(
    releaseId: string,
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${BACKEND_API_URL}/tenants/${tenantId}/releases/${releaseId}`;

      console.log('[ReleaseRetrievalService] DELETE:', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete release' }));
        console.error('[ReleaseRetrievalService] Delete failed:', errorData);
        return {
          success: false,
          error: errorData.error || 'Failed to delete release',
        };
      }

      const data = await response.json();

      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Failed to delete release',
        };
      }

      console.log('[ReleaseRetrievalService] Delete successful:', releaseId);
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('[ReleaseRetrievalService] Delete error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  /**
   * Update a release by ID
   */
  static async update(
    releaseId: string,
    tenantId: string,
    userId: string,
    updates: any
  ): Promise<{ success: boolean; release?: BackendReleaseResponse; error?: string }> {
    try {
      const url = `${BACKEND_API_URL}/tenants/${tenantId}/releases/${releaseId}`;

      console.log('[ReleaseRetrievalService] PATCH:', url);

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
        console.error('[ReleaseRetrievalService] Update failed:', errorData);
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

      console.log('[ReleaseRetrievalService] Update successful:', data.release.id);
      return {
        success: true,
        release: data.release,
      };
    } catch (error: any) {
      console.error('[ReleaseRetrievalService] Update error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }
}

