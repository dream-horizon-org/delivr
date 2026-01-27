/**
 * useReleaseProcess Hook
 * Fetches and manages release process stage data using React Query
 * Follows same pattern as useRelease and useReleases
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiGet, apiPost, apiPut, apiDelete, getApiErrorMessage, apiUpload } from '~/utils/api-client';
import { TaskStage, Platform, BuildUploadStage, ReleaseStatus } from '~/types/release-process-enums';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { filterValidTaskTypes } from '~/utils/task-filtering';
import { shouldRetryOnError } from '~/utils/react-query-retry';
import {
  RELEASE_PROCESS_STAGE_POLLING_INTERVAL,
  ACTIVITY_LOGS_POLLING_INTERVAL,
  RELEASE_PROCESS_STAGE_STALE_TIME,
  RELEASE_PROCESS_STAGE_CACHE_TIME,
  ACTIVITY_LOGS_STALE_TIME,
  ACTIVITY_LOGS_CACHE_TIME,
  CHERRY_PICK_STALE_TIME,
  CHERRY_PICK_CACHE_TIME,
} from '~/constants/polling-intervals';
import type {
  KickoffStageResponse,
  RegressionStageResponse,
  PreReleaseStageResponse,
  RetryTaskResponse,
  BuildUploadResponse,
  BuildArtifact,
  ListBuildArtifactsResponse,
  TestManagementStatusResponse,
  ProjectManagementStatusResponse,
  CherryPickStatusResponse,
  ApproveRegressionStageRequest,
  ApproveRegressionStageResponse,
  CompletePreReleaseRequest,
  CompletePreReleaseResponse,
  ActivityLogsResponse,
  NotificationsResponse,
  NotificationRequest,
  SendNotificationResponse,
} from '~/types/release-process.types';
import type { ApiResponse } from '~/utils/api-client';

/**
 * Helper to extract error message from ApiResponse error field
 * Supports both string and object formats: { code, message }
 */
function extractErrorFromResponse(response: ApiResponse<unknown>): string | undefined {
  if (!response.error) return undefined;
  if (typeof response.error === 'string') return response.error;
  if (response.error && typeof response.error === 'object' && 'message' in response.error) {
    return typeof response.error.message === 'string' ? response.error.message : undefined;
  }
  return undefined;
}


// Query Keys
const QUERY_KEYS = {
  stage: (appId: string, releaseId: string, stage: TaskStage) =>
    ['release-process', 'stage', appId, releaseId, stage],
  testManagementStatus: (appId: string, releaseId: string, platform?: string) =>
    ['release-process', 'test-management', appId, releaseId, platform],
  projectManagementStatus: (appId: string, releaseId: string) =>
    ['release-process', 'project-management', appId, releaseId],
  cherryPickStatus: (appId: string, releaseId: string) =>
    ['release-process', 'cherry-picks', appId, releaseId],
  activityLog: (appId: string, releaseId: string, filters?: unknown) =>
    ['release-process', 'activity', appId, releaseId, filters],
};

// ======================
// Stage Hooks
// ======================

/**
 * Get kickoff stage data
 */
