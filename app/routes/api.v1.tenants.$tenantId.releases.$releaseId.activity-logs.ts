/**
 * Activity Logs API Route
 * 
 * BFF route that returns activity logs for a release
 * Currently returns dummy data until backend API is implemented
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/Auth.interface';
import type { ActivityLogsResponse } from '~/types/release-process.types';

/**
 * GET /api/v1/tenants/:tenantId/releases/:releaseId/activity-logs
 * Fetch activity logs for a release
 * 
 * Returns dummy data for now - will be replaced with real backend API call
 */
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { tenantId, releaseId } = params;

    if (!tenantId) {
      return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
    }

    if (!releaseId) {
      return json({ success: false, error: 'Release ID required' }, { status: 400 });
    }

    try {
      console.log('[BFF] Fetching activity logs:', { tenantId, releaseId });

      // TODO: Replace with real backend API call when ready
      // const result = await getActivityLogs(tenantId, releaseId);
      
      // Dummy data - diverse examples covering different activity types
      const dummyActivityLogs: ActivityLogsResponse = {
        success: true,
        releaseId: releaseId,
        activityLogs: [
          {
            id: 'log_1',
            releaseId: releaseId,
            type: 'RELEASE_STATUS_CHANGE',
            previousValue: { status: 'PENDING' },
            newValue: { status: 'IN_PROGRESS' },
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            updatedBy: 'user123',
          },
          {
            id: 'log_2',
            releaseId: releaseId,
            type: 'TASK_UPDATE',
            previousValue: { taskId: 'task_1', status: 'FAILED', taskType: 'FORK_BRANCH' },
            newValue: { taskId: 'task_1', status: 'COMPLETED', taskType: 'FORK_BRANCH' },
            updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
            updatedBy: 'user456',
          },
          {
            id: 'log_3',
            releaseId: releaseId,
            type: 'RELEASE_FIELD_UPDATE',
            previousValue: { field: 'kickOffDate', value: '2024-12-10T10:00:00Z' },
            newValue: { field: 'kickOffDate', value: '2024-12-15T10:00:00Z' },
            updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
            updatedBy: 'user789',
          },
          {
            id: 'log_4',
            releaseId: releaseId,
            type: 'RELEASE_PAUSED',
            previousValue: { cronStatus: 'RUNNING' },
            newValue: { cronStatus: 'PAUSED', reason: 'Manual pause by user' },
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            updatedBy: 'user123',
          },
          {
            id: 'log_5',
            releaseId: releaseId,
            type: 'RELEASE_RESUMED',
            previousValue: { cronStatus: 'PAUSED' },
            newValue: { cronStatus: 'RUNNING' },
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // 1 day ago + 30 min
            updatedBy: 'user123',
          },
          {
            id: 'log_6',
            releaseId: releaseId,
            type: 'RELEASE_FIELD_UPDATE',
            previousValue: { field: 'branch', value: 'release/v1.0.0' },
            newValue: { field: 'branch', value: 'release/v1.1.0' },
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
            updatedBy: 'user456',
          },
          {
            id: 'log_7',
            releaseId: releaseId,
            type: 'INTEGRATION_EVENT',
            previousValue: null,
            newValue: { integration: 'slack', event: 'RELEASE_KICKOFF', channel: '#releases' },
            updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            updatedBy: 'system',
          },
          {
            id: 'log_8',
            releaseId: releaseId,
            type: 'TASK_UPDATE',
            previousValue: { taskId: 'task_2', status: 'PENDING', taskType: 'CREATE_PROJECT_MANAGEMENT_TICKET' },
            newValue: { taskId: 'task_2', status: 'COMPLETED', taskType: 'CREATE_PROJECT_MANAGEMENT_TICKET', ticketId: 'JIRA-123' },
            updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
            updatedBy: 'system',
          },
        ],
      };

      console.log('[BFF] Activity logs fetched successfully:', dummyActivityLogs.activityLogs.length);
      return json(dummyActivityLogs);
    } catch (error: any) {
      console.error('[BFF] Activity logs error:', error);
      return json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

