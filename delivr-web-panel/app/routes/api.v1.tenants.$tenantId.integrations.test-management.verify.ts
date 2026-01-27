/**
 * BFF Route: Verify Test Management Credentials (Checkmate)
 * POST /api/v1/apps/:appId/integrations/test-management/verify
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/auth.interface';
import { CheckmateIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { logApiError } from '~/utils/api-route-helpers';

const verifyTestManagementCredentials = async ({
  request,
  params,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { appId } = params;

  if (!appId) {
    return json({ success: false, verified: false, error: 'app id required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    
    const config = {
      baseUrl: body.baseUrl || body.config?.baseUrl,
      authToken: body.authToken || body.config?.authToken,
      orgId: body.orgId || body.config?.orgId,
      _encrypted: body._encrypted || body.config?._encrypted, // Forward encryption flag
    };

    // Validate required fields
    if (!config.baseUrl) {
      return json({ success: false, verified: false, error: 'Base URL is required' }, { status: 400 });
    }
    if (!config.authToken) {
      return json({ success: false, verified: false, error: 'Auth Token is required' }, { status: 400 });
    }
    if (!config.orgId) {
      return json({ success: false, verified: false, error: 'Organization ID is required' }, { status: 400 });
    }

    console.log('[BFF-TestMgmt-Verify] Verifying Checkmate credentials for tenant:', appId);
    console.log('[BFF-TestMgmt-Verify] Config:', { 
      baseUrl: config.baseUrl,
      orgId: config.orgId,
      authToken: '[REDACTED]',
      _encrypted: config._encrypted
    });

    const result = await CheckmateIntegrationService.verifyCredentials(
      {
        baseUrl: config.baseUrl,
        authToken: config.authToken,
        orgId: config.orgId,
        _encrypted: config._encrypted, // Forward encryption flag
      },
      appId,
      user.user.id
    );

    console.log('[BFF-TestMgmt-Verify] Verification result:', {
      success: result.success,
      verified: result.verified,
      error: result.error,
      message: result.message
    });

    // Return appropriate HTTP status based on verification result
    if (result.verified) {
      return json(result, { status: 200 });
    } else {
      // Verification failed - include backend error/message details
      const errorMessage = result.error || result.message || 'Verification failed';
      return json({
        success: false,
        verified: false,
        error: errorMessage,
        message: result.message,
      }, { status: 401 });
    }
  } catch (error) {
    logApiError('[BFF-TestMgmt-Verify]', error);
    return json(
      {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Failed to verify Checkmate credentials',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: verifyTestManagementCredentials,
});