export function useKickoffStage(
  appId?: string, 
  releaseId?: string,
  shouldPoll: boolean = false
) {
  const isEnabled = !!appId && !!releaseId;

  
  return useQuery<KickoffStageResponse, Error>(
    QUERY_KEYS.stage(appId || '', releaseId || '', TaskStage.KICKOFF),
    async () => {
      
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const endpoint = `/api/v1/apps/${appId}/releases/${releaseId}/stages/kickoff`;

      const result = await apiGet<KickoffStageResponse>(endpoint);

      // console.log('[useKickoffStage] API result:', result);

      if (!result.success || !result.data) {
        const errorMsg = extractErrorFromResponse(result) || 'Failed to fetch kickoff stage';
        console.error('[useKickoffStage] Error:', errorMsg, result);
        throw new Error(errorMsg);
      }

      // Filter out unknown task types
      const filteredData = {
        ...result.data,
        tasks: filterValidTaskTypes(result.data.tasks || []),
      };

      return filteredData;
    },
    {
      enabled: isEnabled,
      staleTime: RELEASE_PROCESS_STAGE_STALE_TIME,
      cacheTime: RELEASE_PROCESS_STAGE_CACHE_TIME,
      refetchOnWindowFocus: true,
      refetchOnMount: true, // Changed to true to ensure it fetches
      retry: shouldRetryOnError, // Don't retry auth errors to prevent cascading failures
      refetchInterval: (shouldPoll && isEnabled) ? RELEASE_PROCESS_STAGE_POLLING_INTERVAL : false,
      refetchIntervalInBackground: false, // Stop polling when tab is in background
    }
  );
}

/**
 * Get regression stage data
 */
export function useRegressionStage(
  appId?: string, 
  releaseId?: string,
  shouldPoll: boolean = false
) {
  const isEnabled = !!appId && !!releaseId;
  
  // console.log('[useRegressionStage] Hook called with:', { appId, releaseId, isEnabled, shouldPoll });
  
  return useQuery<RegressionStageResponse, Error>(
    QUERY_KEYS.stage(appId || '', releaseId || '', TaskStage.REGRESSION),
    async () => {
      console.log('[useRegressionStage] Query function executing...');
      
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const endpoint = `/api/v1/apps/${appId}/releases/${releaseId}/stages/regression`;

      const result = await apiGet<RegressionStageResponse>(endpoint);


      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to fetch regression stage';
        throw new Error(errorMessage);
      }

      // Filter out unknown task types
      const filteredData = {
        ...result.data,
        tasks: filterValidTaskTypes(result.data.tasks || []),
      };

      return filteredData;
    },
    {
      enabled: isEnabled,
      staleTime: RELEASE_PROCESS_STAGE_STALE_TIME,
      cacheTime: RELEASE_PROCESS_STAGE_CACHE_TIME,
      refetchOnWindowFocus: true,
      refetchOnMount: true, // Changed to true to ensure it fetches
      retry: shouldRetryOnError, // Don't retry auth errors to prevent cascading failures
      refetchInterval: (shouldPoll && isEnabled) ? RELEASE_PROCESS_STAGE_POLLING_INTERVAL : false,
      refetchIntervalInBackground: false, // Stop polling when tab is in background
    }
  );
}

/**
 * Get pre-release stage data
 */
export function usePreReleaseStage(
  appId?: string, 
  releaseId?: string,
  shouldPoll: boolean = false
) {
  const isEnabled = !!appId && !!releaseId;
  
  return useQuery<PreReleaseStageResponse, Error>(
    QUERY_KEYS.stage(appId || '', releaseId || '', TaskStage.PRE_RELEASE),
    async () => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const result = await apiGet<PreReleaseStageResponse>(
        `/api/v1/apps/${appId}/releases/${releaseId}/stages/pre-release`
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to fetch pre-release stage';
        throw new Error(errorMessage);
      }

      // Filter out unknown task types
      const filteredData = {
        ...result.data,
        tasks: filterValidTaskTypes(result.data.tasks || []),
      };

      return filteredData;
    },
    {
      enabled: isEnabled,
      staleTime: RELEASE_PROCESS_STAGE_STALE_TIME,
      cacheTime: RELEASE_PROCESS_STAGE_CACHE_TIME,
      refetchOnWindowFocus: true,
      refetchOnMount: false,
      retry: shouldRetryOnError, // Don't retry auth errors to prevent cascading failures
      refetchInterval: (shouldPoll && isEnabled) ? RELEASE_PROCESS_STAGE_POLLING_INTERVAL : false,
      refetchIntervalInBackground: false, // Stop polling when tab is in background
    }
  );
}

// ======================
// Task Mutation Hooks
// ======================

