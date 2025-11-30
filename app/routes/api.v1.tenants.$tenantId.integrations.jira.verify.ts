/**
 * BFF Route: Verify Jira Credentials
 * POST /api/v1/tenants/:tenantId/integrations/jira/verify
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { ProjectManagementIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

const verifyJiraCredentials = async ({
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
    
    const config = {
      baseUrl: body.hostUrl || body.baseUrl || body.config?.baseUrl,
      email: body.email || body.username || body.config?.email,
      apiToken: body.apiToken || body.config?.apiToken,
      jiraType: body.jiraType || body.config?.jiraType || 'CLOUD',
    };

    // Validate required fields
    if (!config.baseUrl) {
      return json({ success: false, verified: false, error: 'Base URL is required' }, { status: 400 });
    }
    if (!config.email) {
      return json({ success: false, verified: false, error: 'Email is required' }, { status: 400 });
    }
    if (!config.apiToken) {
      return json({ success: false, verified: false, error: 'API Token is required' }, { status: 400 });
    }

    console.log('[BFF-Jira-Verify] Verifying Jira credentials for tenant:', tenantId);
    console.log('[BFF-Jira-Verify] Config:', { 
      baseUrl: config.baseUrl,
      email: config.email,
      jiraType: config.jiraType,
      apiToken: '[REDACTED]'
    });

    const result = await ProjectManagementIntegrationService.verifyCredentials(
      {
        tenantId: tenantId,
        providerType: 'JIRA',
        config,
      },
      user.user.id
    );

    console.log('[BFF-Jira-Verify] Verification result:', {
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
    console.error('[BFF-Jira-Verify] Error:', error);
    return json(
      {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Failed to verify Jira credentials',
      },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: verifyJiraCredentials,
});

