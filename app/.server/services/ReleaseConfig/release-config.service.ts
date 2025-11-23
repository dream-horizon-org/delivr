/**
 * Release Config BFF Service
 * Handles communication with backend Release Config API
 */

import type { ReleaseConfiguration } from '~/types/release-config';
import {
  transformToBackendPayload,
  transformFromBackendResponse,
  transformToUpdatePayload,
  type CreateReleaseConfigRequest,
  type SafeReleaseConfiguration,
} from './release-config-transformer';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3010';

export class ReleaseConfigService {
  /**
   * Create a new release configuration
   */
  static async create(
    config: ReleaseConfiguration,
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; data?: Partial<ReleaseConfiguration>; error?: string }> {
    try {
      const payload = transformToBackendPayload(config, userId);
      
      console.log('[ReleaseConfigService] Creating config:', {
        name: payload.name,
        tenantId: payload.tenantId,
        integrations: {
          workflows: payload.workflows?.length || 0,
          testManagement: !!payload.testManagement,
          communication: !!payload.communication,
          projectManagement: !!payload.projectManagement,
          scheduling: !!payload.scheduling,
        },
      });

      const url = `${BACKEND_API_URL}/tenants/${tenantId}/release-configs`;
      console.log('[ReleaseConfigService] POST to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
        body: JSON.stringify(payload),
      });

      console.log('[ReleaseConfigService] Response status:', response.status, response.statusText);
      console.log('[ReleaseConfigService] Response headers:', Object.fromEntries(response.headers.entries()));

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[ReleaseConfigService] Non-JSON response:', text.substring(0, 500));
        throw new Error(`Backend returned ${response.status} ${response.statusText}. Expected JSON but got ${contentType}. Response: ${text.substring(0, 200)}`);
      }

      const result = await response.json();

      if (!response.ok) {
        console.error('[ReleaseConfigService] Create failed:', result);
        return {
          success: false,
          error: result.error || result.message || 'Failed to create release configuration',
        };
      }

      console.log('[ReleaseConfigService] Create successful:', result.data?.id);
      
      return {
        success: true,
        data: transformFromBackendResponse(result.data),
      };
    } catch (error: any) {
      console.error('[ReleaseConfigService] Create error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  /**
   * List all release configurations for a tenant
   */
  static async list(
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; data?: Partial<ReleaseConfiguration>[]; error?: string }> {
    try {
      console.log('[ReleaseConfigService] Listing configs for tenant:', tenantId);

      const response = await fetch(`${BACKEND_API_URL}/tenants/${tenantId}/release-configs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[ReleaseConfigService] List failed:', result);
        return {
          success: false,
          error: result.error || 'Failed to fetch release configurations',
        };
      }

      console.log('[ReleaseConfigService] List successful:', result.data?.length || 0, 'configs');

      return {
        success: true,
        data: (result.data || []).map(transformFromBackendResponse),
      };
    } catch (error: any) {
      console.error('[ReleaseConfigService] List error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  /**
   * Get a specific release configuration by ID
   */
  static async getById(
    configId: string,
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; data?: Partial<ReleaseConfiguration>; error?: string }> {
    try {
      console.log('[ReleaseConfigService] Fetching config:', configId);

      const response = await fetch(
        `${BACKEND_API_URL}/tenants/${tenantId}/release-configs/${configId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'userid': userId,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('[ReleaseConfigService] Get failed:', result);
        return {
          success: false,
          error: result.error || 'Failed to fetch release configuration',
        };
      }

      console.log('[ReleaseConfigService] Get successful:', result.data?.name);

      return {
        success: true,
        data: transformFromBackendResponse(result.data),
      };
    } catch (error: any) {
      console.error('[ReleaseConfigService] Get error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  /**
   * Update an existing release configuration
   */
  static async update(
    configId: string,
    updates: Partial<ReleaseConfiguration>,
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; data?: Partial<ReleaseConfiguration>; error?: string }> {
    try {
      const payload = transformToUpdatePayload(updates, userId);
      
      console.log('[ReleaseConfigService] Updating config:', configId, Object.keys(payload));

      const response = await fetch(
        `${BACKEND_API_URL}/tenants/${tenantId}/release-configs/${configId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'userid': userId,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('[ReleaseConfigService] Update failed:', result);
        return {
          success: false,
          error: result.error || 'Failed to update release configuration',
        };
      }

      console.log('[ReleaseConfigService] Update successful:', result.data?.name);

      return {
        success: true,
        data: transformFromBackendResponse(result.data),
      };
    } catch (error: any) {
      console.error('[ReleaseConfigService] Update error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }

  /**
   * Delete a release configuration
   */
  static async delete(
    configId: string,
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[ReleaseConfigService] Deleting config:', configId);

      const response = await fetch(
        `${BACKEND_API_URL}/tenants/${tenantId}/release-configs/${configId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'userid': userId,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('[ReleaseConfigService] Delete failed:', result);
        return {
          success: false,
          error: result.error || 'Failed to delete release configuration',
        };
      }

      console.log('[ReleaseConfigService] Delete successful');

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('[ReleaseConfigService] Delete error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  }
}