/**
 * Retry a failed task
 * Backend contract: POST /tasks/:taskId/retry (no request body)
 */
export function useRetryTask(appId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<RetryTaskResponse, Error, { taskId: string }>(
    async ({ taskId }) => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const result = await apiPost<RetryTaskResponse>(
        `/api/v1/apps/${appId}/releases/${releaseId}/tasks/${taskId}/retry`
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to retry task';
        throw new Error(errorMessage);
      }

      // Contract expects { success: true, message, data: {...} }
      // apiPost already unwraps the response, so result.data should be the RetryTaskResponse
      return result.data;
    },
    {
      onSuccess: () => {
        // Invalidate all stage queries to refetch updated data
        if (appId && releaseId) {
          Object.values(TaskStage).forEach((stage) => {
            queryClient.invalidateQueries(QUERY_KEYS.stage(appId, releaseId, stage));
          });
          // Invalidate current release to reflect task status changes
          queryClient.invalidateQueries(['release', appId, releaseId]);
          // Invalidate activity logs to show retry action
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(appId, releaseId));
        }
      },
    }
  );
}

// ======================
// Build Upload Hook
// ======================

/**
 * Upload manual build
 * Uses BFF route: POST /api/v1/apps/:appId/releases/:releaseId/stages/:stage/builds/:platform
 * BFF route handles mapping BuildUploadStage to TaskStage and renaming 'file' to 'artifact'
 */
export function useManualBuildUpload(appId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    BuildUploadResponse,
    Error,
    { file: File; platform: Platform; stage: BuildUploadStage }
  >(
    async ({ file, platform, stage }) => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      // Create form data with only the file (stage and platform are in path)
      const formData = new FormData();
      formData.append('file', file);

      // Use centralized upload function with 5-minute timeout
      // BFF route will map BuildUploadStage to TaskStage and forward to backend
      const result = await apiUpload<BuildUploadResponse>(
        `/api/v1/apps/${appId}/releases/${releaseId}/stages/${stage}/builds/${platform}`,
        formData
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Upload failed';
        throw new Error(errorMessage);
      }

      // Backend returns { success: true, data: {...} }
      return result.data;
    },
    {
      onSuccess: (_, variables) => {
        // Invalidate artifacts query to show uploaded artifact
        if (appId && releaseId) {
          queryClient.invalidateQueries(['release-process', 'artifacts', appId, releaseId]);
        }
        
        // Invalidate the appropriate stage based on upload stage
        if (appId && releaseId) {
          let stageToInvalidate: TaskStage;
          switch (variables.stage) {
            case BuildUploadStage.PRE_REGRESSION:
              stageToInvalidate = TaskStage.KICKOFF;
              break;
            case BuildUploadStage.REGRESSION:
              stageToInvalidate = TaskStage.REGRESSION;
              break;
            case BuildUploadStage.PRE_RELEASE:
              stageToInvalidate = TaskStage.PRE_RELEASE;
              break;
            default:
              stageToInvalidate = TaskStage.REGRESSION;
          }
          queryClient.invalidateQueries(QUERY_KEYS.stage(appId, releaseId, stageToInvalidate));
          // Invalidate activity logs to show upload action
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(appId, releaseId));
        }
      },
    }
  );
}

/**
 * Verify TestFlight build
 * Uses BFF route: POST /api/v1/apps/:appId/releases/:releaseId/stages/:stage/builds/ios/verify-testflight
 */
