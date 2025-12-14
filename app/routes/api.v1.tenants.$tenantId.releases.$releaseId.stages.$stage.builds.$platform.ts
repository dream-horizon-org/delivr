/**
 * Remix API Route: Manual Build Upload
 * POST /api/v1/tenants/:tenantId/releases/:releaseId/stages/:stage/builds/:platform
 * 
 * BFF route that transforms frontend request to backend format:
 * - Maps BuildUploadStage (from path) to TaskStage (for backend)
 * - Renames 'file' field to 'artifact' (backend expects 'artifact')
 * - Forwards to backend route: POST /stages/:stage/builds/:platform
 * 
 * Frontend sends:
 *   - stage: 'PRE_REGRESSION' | 'REGRESSION' | 'PRE_RELEASE' (BuildUploadStage)
 *   - platform: 'ANDROID' | 'IOS' | 'WEB' (Platform)
 *   - file: File (multipart/form-data)
 * 
 * Backend expects:
 *   - stage: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE' (TaskStage)
 *   - platform: 'ANDROID' | 'IOS' | 'WEB' (Platform)
 *   - artifact: File (multipart/form-data)
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
import { BuildUploadStage, Platform } from '~/types/release-process-enums';
import { mapBuildUploadStageToTaskStage } from '~/utils/build-upload-mapper';

const uploadBuild: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { tenantId, releaseId, stage, platform } = params;

  // Validate required path parameters
  if (!validateRequired(tenantId, 'Tenant ID is required')) {
    return createValidationError('Tenant ID is required');
  }

  if (!validateRequired(releaseId, 'Release ID is required')) {
    return createValidationError('Release ID is required');
  }

  if (!validateRequired(stage, 'Stage is required')) {
    return createValidationError('Stage is required');
  }

  if (!validateRequired(platform, 'Platform is required')) {
    return createValidationError('Platform is required');
  }

  // Validate stage is a valid BuildUploadStage
  const validStages = Object.values(BuildUploadStage);
  if (!validStages.includes(stage as BuildUploadStage)) {
    return createValidationError(`Invalid stage. Must be one of: ${validStages.join(', ')}`);
  }

  // Validate platform is a valid Platform
  const validPlatforms = Object.values(Platform);
  if (!validPlatforms.includes(platform as Platform)) {
    return createValidationError(`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`);
  }

  try {
    // Parse form data from request
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return createValidationError('File is required');
    }

    // Convert File to Blob for backend upload (preserve filename and type)
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type || 'application/octet-stream' });

    console.log('[BFF] File received:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      blobSize: blob.size,
      blobType: blob.type,
    });

    // Map BuildUploadStage to TaskStage for backend
    const buildUploadStage = stage as BuildUploadStage;
    const platformEnum = platform as Platform;

    // Call service - it will handle the stage mapping and route to backend
    // Pass filename so it can be included in FormData if needed
    console.log('[BFF] Uploading build to backend:', { tenantId, releaseId, platformEnum, buildUploadStage, fileName: file.name, blobSize: blob.size, blobType: blob.type });
    const response = await ReleaseProcessService.uploadBuild(
      tenantId,
      releaseId,
      blob,
      platformEnum,
      buildUploadStage,
      file.name // Pass filename
    );

    // Return response data
    return json(response.data);
  } catch (error) {
    logApiError('MANUAL_BUILD_UPLOAD_API', error);
    return handleAxiosError(error, 'Failed to upload build');
  }
};

// API contract specifies PUT, but we support both PUT and POST for compatibility
export const action = authenticateActionRequest({ POST: uploadBuild, PUT: uploadBuild });

