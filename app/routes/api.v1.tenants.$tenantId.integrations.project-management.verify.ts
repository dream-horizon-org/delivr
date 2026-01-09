/**
 * BFF Route: Verify Project Management Credentials
 * Generic route for all PM providers (JIRA, LINEAR, ASANA, etc.)
 * POST /api/v1/tenants/:tenantId/integrations/project-management/verify?providerType=JIRA
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/auth.interface';
import { ProjectManagementIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import type { ProjectManagementProviderType } from '~/.server/services/ReleaseManagement/integrations';
import { logApiError } from '~/utils/api-route-helpers';

const verifyPMCredentials = async ({
  request,
  params,
  user,
}: ActionFunctionArgs & { user: User }) => {
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, verified: false, error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const url = new URL(request.url);
    const providerType = (url.searchParams.get('providerType') || body.providerType || 'JIRA').toUpperCase() as ProjectManagementProviderType;

    // Transform Jira-specific fields to generic format
    const config: any = body.config || {};
    if (body.hostUrl) config.baseUrl = body.hostUrl;
    if (body.baseUrl) config.baseUrl = body.baseUrl;
    if (body.email) config.email = body.email;
    if (body.username) config.email = body.username;
    if (body.apiToken) config.apiToken = body.apiToken;
    if (body.jiraType) config.jiraType = body.jiraType;
    if (body._encrypted) config._encrypted = body._encrypted; // Forward encryption flag

    // Validate required fields
    if (!config.baseUrl) {
      return json({ success: false, verified: false, error: 'Base URL is required' }, { status: 400 });
    }
    if (!config.email) {
      return json({ success: false, verified: false, error: 'Email/Username is required' }, { status: 400 });
    }
    if (!config.apiToken) {
      return json({ success: false, verified: false, error: 'API Token is required' }, { status: 400 });
    }

    console.log('[BFF-PM-Verify] Verifying credentials for provider:', providerType);
    console.log('[BFF-PM-Verify] Config:', { 
      baseUrl: config.baseUrl,
      email: config.email,
      jiraType: config.jiraType,
      apiToken: '[REDACTED]',
      _encrypted: config._encrypted
    });

    const result = await ProjectManagementIntegrationService.verifyCredentials(
      {
        tenantId,
        providerType,
        config,
      },
      user.user.id
    );

    console.log('[BFF-PM-Verify] Backend verification result:', {
      success: result.success,
      verified: result.verified,
      error: result.error,
      message: result.message,
      details: result.details
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
        details: result.details,
      }, { status: 401 });
    }
  } catch (error) {
    logApiError('[BFF-PM-Verify]', error);
    return json(
      {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Failed to verify credentials',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: verifyPMCredentials,
});