export function useVerifyTestFlight(appId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    BuildUploadResponse,
    Error,
    { stage: BuildUploadStage; testflightBuildNumber: string }
  >(
    async ({ stage, testflightBuildNumber }) => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const result = await apiPost<BuildUploadResponse>(
        `/api/v1/apps/${appId}/releases/${releaseId}/stages/${stage}/builds/ios/verify-testflight`,
        {
          testflightBuildNumber,
        }
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to verify TestFlight build';
        throw new Error(errorMessage);
      }

      // Backend returns { success: true, data: {...} }
      return result.data;
    },
    {
      onSuccess: (_, variables) => {
        // Invalidate artifacts query to show verified build
        if (appId && releaseId) {
          queryClient.invalidateQueries(['release-process', 'artifacts', appId, releaseId]);
        }
        
        // Invalidate the appropriate stage
        if (appId && releaseId) {
          let stageToInvalidate: TaskStage;
          switch (variables.stage) {
            case BuildUploadStage.PRE_REGRESSION:
              stageToInvalidate = TaskStage.KICKOFF;
              break;
            case BuildUploadStage.REGRESSION:
              stageToInvalidate = TaskStage.REGRESSION;
              break;
            case BuildUploadStage.PRE_RELEASE:
              stageToInvalidate = TaskStage.PRE_RELEASE;
              break;
            default:
              // Defensive: invalidate REGRESSION stage as fallback if unexpected stage value
              console.warn(`[useVerifyTestFlight] Unexpected stage: ${variables.stage}, defaulting to REGRESSION`);
              stageToInvalidate = TaskStage.REGRESSION;
          }
          queryClient.invalidateQueries(QUERY_KEYS.stage(appId, releaseId, stageToInvalidate));
          // Invalidate activity logs to show verification action
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(appId, releaseId));
        }
      },
    }
  );
}

// ======================
// Status Check Hooks
// ======================

/**
 * Get test management status
 * Backend contract: GET /test-management-run-status?platform={platform}
 */
export function useTestManagementStatus(
  appId?: string, 
  releaseId?: string, 
  platform?: Platform,
  enabled: boolean = true // NEW: Add enabled parameter
) {
  return useQuery<TestManagementStatusResponse, Error>(
    QUERY_KEYS.testManagementStatus(appId || '', releaseId || '', platform),
    async () => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const params = platform ? `?platform=${platform}` : '';
      const result = await apiGet<TestManagementStatusResponse>(
        `/api/v1/apps/${appId}/releases/${releaseId}/test-management-run-status${params}`
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to fetch test management status';
        throw new Error(errorMessage);
      }

      return result.data;
    },
    {
      enabled: enabled && !!appId && !!releaseId, // NEW: Use enabled parameter
      staleTime: ACTIVITY_LOGS_STALE_TIME,
      cacheTime: ACTIVITY_LOGS_CACHE_TIME,
      retry: shouldRetryOnError, // Smart retry prevents retries on 5xx errors, which naturally stops polling
      refetchInterval: enabled ? ACTIVITY_LOGS_POLLING_INTERVAL : false,
    }
  );
}

/**
 * Get project management status
 * Backend contract: GET /project-management-run-status?platform={platform}
 */
export function useProjectManagementStatus(
  appId?: string, 
  releaseId?: string, 
  platform?: Platform,
  enabled: boolean = true // NEW: Add enabled parameter
) {
  return useQuery<ProjectManagementStatusResponse, Error>(
    QUERY_KEYS.projectManagementStatus(appId || '', releaseId || ''),
    async () => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const params = platform ? `?platform=${platform}` : '';
      const result = await apiGet<ProjectManagementStatusResponse>(
        `/api/v1/apps/${appId}/releases/${releaseId}/project-management-run-status${params}`
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to fetch project management status';
        throw new Error(errorMessage);
      }

      return result.data;
    },
    {
      enabled: enabled && !!appId && !!releaseId, // NEW: Use enabled parameter
      staleTime: ACTIVITY_LOGS_STALE_TIME,
      cacheTime: ACTIVITY_LOGS_CACHE_TIME,
      retry: shouldRetryOnError, // Smart retry prevents retries on 5xx errors, which naturally stops polling
      refetchInterval: enabled ? ACTIVITY_LOGS_POLLING_INTERVAL : false,
    }
  );
}

