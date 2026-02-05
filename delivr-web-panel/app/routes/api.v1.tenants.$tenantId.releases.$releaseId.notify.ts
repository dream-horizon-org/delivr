/**
 * Remix API Route: Send Ad-Hoc Release Notification
 * POST /api/v1/tenants/:tenantId/releases/:releaseId/notify
 * 
 * Supports both template and custom notifications
 * BFF route that proxies to ReleaseProcessService
 * Backend contract: POST /api/v1/tenants/:tenantId/releases/:releaseId/notify
 * 
 * Request Body:
 * - type: "template" | "custom"
 * - messageType: required if type="template"
 * - customMessage: required if type="custom"
 * - channels: array of Slack channel IDs (required)
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest, type AuthenticatedActionFunction } from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import { createValidationError, handleAxiosError, logApiError, validateRequired } from '~/utils/api-route-helpers';
import type { AdHocNotificationRequest } from '~/types/release-process.types';

const sendNotification: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { tenantId, releaseId } = params;

  if (!validateRequired(tenantId, 'Tenant ID is required')) {
    return createValidationError('Tenant ID is required');
  }

  if (!validateRequired(releaseId, 'Release ID is required')) {
    return createValidationError('Release ID is required');
  }

  try {
    const body = await request.json() as AdHocNotificationRequest;

    // Validate based on notification type
    if (!body.type) {
      return createValidationError('type is required (must be "template" or "custom")');
    }

    if (!body.channels || body.channels.length === 0) {
      return createValidationError('At least one channel is required');
    }

    // Validate template-specific fields
    if (body.type === 'template' && !body.messageType) {
      return createValidationError('messageType is required for template notifications');
    }

    // Validate custom-specific fields
    if (body.type === 'custom' && !body.customMessage) {
      return createValidationError('customMessage is required for custom notifications');
    }

    console.log('[BFF] Sending ad-hoc notification for release:', releaseId, { 
      type: body.type, 
      messageType: body.messageType,
      hasCustomMessage: !!body.customMessage,
      channelCount: body.channels.length 
    });
    
    const response = await ReleaseProcessService.sendNotification(tenantId, releaseId, body, user.user.id);
    console.log('[BFF] Send notification response:', response.data);
    
    return json(response.data, { status: 201 });
  } catch (error) {
    logApiError('SEND_NOTIFICATION_API', error);
    return handleAxiosError(error, 'Failed to send notification');
  }
};

export const action = authenticateActionRequest({ POST: sendNotification });


