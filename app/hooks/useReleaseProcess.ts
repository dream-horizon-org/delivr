/**
 * useReleaseProcess Hook
 * Fetches and manages release process stage data using React Query
 * Follows same pattern as useRelease and useReleases
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiGet, apiPost, apiPut, apiDelete, getApiErrorMessage } from '~/utils/api-client';
import { TaskStage, Platform, BuildUploadStage } from '~/types/release-process-enums';
import { filterValidTaskTypes } from '~/utils/task-filtering';
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

// Query Keys
const QUERY_KEYS = {
  stage: (tenantId: string, releaseId: string, stage: TaskStage) =>
    ['release-process', 'stage', tenantId, releaseId, stage],
  testManagementStatus: (tenantId: string, releaseId: string, platform?: string) =>
    ['release-process', 'test-management', tenantId, releaseId, platform],
  projectManagementStatus: (tenantId: string, releaseId: string) =>
    ['release-process', 'project-management', tenantId, releaseId],
  cherryPickStatus: (tenantId: string, releaseId: string) =>
    ['release-process', 'cherry-picks', tenantId, releaseId],
  activityLog: (tenantId: string, releaseId: string, filters?: unknown) =>
    ['release-process', 'activity', tenantId, releaseId, filters],
};

// ======================
// Stage Hooks
// ======================

/**
 * Get kickoff stage data
 */