/**
 * Get cherry pick status
 * Backend contract: GET /check-cherry-pick-status
 * 
 * @param appId - app id
 * @param releaseId - Release ID
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useCherryPickStatus(
  appId?: string, 
  releaseId?: string,
  enabled: boolean = true
) {
  return useQuery<CherryPickStatusResponse, Error>(
    QUERY_KEYS.cherryPickStatus(appId || '', releaseId || ''),
    async () => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const result = await apiGet<CherryPickStatusResponse>(
        `/api/v1/apps/${appId}/releases/${releaseId}/check-cherry-pick-status`
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to fetch cherry pick status';
        throw new Error(errorMessage);
      }

      return result.data;
    },
    {
      enabled: enabled && !!appId && !!releaseId,
      staleTime: CHERRY_PICK_STALE_TIME,
      cacheTime: CHERRY_PICK_CACHE_TIME,
      retry: shouldRetryOnError, // Smart retry prevents retries on 5xx errors, which naturally stops polling
      refetchInterval: ACTIVITY_LOGS_POLLING_INTERVAL,
    }
  );
}

// ======================
// Approval Mutation Hooks
// ======================

/**
 * Approve regression stage
 * Backend contract: POST /api/v1/tenants/{appId}/releases/{releaseId}/trigger-pre-release
 */
export function useApproveRegression(appId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<ApproveRegressionStageResponse, Error, ApproveRegressionStageRequest>(
    async (request) => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const response = await apiPost<ApproveRegressionStageResponse>(
        `/api/v1/apps/${appId}/releases/${releaseId}/trigger-pre-release`,
        request
      );
      if (!response.success || !response.data) {
        throw new Error('Failed to approve regression stage');
      }
      return response.data;
    },
    {
      onSuccess: () => {
        if (appId && releaseId) {
          // Invalidate both REGRESSION (current) and PRE_RELEASE (next stage that gets triggered)
          queryClient.invalidateQueries(QUERY_KEYS.stage(appId, releaseId, TaskStage.REGRESSION));
          queryClient.invalidateQueries(QUERY_KEYS.stage(appId, releaseId, TaskStage.PRE_RELEASE));
          // Invalidate release query so phase gets recalculated and navigation happens
          queryClient.invalidateQueries(['release', appId, releaseId]);
          // Invalidate activity logs to show approval action
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(appId, releaseId));
        }
      },
    }
  );
}

/**
 * Complete pre-release stage / Trigger Distribution
 * Backend contract: POST /api/v1/tenants/{appId}/releases/{releaseId}/trigger-distribution
 */
export function useCompletePreReleaseStage(appId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<CompletePreReleaseResponse, Error, CompletePreReleaseRequest | undefined>(
    async (request) => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const result = await apiPost<CompletePreReleaseResponse>(
        `/api/v1/apps/${appId}/releases/${releaseId}/trigger-distribution`,
        request || {}
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to complete pre-release stage';
        throw new Error(errorMessage);
      }

      return result.data;
    },
    {
      onSuccess: () => {
        if (appId && releaseId) {
          queryClient.invalidateQueries(QUERY_KEYS.stage(appId, releaseId, TaskStage.PRE_RELEASE));
          queryClient.invalidateQueries(QUERY_KEYS.stage(appId, releaseId, TaskStage.DISTRIBUTION));
          // Invalidate release query so phase gets recalculated and navigation happens
          queryClient.invalidateQueries(['release', appId, releaseId]);
          // Invalidate activity logs to show completion action
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(appId, releaseId));
        }
      },
    }
  );
}

// ======================
// Notification Hooks
// ======================

/**
 * Get release notifications
 * Backend contract: GET /notifications
 */
