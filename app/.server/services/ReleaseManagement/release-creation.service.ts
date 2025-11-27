/**
 * Release Creation Service
 * 
 * Handles communication with backend Release Creation API.
 * Sends backend-compatible format directly (no transformation).
 * 
 * Follows cursor rules: No 'any' or 'unknown' types
 */

import type { CreateReleaseBackendRequest } from '~/types/release-creation-backend';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3010';

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

/**
 * Create a new release
 * Sends backend-compatible format directly to backend API
 */
export async function createRelease(
  request: CreateReleaseBackendRequest,
  tenantId: string,
  userId: string
): Promise<CreateReleaseResponse> {
  try {
    const url = `${BACKEND_API_URL}/tenants/${tenantId}/releases`;
    
    console.log('[ReleaseCreationService] POST to:', url);
    console.log('[ReleaseCreationService] Payload:', JSON.stringify(request, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'userid': userId,
      },
      body: JSON.stringify(request),
    });

    console.log('[ReleaseCreationService] Response status:', response.status, response.statusText);

    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[ReleaseCreationService] Non-JSON response:', text);
      return {
        success: false,
        error: `Invalid response format: ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('[ReleaseCreationService] Backend error:', data);
      return {
        success: false,
        error: data.message || data.error || `Failed to create release: ${response.statusText}`,
      };
    }

    console.log('[ReleaseCreationService] Release created successfully:', data.release?.id);

    return {
      success: true,
      release: data.release,
    };
  } catch (error) {
    console.error('[ReleaseCreationService] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}


