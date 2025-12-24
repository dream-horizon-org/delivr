/**
 * useDistributionStage Hook
 * Fetches distribution data for a release for the Distribution stage in release process
 * Read-only view - no mutations
 * 
 * Reference: DISTRIBUTION_API_SPEC.md - Line 303
 * GET /api/v1/releases/:releaseId/distribution
 */

import { useQuery } from 'react-query';
import type { APISuccessResponse, DistributionDetail } from '~/types/distribution/distribution.types';
import { apiGet, type ApiResponse } from '~/utils/api-client';

const QUERY_KEY = (releaseId: string) => ['distribution-stage', releaseId];

/**
 * Type guard to check if data is already an APISuccessResponse
 */
function isAPISuccessResponse(data: unknown): data is APISuccessResponse<DistributionDetail> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    'data' in data &&
    (data as APISuccessResponse<DistributionDetail>).success === true
  );
}

/**
 * Unwrap potentially double-wrapped API response
 * BFF may return: { success: true, data: DistributionDetail }
 * apiGet may wrap it: { success: true, data: { success: true, data: DistributionDetail } }
 */
function unwrapDistributionResponse(
  response: ApiResponse<APISuccessResponse<DistributionDetail>>
): APISuccessResponse<DistributionDetail> {
  // If response.data is already the correct shape, return it (double-wrapped case)
  if (isAPISuccessResponse(response.data)) {
    return response.data;
  }
  
  // Otherwise, assume response.data is DistributionDetail (single-wrapped case)
  return {
    success: true,
    data: (response.data ?? {}) as DistributionDetail
  };
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
  } = useQuery<APISuccessResponse<DistributionDetail>, Error>(
    QUERY_KEY(releaseId),
    async () => {
      if (!releaseId) {
        throw new Error('Release ID is required');
      }
      
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      const response = await apiGet<APISuccessResponse<DistributionDetail>>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/distribution`
      );

      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to fetch distribution');
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

