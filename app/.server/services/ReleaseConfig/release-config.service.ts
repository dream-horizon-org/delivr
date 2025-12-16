/**
 * Release Config BFF Service
 * Handles communication with backend Release Config API
 * 
 * Supports mock mode via DELIVR_HYBRID_MODE=true
 */

import { getBackendBaseURL } from '~/.server/utils/base-url.utils';
import type { ReleaseConfiguration } from '~/types/release-config';
import { logTransformation, prepareReleaseConfigPayload, prepareUpdatePayload, transformFromBackend } from './release-config-payload';

const BACKEND_API_URL = getBackendBaseURL();

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
      const payload = prepareReleaseConfigPayload(config, tenantId, userId);
      
      // Log transformation for debugging
      if (process.env.NODE_ENV === 'development') {
        logTransformation(config, payload, 'create');
      }

      const url = `${BACKEND_API_URL}/api/v1/tenants/${tenantId}/release-configs`;
      const requestBody = JSON.stringify(payload);
      
      console.log('[ReleaseConfigService] POST to:', url, " payload: ", JSON.stringify(payload, null, 2));
 
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
        body: requestBody,
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
        console.error('[ReleaseConfigService] Create failed:', result, JSON.stringify(result?.details?.invalidIntegrations, null, 2), JSON.stringify(result?.details?.invalidIntegrations[0]?.errors, null, 2));
        return {
          success: false,
          error: result.error || result.message || 'Failed to create release configuration',
        };
      }

      console.log('[ReleaseConfigService] Create successful:', result.data?.id);
      
      return {
        success: true,
        data: await transformFromBackend(result.data, userId), // Transform response (targets field mapping)
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
   * 
   * ⚠️ KNOWN BACKEND ISSUE:
   * The backend endpoint ignores the ?includeArchived=true parameter and returns 0 configs
   * after archiving. This needs to be fixed on the backend.
   * 
   * Expected: GET /tenants/:id/release-configs?includeArchived=true should return ALL configs (active + archived)
   * Actual: Returns 0 configs after archiving
   * 
   * Workaround: Frontend uses optimistic updates and doesn't refetch after archive to keep the cached state
   */
  static async list(
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; data?: Partial<ReleaseConfiguration>[]; error?: string }> {
    try {
      const url = `${BACKEND_API_URL}/api/v1/tenants/${tenantId}/release-configs?includeArchived=true`;
      console.log('[ReleaseConfigService] Listing configs for tenant:', tenantId, 'from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[ReleaseConfigService] Non-JSON response:', contentType, '-', text.substring(0, 200));
        throw new Error(`Backend returned ${response.status} ${response.statusText}. Expected JSON but got ${contentType}`);
      }

      const result = await response.json();

      if (!response.ok) {
        console.error('[ReleaseConfigService] List failed:', response.status, result.error || result.message);
        return {
          success: false,
          error: result.error || result.message || 'Failed to fetch release configurations',
        };
      }
      console.log('[ReleaseConfigService] List Configs result:', JSON.stringify(result, null, 2));
      console.log('[ReleaseConfigService] List successful:', result.data?.length || 0, 'configs');


      const transformedConfigs = await Promise.all((result.data || []).map((config: any) => transformFromBackend(config, userId)));

      return {
        success: true,
        data: transformedConfigs,
      };
    } catch (error: any) {
      console.error('[ReleaseConfigService] List error:', error.message || error);
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
        `${BACKEND_API_URL}/api/v1/tenants/${tenantId}/release-configs/${configId}`,
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

      console.log('[ReleaseConfigService] Get successful:',JSON.stringify(result.data, null, 2), result.data?.name);

      return {
        success: true,
        data: await transformFromBackend(result.data, userId), // Transform response
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
      console.log('[ReleaseConfigService] Update request - configId:', configId, 'updates:', updates);
      const payload = prepareUpdatePayload(updates, tenantId, userId);
      console.log('[ReleaseConfigService] Prepared payload:', payload);
      
      // Log transformation for debugging
      if (process.env.NODE_ENV === 'development') {
        logTransformation(updates, payload, 'update');
      }

      const url = `${BACKEND_API_URL}/api/v1/tenants/${tenantId}/release-configs/${configId}`;
      console.log('[ReleaseConfigService] PUT to:', url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'userid': userId,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('[ReleaseConfigService] Update response status:', response.status);
      console.log('[ReleaseConfigService] Update result:', JSON.stringify(result, null, 2));

      if (!response.ok) {
        console.error('[ReleaseConfigService] Update failed:', result);
        return {
          success: false,
          error: result.error || 'Failed to update release configuration',
        };
      }

      const transformedData = await transformFromBackend(result.data, userId);
      console.log('[ReleaseConfigService] Update successful! Name:', result.data?.name, 'isActive:', result.data?.isActive);
      console.log('[ReleaseConfigService] Transformed data isActive:', transformedData?.isActive);

      return {
        success: true,
        data: transformedData, // Transform response
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
        `${BACKEND_API_URL}/api/v1/tenants/${tenantId}/release-configs/${configId}`,
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