export function useKickoffStage(tenantId?: string, releaseId?: string) {
  const isEnabled = !!tenantId && !!releaseId;
  
  console.log('[useKickoffStage] Hook called with:', { tenantId, releaseId, isEnabled });
  
  return useQuery<KickoffStageResponse, Error>(
    QUERY_KEYS.stage(tenantId || '', releaseId || '', TaskStage.KICKOFF),
    async () => {
      console.log('[useKickoffStage] Query function executing...');
      
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const endpoint = `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/kickoff`;
      console.log('[useKickoffStage] Making API call to:', endpoint);

      const result = await apiGet<KickoffStageResponse>(endpoint);

      console.log('[useKickoffStage] API result:', result);

      if (!result.success || !result.data) {
        const errorMsg = result.error || 'Failed to fetch kickoff stage';
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
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      refetchOnMount: true, // Changed to true to ensure it fetches
      retry: 1,
    }
  );
}

/**
 * Get regression stage data
 */
export function useRegressionStage(tenantId?: string, releaseId?: string) {
  const isEnabled = !!tenantId && !!releaseId;
  
  // console.log('[useRegressionStage] Hook called with:', { tenantId, releaseId, isEnabled });
  
  return useQuery<RegressionStageResponse, Error>(
    QUERY_KEYS.stage(tenantId || '', releaseId || '', TaskStage.REGRESSION),
    async () => {
      console.log('[useRegressionStage] Query function executing...');
      
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const endpoint = `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/regression`;
      console.log('[useRegressionStage] Making API call to:', endpoint);

      const result = await apiGet<RegressionStageResponse>(endpoint);

      console.log('[useRegressionStage] API result:', result);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch regression stage');
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
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: true, // Changed to true to ensure it fetches
      retry: 1,
    }
  );
}

/**
 * Get pre-release stage data
 */
export function usePreReleaseStage(tenantId?: string, releaseId?: string) {
  return useQuery<PreReleaseStageResponse, Error>(
    QUERY_KEYS.stage(tenantId || '', releaseId || '', TaskStage.PRE_RELEASE),
    async () => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiGet<PreReleaseStageResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/pre-release`
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch pre-release stage');
      }

      // Filter out unknown task types
      const filteredData = {
        ...result.data,
        tasks: filterValidTaskTypes(result.data.tasks || []),
      };

      return filteredData;
    },
    {
      enabled: !!tenantId && !!releaseId,
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: false,
      retry: 1,
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
export function useRetryTask(tenantId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<RetryTaskResponse, Error, { taskId: string }>(
    async ({ taskId }) => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiPost<RetryTaskResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/tasks/${taskId}/retry`
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to retry task');
      }

      // Contract expects { success: true, message, data: {...} }
      // apiPost already unwraps the response, so result.data should be the RetryTaskResponse
      return result.data;
    },
    {
      onSuccess: () => {
        // Invalidate all stage queries to refetch updated data
        if (tenantId && releaseId) {
          Object.values(TaskStage).forEach((stage) => {
            queryClient.invalidateQueries(QUERY_KEYS.stage(tenantId, releaseId, stage));
          });
          // Invalidate releases list to reflect task status changes
          queryClient.invalidateQueries(['releases', tenantId]);
          // Invalidate activity logs to show retry action
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(tenantId, releaseId));
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
 * Uses BFF route: POST /api/v1/tenants/:tenantId/releases/:releaseId/stages/:stage/builds/:platform
 * BFF route handles mapping BuildUploadStage to TaskStage and renaming 'file' to 'artifact'
 */
export function useManualBuildUpload(tenantId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    BuildUploadResponse,
    Error,
    { file: File; platform: Platform; stage: BuildUploadStage }
  >(
    async ({ file, platform, stage }) => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      // Create form data with only the file (stage and platform are in path)
      const formData = new FormData();
      formData.append('file', file);

      // Use BFF route with stage and platform in path
      // BFF route will map BuildUploadStage to TaskStage and forward to backend
      // API contract specifies PUT, but we use POST for compatibility
      const response = await fetch(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/${stage}/builds/${platform}`,
        {
          method: 'PUT', // API contract specifies PUT
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || error.message || 'Upload failed');
      }

      const data = await response.json();
      // Backend returns { success: true, data: {...} }
      // Return the data field if present, otherwise return the whole response
      return data.data || data;
    },
    {
      onSuccess: (_, variables) => {
        // Invalidate artifacts query to show uploaded artifact
        if (tenantId && releaseId) {
          queryClient.invalidateQueries(['release-process', 'artifacts', tenantId, releaseId]);
        }
        
        // Invalidate the appropriate stage based on upload stage
        if (tenantId && releaseId) {
          let stageToInvalidate: TaskStage;
          switch (variables.stage) {
            case 'PRE_REGRESSION':
              stageToInvalidate = TaskStage.KICKOFF;
              break;
            case 'REGRESSION':
              stageToInvalidate = TaskStage.REGRESSION;
              break;
            case 'PRE_RELEASE':
              stageToInvalidate = TaskStage.PRE_RELEASE;
              break;
            default:
              stageToInvalidate = TaskStage.REGRESSION;
          }
          queryClient.invalidateQueries(QUERY_KEYS.stage(tenantId, releaseId, stageToInvalidate));
          // Invalidate activity logs to show upload action
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(tenantId, releaseId));
        }
      },
    }
  );
}

/**
 * Verify TestFlight build
 * Uses BFF route: POST /api/v1/tenants/:tenantId/releases/:releaseId/stages/:stage/builds/ios/verify-testflight
 */
export function useVerifyTestFlight(tenantId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    BuildUploadResponse,
    Error,
    { stage: BuildUploadStage; testflightBuildNumber: string; versionName: string }
  >(
    async ({ stage, testflightBuildNumber, versionName }) => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiPost<BuildUploadResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/${stage}/builds/ios/verify-testflight`,
        {
          testflightBuildNumber,
          versionName,
        }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to verify TestFlight build');
      }

      // Backend returns { success: true, data: {...} }
      return result.data;
    },
    {
      onSuccess: (_, variables) => {
        // Invalidate artifacts query to show verified build
        if (tenantId && releaseId) {
          queryClient.invalidateQueries(['release-process', 'artifacts', tenantId, releaseId]);
        }
        
        // Invalidate the appropriate stage
        if (tenantId && releaseId) {
          let stageToInvalidate: TaskStage;
          switch (variables.stage) {
            case 'PRE_REGRESSION':
              stageToInvalidate = TaskStage.KICKOFF;
              break;
            case 'REGRESSION':
              stageToInvalidate = TaskStage.REGRESSION;
              break;
            case 'PRE_RELEASE':
              stageToInvalidate = TaskStage.PRE_RELEASE;
              break;
            default:
              // Defensive: invalidate REGRESSION stage as fallback if unexpected stage value
              console.warn(`[useVerifyTestFlight] Unexpected stage: ${variables.stage}, defaulting to REGRESSION`);
              stageToInvalidate = TaskStage.REGRESSION;
          }
          queryClient.invalidateQueries(QUERY_KEYS.stage(tenantId, releaseId, stageToInvalidate));
          // Invalidate activity logs to show verification action
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(tenantId, releaseId));
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
  tenantId?: string, 
  releaseId?: string, 
  platform?: Platform,
  enabled: boolean = true // NEW: Add enabled parameter
) {
  return useQuery<TestManagementStatusResponse, Error>(
    QUERY_KEYS.testManagementStatus(tenantId || '', releaseId || '', platform),
    async () => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const params = platform ? `?platform=${platform}` : '';
      const result = await apiGet<TestManagementStatusResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/test-management-run-status${params}`
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch test management status');
      }

      return result.data;
    },
    {
      enabled: enabled && !!tenantId && !!releaseId, // NEW: Use enabled parameter
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: enabled ? 30 * 1000 : false, // NEW: Only poll if enabled
      retry: 1,
    }
  );
}

/**
 * Get project management status
 * Backend contract: GET /project-management-run-status?platform={platform}
 */
export function useProjectManagementStatus(
  tenantId?: string, 
  releaseId?: string, 
  platform?: Platform,
  enabled: boolean = true // NEW: Add enabled parameter
) {
  return useQuery<ProjectManagementStatusResponse, Error>(
    QUERY_KEYS.projectManagementStatus(tenantId || '', releaseId || ''),
    async () => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const params = platform ? `?platform=${platform}` : '';
      const result = await apiGet<ProjectManagementStatusResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/project-management-run-status${params}`
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch project management status');
      }

      return result.data;
    },
    {
      enabled: enabled && !!tenantId && !!releaseId, // NEW: Use enabled parameter
      staleTime: 30 * 1000,
      cacheTime: 2 * 60 * 1000,
      refetchInterval: enabled ? 30 * 1000 : false, // NEW: Only poll if enabled
      retry: 1,
    }
  );
}

/**
 * Get cherry pick status
 * Backend contract: GET /check-cherry-pick-status
 */
export function useCherryPickStatus(tenantId?: string, releaseId?: string) {
  return useQuery<CherryPickStatusResponse, Error>(
    QUERY_KEYS.cherryPickStatus(tenantId || '', releaseId || ''),
    async () => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiGet<CherryPickStatusResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/check-cherry-pick-status`
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch cherry pick status');
      }

      return result.data;
    },
    {
      enabled: !!tenantId && !!releaseId,
      staleTime: 30 * 1000,
      cacheTime: 2 * 60 * 1000,
      refetchInterval: 30 * 1000,
      retry: 1,
    }
  );
}

// ======================
// Approval Mutation Hooks
// ======================

/**
 * Approve regression stage
 * Backend contract: POST /api/v1/tenants/{tenantId}/releases/{releaseId}/trigger-pre-release
 */
export function useApproveRegression(tenantId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<ApproveRegressionStageResponse, Error, ApproveRegressionStageRequest>(
    async (request) => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const response = await apiPost<ApproveRegressionStageResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/trigger-pre-release`,
        request
      );
      if (!response.success || !response.data) {
        throw new Error('Failed to approve regression stage');
      }
      return response.data;
    },
    {
      onSuccess: () => {
        if (tenantId && releaseId) {
          // Invalidate both REGRESSION (current) and PRE_RELEASE (next stage that gets triggered)
          queryClient.invalidateQueries(QUERY_KEYS.stage(tenantId, releaseId, TaskStage.REGRESSION));
          queryClient.invalidateQueries(QUERY_KEYS.stage(tenantId, releaseId, TaskStage.PRE_RELEASE));
          // Invalidate releases list to reflect stage transition
          queryClient.invalidateQueries(['releases', tenantId]);
          // Invalidate activity logs to show approval action
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(tenantId, releaseId));
        }
      },
    }
  );
}

