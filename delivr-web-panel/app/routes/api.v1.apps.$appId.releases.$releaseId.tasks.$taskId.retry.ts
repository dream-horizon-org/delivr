/**
 * Remix API Route: Retry Task
 * POST /api/v1/apps/:appId/releases/:releaseId/tasks/:taskId/retry
 * 
 * BFF route that calls the ReleaseProcessService to retry a failed task
 * Matches backend contract API #8
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import {
  authenticateActionRequest,
  type AuthenticatedActionFunction,
} from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import type { RetryTaskResponse } from '~/types/release-process.types';

const retryTask: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const appId = params.appId;
  const releaseId = params.releaseId;
  const taskId = params.taskId;

  // Validate required path parameters
  if (!validateRequired(appId, 'app id is required')) {
    return createValidationError('app id is required');
  }

  if (!validateRequired(releaseId, 'Release ID is required')) {
    return createValidationError('Release ID is required');
  }

  if (!validateRequired(taskId, 'Task ID is required')) {
    return createValidationError('Task ID is required');
  }

  try {
    const response = await ReleaseProcessService.retryTask(appId, releaseId, taskId, user.user.id);
    
    // Axios response structure: response.data contains the actual response body
    return json(response.data as RetryTaskResponse);
  } catch (error) {
    logApiError('[Retry Task API]', error);
    return handleAxiosError(error, 'Failed to retry task');
  }
};

export const action = authenticateActionRequest({ POST: retryTask });

