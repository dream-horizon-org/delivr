/**
 * Remix API Route: Send Release Notification
 * POST /api/v1/tenants/:tenantId/releases/:releaseId/notify
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend contract: POST /api/v1/tenants/:tenantId/releases/:releaseId/notify
 * Matches API contract API #27: Send Release Notification
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest, type AuthenticatedActionFunction } from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import { createValidationError, handleAxiosError, logApiError, validateRequired } from '~/utils/api-route-helpers';
import type { NotificationRequest } from '~/types/release-process.types';

const sendNotification: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { tenantId, releaseId } = params;

  if (!validateRequired(tenantId, 'Tenant ID is required')) {
    return createValidationError('Tenant ID is required');
  }

  if (!validateRequired(releaseId, 'Release ID is required')) {
    return createValidationError('Release ID is required');
  }

  try {
    const body = await request.json() as NotificationRequest;

    if (!body.messageType) {
      return createValidationError('messageType is required');
    }

    console.log('[BFF] Sending notification for release:', releaseId, { messageType: body.messageType });
    const response = await ReleaseProcessService.sendNotification(tenantId, releaseId, body);
    console.log('[BFF] Send notification response:', response.data);
    
    return json(response.data, { status: 201 });
  } catch (error) {
    logApiError('SEND_NOTIFICATION_API', error);
    return handleAxiosError(error, 'Failed to send notification');
  }
};

export const action = authenticateActionRequest({ POST: sendNotification });

