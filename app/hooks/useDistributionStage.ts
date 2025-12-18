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
 * Fetch distribution data for the Distribution stage in release process
 * 
 * Response Flow:
 * 1. BFF returns: { success: true, data: DistributionDetail }
 * 2. apiGet wraps it: { success: true, data: { success: true, data: DistributionDetail } }
 * 3. We unwrap and return the inner APISuccessResponse
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

      // BFF endpoint that proxies to backend
      // GET /api/v1/releases/:releaseId/distribution
      // Returns: ApiResponse<APISuccessResponse<DistributionDetail>>
      const response: ApiResponse<APISuccessResponse<DistributionDetail>> = await apiGet<
        APISuccessResponse<DistributionDetail>
      >(`/api/v1/releases/${releaseId}/distribution`);

      // Unwrap: apiGet wraps the BFF response, so we need response.data to get the actual API response
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch distribution');
      }

      return response.data; // Return the inner APISuccessResponse<DistributionDetail>
    },
    {
      enabled: !!releaseId && !!tenantId,
      staleTime: 30 * 1000, // 30 seconds - distribution status can change
      cacheTime: 5 * 60 * 1000, // 5 minutes cache
      refetchOnWindowFocus: true,
      retry: 1,
    }
  );

  return {
    distribution: data?.data || null,
    isLoading,
    error,
    refetch,
  };
}