/**
 * Complete pre-release stage
 * Backend contract: POST /api/v1/tenants/{tenantId}/releases/{releaseId}/stages/pre-release/complete (no request body)
 */
export function useCompletePreReleaseStage(tenantId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<CompletePreReleaseResponse, Error, CompletePreReleaseRequest | undefined>(
    async (request) => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiPost<CompletePreReleaseResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/pre-release/complete`,
        request || {}
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to complete pre-release stage');
      }

      return result.data;
    },
    {
      onSuccess: () => {
        if (tenantId && releaseId) {
          queryClient.invalidateQueries(QUERY_KEYS.stage(tenantId, releaseId, TaskStage.PRE_RELEASE));
          // Invalidate releases list to reflect stage completion
          queryClient.invalidateQueries(['releases', tenantId]);
          // Invalidate activity logs to show completion action
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(tenantId, releaseId));
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
export function useNotifications(tenantId?: string, releaseId?: string) {
  return useQuery<NotificationsResponse, Error>(
    ['release-process', 'notifications', tenantId, releaseId],
    async () => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiGet<NotificationsResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/notifications`
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch notifications');
      }

      return result.data;
    },
    {
      enabled: !!tenantId && !!releaseId,
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );
}

/**
 * Send release notification
 * Backend contract: POST /notify
 */