export function useNotifications(appId?: string, releaseId?: string) {
  return useQuery<NotificationsResponse, Error>(
    ['release-process', 'notifications', appId, releaseId],
    async () => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const result = await apiGet<NotificationsResponse>(
        `/api/v1/apps/${appId}/releases/${releaseId}/notifications`
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to fetch notifications';
        throw new Error(errorMessage);
      }

      return result.data;
    },
    {
      enabled: !!appId && !!releaseId,
      staleTime: CHERRY_PICK_STALE_TIME,
      cacheTime: CHERRY_PICK_CACHE_TIME,
      refetchOnWindowFocus: false,
      retry: shouldRetryOnError,
    }
  );
}

/**
 * Send release notification
 * Backend contract: POST /notify
 */
export function useSendNotification(appId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<SendNotificationResponse, Error, NotificationRequest>(
    async (request) => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const result = await apiPost<SendNotificationResponse>(
        `/api/v1/apps/${appId}/releases/${releaseId}/notify`,
        request
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to send notification';
        throw new Error(errorMessage);
      }

      return result.data;
    },
    {
      onSuccess: () => {
        if (appId && releaseId) {
          queryClient.invalidateQueries(['release-process', 'notifications', appId, releaseId]);
          // Invalidate activity logs to show notification action
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(appId, releaseId));
        }
      },
    }
  );
}

// ======================
// Activity Log Hook
// ======================

/**
 * Get activity logs
 * Backend contract: GET /activity-logs
 */
export function useActivityLogs(appId?: string, releaseId?: string) {
  return useQuery<ActivityLogsResponse, Error>(
    QUERY_KEYS.activityLog(appId || '', releaseId || '', undefined),
    async () => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const result = await apiGet<ActivityLogsResponse>(
        `/api/v1/apps/${appId}/releases/${releaseId}/activity-logs`
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to fetch activity logs';
        throw new Error(errorMessage);
      }

      return result.data;
    },
    {
      enabled: !!appId && !!releaseId,
      staleTime: CHERRY_PICK_STALE_TIME,
      cacheTime: CHERRY_PICK_CACHE_TIME,
      refetchOnWindowFocus: false,
      retry: shouldRetryOnError,
    }
  );
}

// ======================
// Build Artifacts Hooks
// ======================

/**
 * List build artifacts
 * Backend contract: GET /apps/:appId/releases/:releaseId/builds/artifacts
 */
export function useBuildArtifacts(
  appId?: string,
  releaseId?: string,
  filters?: { platform?: Platform; buildStage?: string }
) {
  return useQuery<ListBuildArtifactsResponse, Error>(
    ['release-process', 'artifacts', appId, releaseId, filters],
    async () => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const params = new URLSearchParams();
      if (filters?.platform) params.append('platform', filters.platform);
      if (filters?.buildStage) params.append('buildStage', filters.buildStage);

      const queryString = params.toString();
      const endpoint = `/api/v1/apps/${appId}/releases/${releaseId}/builds/artifacts${queryString ? `?${queryString}` : ''}`;

      const result = await apiGet<ListBuildArtifactsResponse>(endpoint);

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to fetch build artifacts';
        throw new Error(errorMessage);
      }

      // apiGet returns { success: true, data: T }
      // For ListBuildArtifactsResponse, T = { success: boolean, data: BuildArtifact[] }
      // So result.data should be { success: true, data: BuildArtifact[] }
      const responseData = result.data;
      
      // Check if responseData is already in the correct format
      if (responseData && typeof responseData === 'object' && 'data' in responseData && Array.isArray(responseData.data)) {
        // Already in correct format: { success: true, data: [...] }
        return responseData as ListBuildArtifactsResponse;
      }
      
      // If it's an array directly, wrap it
      if (Array.isArray(responseData)) {
        return { success: true, data: responseData } as ListBuildArtifactsResponse;
      }
      
      // Fallback: return as-is
      return responseData as ListBuildArtifactsResponse;
    },
    {
      enabled: !!appId && !!releaseId,
      staleTime: ACTIVITY_LOGS_STALE_TIME,
      cacheTime: ACTIVITY_LOGS_CACHE_TIME,
      refetchOnWindowFocus: true,
      retry: shouldRetryOnError,
    }
  );
}

