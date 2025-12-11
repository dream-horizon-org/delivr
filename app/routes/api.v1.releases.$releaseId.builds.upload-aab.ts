/**
 * Remix API Route: Upload Android AAB (Manual Mode)
 * POST /api/v1/releases/:releaseId/builds/upload-aab - Upload AAB file
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest, AuthenticatedActionFunction } from '~/utils/authenticate';
import { DistributionService } from '~/.server/services/Distribution';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import {
  ERROR_MESSAGES,
  LOG_CONTEXT,
} from '~/constants/distribution-api.constants';

const uploadAAB: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { releaseId } = params;

  if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return createValidationError(ERROR_MESSAGES.FILE_REQUIRED);
    }

    const versionName = formData.get('versionName') as string | null;
    const versionCode = formData.get('versionCode') as string | null;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });

    const metadata = {
      ...(versionName && { versionName }),
      ...(versionCode && { versionCode }),
    };

    const response = await DistributionService.uploadAAB(
      releaseId,
      blob,
      metadata
    );

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.UPLOAD_AAB_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_UPLOAD_AAB);
  }
};

export const action = authenticateActionRequest({ POST: uploadAAB });