export function useSendNotification(tenantId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<SendNotificationResponse, Error, NotificationRequest>(
    async (request) => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiPost<SendNotificationResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/notify`,
        request
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to send notification');
      }

      return result.data;
    },
    {
      onSuccess: () => {
        if (tenantId && releaseId) {
          queryClient.invalidateQueries(['release-process', 'notifications', tenantId, releaseId]);
          // Invalidate activity logs to show notification action
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(tenantId, releaseId));
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
export function useActivityLogs(tenantId?: string, releaseId?: string) {
  return useQuery<ActivityLogsResponse, Error>(
    QUERY_KEYS.activityLog(tenantId || '', releaseId || '', undefined),
    async () => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiGet<ActivityLogsResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/activity-logs`
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch activity logs');
      }

      return result.data;
    },
    {
      enabled: !!tenantId && !!releaseId,
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );
}

// ======================
// Build Artifacts Hooks
// ======================

/**
 * List build artifacts
 * Backend contract: GET /tenants/:tenantId/releases/:releaseId/builds/artifacts
 */
export function useBuildArtifacts(
  tenantId?: string,
  releaseId?: string,
  filters?: { platform?: Platform; buildStage?: string }
) {
  return useQuery<ListBuildArtifactsResponse, Error>(
    ['release-process', 'artifacts', tenantId, releaseId, filters],
    async () => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const params = new URLSearchParams();
      if (filters?.platform) params.append('platform', filters.platform);
      if (filters?.buildStage) params.append('buildStage', filters.buildStage);

      const queryString = params.toString();
      const endpoint = `/api/v1/tenants/${tenantId}/releases/${releaseId}/builds/artifacts${queryString ? `?${queryString}` : ''}`;

      const result = await apiGet<ListBuildArtifactsResponse>(endpoint);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch build artifacts');
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
      enabled: !!tenantId && !!releaseId,
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: true,
      retry: 1,
    }
  );
}

// ======================
// Release Management Hooks
// ======================

/**
 * Pause or resume release (stop/start cron job)
 * POST /api/v1/tenants/:tenantId/releases/:releaseId/pause-resume
 * Backend implementation:
 *   - Pause: POST /api/releases/:releaseId/cron/stop
 *   - Resume: POST /api/releases/:releaseId/cron/start
 * 
 * @param tenantId - Tenant UUID
 * @param releaseId - Release UUID
 * @returns Mutation that accepts { action: 'pause' | 'resume' }
 */
export function usePauseResumeRelease(tenantId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string; releaseId: string },
    Error,
    { action: 'pause' | 'resume' }
  >(
    async ({ action }) => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiPost<{ success: boolean; message: string; releaseId: string }>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/pause-resume`,
        { action }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || `Failed to ${action} release`);
      }

      return result.data;
    },
    {
      onSuccess: () => {
        // Invalidate release queries to refresh data
        queryClient.invalidateQueries(['releases', tenantId]);
        queryClient.invalidateQueries(['release', tenantId, releaseId]);
        queryClient.invalidateQueries(['release-process', 'stage', tenantId, releaseId]);
        // Invalidate activity logs to show pause/resume action
        if (tenantId && releaseId) {
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(tenantId, releaseId));
        }
      },
    }
  );
}

/**
 * Archive release
 * PUT /api/v1/tenants/:tenantId/releases/:releaseId/archive
 * Backend implementation: PUT /api/v1/tenants/:tenantId/releases/:releaseId/archive
 * 
 * @param tenantId - Tenant UUID
 * @param releaseId - Release UUID
 * @returns Mutation that accepts no parameters
 */
export function useArchiveRelease(tenantId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string },
    Error,
    void
  >(
    async () => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiPut<{ success: boolean; message: string }>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/archive`
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to archive release');
      }

      return result.data;
    },
    {
      onSuccess: () => {
        // Invalidate release queries to refresh data
        queryClient.invalidateQueries(['releases', tenantId]);
        queryClient.invalidateQueries(['release', tenantId, releaseId]);
        queryClient.invalidateQueries(['release-process', 'stage', tenantId, releaseId]);
        // Invalidate activity logs to show archive action
        if (tenantId && releaseId) {
          queryClient.invalidateQueries(QUERY_KEYS.activityLog(tenantId, releaseId));
        }
      },
    }
  );
}