/**
 * Download build artifact by fetching presigned URL and triggering download
 */
export function useDownloadBuildArtifact() {
  const queryClient = useQueryClient();

  return useMutation<
    { url: string; expiresAt: string },
    Error,
    { appId: string; buildId: string }
  >(
    async ({ appId, buildId }) => {
      const endpoint = `/api/v1/apps/${appId}/builds/${buildId}/artifact`;
      // API returns { success: true, data: { url, expiresAt } }
      // apiGet unwraps it, so result.data is { url, expiresAt }
      const result = await apiGet<{ url: string; expiresAt: string }>(endpoint);

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to fetch download URL';
        throw new Error(errorMessage);
      }

      // result.data is already { url, expiresAt }
      return result.data;
    },
    {
      onSuccess: (data) => {
        // Trigger download
        const link = document.createElement('a');
        link.href = data.url;
        link.download = ''; // Let browser determine filename
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    }
  );
}

// ======================
// Release Management Hooks
// ======================

/**
 * Pause or resume release (stop/start cron job)
 * POST /api/v1/apps/:appId/releases/:releaseId/pause-resume
 * Backend implementation:
 *   - Pause: POST /api/releases/:releaseId/cron/stop
 *   - Resume: POST /api/releases/:releaseId/cron/start
 * 
 * @param appId - Tenant UUID
 * @param releaseId - Release UUID
 * @returns Mutation that accepts { action: 'pause' | 'resume' }
 */
export function usePauseResumeRelease(appId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string; releaseId: string },
    Error,
    { action: 'pause' | 'resume' }
  >(
    async ({ action }) => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const result = await apiPost<{ success: boolean; message: string; releaseId: string }>(
        `/api/v1/apps/${appId}/releases/${releaseId}/pause-resume`,
        { action }
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || `Failed to ${action} release`;
        throw new Error(errorMessage);
      }

      return result.data;
    },
    {
      onSuccess: () => {
        // Invalidate release queries to refresh data
        queryClient.invalidateQueries(['release', appId, releaseId]);
        queryClient.invalidateQueries(['release-process', 'stage', appId, releaseId]);
        // Invalidate activity logs to show pause/resume action
        if (appId && releaseId) {
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(appId, releaseId));
        }
      },
    }
  );
}

/**
 * Archive release
 * PUT /api/v1/apps/:appId/releases/:releaseId/archive
 * Backend implementation: PUT /api/v1/apps/:appId/releases/:releaseId/archive
 * 
 * @param appId - Tenant UUID
 * @param releaseId - Release UUID
 * @returns Mutation that accepts no parameters
 */
export function useArchiveRelease(appId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string },
    Error,
    void
  >(
    async () => {
      if (!appId || !releaseId) {
        throw new Error('appId and releaseId are required');
      }

      const result = await apiPut<{ success: boolean; message: string }>(
        `/api/v1/apps/${appId}/releases/${releaseId}/archive`
      );

      if (!result.success || !result.data) {
        const errorMessage = extractErrorFromResponse(result) || 'Failed to archive release';
        throw new Error(errorMessage);
      }

      return result.data;
    },
    {
      onSuccess: () => {
        if (!appId || !releaseId) return;
        
        // Optimistically update releases list to mark release as ARCHIVED
        queryClient.setQueryData<{ success: boolean; releases?: BackendReleaseResponse[]; error?: string }>(
          ['releases', appId],
          (old) => {
            if (!old?.releases) {
              return old || { success: false, releases: [] };
            }
            return {
              ...old,
              releases: old.releases.map((release) =>
                release.id === releaseId
                  ? { ...release, status: ReleaseStatus.ARCHIVED }
                  : release
              ),
            };
          }
        );
        
        // Invalidate releases list query to trigger refetch and update tab counts
        queryClient.invalidateQueries(['releases', appId]);
      },
    }
  );
}


