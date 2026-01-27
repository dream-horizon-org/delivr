/**
 * API Route: Download Submission Artifact
 * 
 * GET /api/v1/apps/:appId/submissions/:submissionId/artifact?platform=<ANDROID|IOS>
 * 
 * Returns a presigned S3 URL to download the submission artifact (AAB or IPA).
 * The URL is time-limited for security.
 * 
 * Path Parameters:
 * - appId: Tenant/Organization ID (required)
 * - submissionId: Submission ID (required)
 * 
 * Reference: DISTRIBUTION_API_SPEC.md lines 1601-1666
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { DistributionService } from '~/.server/services/Distribution/distribution.service';
import { Platform } from '~/types/distribution/distribution.types';

/**
 * Loader - Get presigned artifact download URL
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const { appId, submissionId } = params;
  const url = new URL(request.url);
  const platform = url.searchParams.get('platform');

  // Validate required parameters
  if (!appId) {
    return json(
      {
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'app id is required for authorization',
        },
      },
      { status: 400 }
    );
  }

  if (!submissionId) {
    return json(
      {
        success: false,
        error: {
          code: 'MISSING_SUBMISSION_ID',
          message: 'Submission ID is required',
        },
      },
      { status: 400 }
    );
  }

  if (!platform || (platform !== Platform.ANDROID && platform !== Platform.IOS)) {
    return json(
      {
        success: false,
        error: {
          code: 'INVALID_PLATFORM',
          message: 'Platform must be "ANDROID" or "IOS"',
        },
      },
      { status: 400 }
    );
  }

  try {
    // Call backend API to get presigned URL
    const response = await DistributionService.getArtifactDownloadUrl(
      appId,
      submissionId,
      platform as Platform
    );

    return json({
      success: true,
      data: {
        presignedUrl: response.data.data.url,
        expiresAt: response.data.data.expiresAt,
        filename: `app-${platform.toLowerCase()}-${submissionId}.${platform === Platform.ANDROID ? 'aab' : 'ipa'}`,
      },
    });
  } catch (error) {
    console.error('[Artifact Download] Error:', error);
    return json(
      {
        success: false,
        error: {
          code: 'ARTIFACT_DOWNLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate download URL',
        },
      },
      { status: 500 }
    );
  }
}

