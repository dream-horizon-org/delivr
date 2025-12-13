/**
 * useReleaseProcess Hook
 * Fetches and manages release process stage data using React Query
 * Follows same pattern as useRelease and useReleases
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiGet, apiPost, apiDelete, getApiErrorMessage } from '~/utils/api-client';
import { TaskStage, Platform, BuildUploadStage } from '~/types/release-process-enums';
import type {
  KickoffStageResponse,
  RegressionStageResponse,
  PostRegressionStageResponse,
  RetryTaskResponse,
  BuildUploadResponse,
  TestManagementStatusResponse,
  ProjectManagementStatusResponse,
  CherryPickStatusResponse,
  ApproveRegressionStageRequest,
  ApproveRegressionStageResponse,
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

      return result.data;
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
  
  console.log('[useRegressionStage] Hook called with:', { tenantId, releaseId, isEnabled });
  
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

      return result.data;
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
 * Get post-regression stage data
 */
export function usePostRegressionStage(tenantId?: string, releaseId?: string) {
  return useQuery<PostRegressionStageResponse, Error>(
    QUERY_KEYS.stage(tenantId || '', releaseId || '', TaskStage.POST_REGRESSION),
    async () => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiGet<PostRegressionStageResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/post-regression`
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch post-regression stage');
      }

      return result.data;
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

      return result.data;
    },
    {
      onSuccess: () => {
        // Invalidate all stage queries to refetch updated data
        if (tenantId && releaseId) {
          Object.values(TaskStage).forEach((stage) => {
            queryClient.invalidateQueries(QUERY_KEYS.stage(tenantId, releaseId, stage));
          });
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
      const response = await fetch(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/${stage}/builds/${platform}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || error.message || 'Upload failed');
      }

      const data = await response.json();
      return data.data || data;
    },
    {
      onSuccess: (_, variables) => {
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
              stageToInvalidate = TaskStage.POST_REGRESSION;
              break;
            default:
              stageToInvalidate = TaskStage.REGRESSION;
          }
          queryClient.invalidateQueries(QUERY_KEYS.stage(tenantId, releaseId, stageToInvalidate));
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
export function useTestManagementStatus(tenantId?: string, releaseId?: string, platform?: Platform) {
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
      enabled: !!tenantId && !!releaseId,
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 30 * 1000, // Poll every 30 seconds
      retry: 1,
    }
  );
}

/**
 * Get project management status
 * Backend contract: GET /project-management-run-status?platform={platform}
 */
export function useProjectManagementStatus(tenantId?: string, releaseId?: string, platform?: Platform) {
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
      enabled: !!tenantId && !!releaseId,
      staleTime: 30 * 1000,
      cacheTime: 2 * 60 * 1000,
      refetchInterval: 30 * 1000,
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
 * Backend contract: POST /stages/regression/approve with ApproveRegressionStageRequest
 */
export function useApproveRegression(tenantId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<ApproveRegressionStageResponse, Error, ApproveRegressionStageRequest>(
    async (request) => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiPost<ApproveRegressionStageResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/regression/approve`,
        request
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to approve regression stage');
      }

      return result.data;
    },
    {
      onSuccess: () => {
        if (tenantId && releaseId) {
          queryClient.invalidateQueries(QUERY_KEYS.stage(tenantId, releaseId, TaskStage.REGRESSION));
        }
      },
    }
  );
}

/**
 * Complete post-regression stage
 * Backend contract: POST /stages/post-regression/complete (no request body)
 */
export function useCompletePostRegression(tenantId?: string, releaseId?: string) {
  const queryClient = useQueryClient();

  return useMutation<CompletePreReleaseResponse, Error, void>(
    async () => {
      if (!tenantId || !releaseId) {
        throw new Error('tenantId and releaseId are required');
      }

      const result = await apiPost<CompletePreReleaseResponse>(
        `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/post-regression/complete`
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to complete post-regression stage');
      }

      return result.data;
    },
    {
      onSuccess: () => {
        if (tenantId && releaseId) {
          queryClient.invalidateQueries(QUERY_KEYS.stage(tenantId, releaseId, TaskStage.POST_REGRESSION));
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

