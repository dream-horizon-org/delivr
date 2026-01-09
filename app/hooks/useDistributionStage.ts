/**
 * useDistributionStage Hook
 * Fetches distribution data for a release for the Distribution stage in release process
 * Read-only view - no mutations
 * 
 * Reference: DISTRIBUTION_API_SPEC.md - Line 303
 * GET /api/v1/releases/:releaseId/distribution
 */

import { useQuery } from 'react-query';
import type { DistributionDetail } from '~/types/distribution/distribution.types';
import { apiGet, type ApiResponse } from '~/utils/api-client';
import { extractErrorMessage } from '~/utils/api-error-utils';

const QUERY_KEY = (releaseId: string) => ['distribution-stage', releaseId];

/**
 * Response type that allows null data (no distribution yet)
 */
type DistributionResponse = {
  success: true;
  data: DistributionDetail | null;
};

/**
 * Type guard to check if data is already a DistributionResponse wrapper
 */
function isDistributionResponse(data: unknown): data is DistributionResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    'data' in data &&
    (data as DistributionResponse).success === true
  );
}

/**
 * Type guard to check if data is a valid DistributionDetail
 */
function isValidDistributionDetail(data: unknown): data is DistributionDetail {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'status' in data &&
    'submissions' in data
  );
}

/**
 * Unwrap potentially double-wrapped API response
 * BFF may return: { success: true, data: DistributionDetail | null }
 * apiGet may wrap it: { success: true, data: { success: true, data: DistributionDetail | null } }
 */
function unwrapDistributionResponse(
  response: ApiResponse<DistributionResponse>
): DistributionResponse {
  // If response.data is already a DistributionResponse wrapper (double-wrapped), use inner data
  if (isDistributionResponse(response.data)) {
    return response.data;
  }
  
  // If response.data is null, return as "no distribution" response
  if (response.data === null) {
    return { success: true, data: null };
  }
  
  // Otherwise, check if response.data is directly a DistributionDetail (single-wrapped case)
  if (isValidDistributionDetail(response.data)) {
    return { success: true, data: response.data };
  }
  
  // Invalid data - return null to indicate no valid distribution
  return { success: true, data: null };
}

/**
 * Fetch distribution data for the Distribution stage in release process
 * 
 * Note: This hook does NOT poll automatically. Distribution updates are reactive:
 * - User submits → triggers refetch
 * - User manages in Distribution Management → updates there
 */
export function useDistributionStage(tenantId: string, releaseId: string) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DistributionResponse, Error>(
    QUERY_KEY(releaseId),
    async () => {
      if (!releaseId) {
        throw new Error('Release ID is required');
      }
      
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      const response = await apiGet<DistributionResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/distribution`
      );

      if (!response.success) {
        throw new Error(extractErrorMessage(response.error, response.message ?? 'Failed to fetch distribution'));
      }

      return unwrapDistributionResponse(response);
    },
    {
      enabled: !!releaseId && !!tenantId,
      staleTime: 30000, // Cache for 30s
      refetchOnWindowFocus: false, // Don't refetch on focus
      retry: 1,
    }
  );

  return {
    distribution: data?.data ?? null,
    isLoading,
    error,
    refetch,
  };
}

