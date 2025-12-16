/**
 * Remix API Route: Slack Token Verification
 * POST /api/v1/tenants/:tenantId/integrations/slack/verify
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest } from '~/utils/authenticate';
import { SlackIntegrationService} from '~/.server/services/ReleaseManagement/integrations';
import type { User } from '~/.server/services/Auth/Auth.interface';

export const action = authenticateActionRequest({
  POST: async ({ request, params, user }: ActionFunctionArgs & { user: User }) => {
    const tenantId = params.tenantId;
    if (!tenantId) {
      return json({ error: 'Tenant ID required' }, { status: 400 });
    }

    try {
      const body = await request.json();
      const { botToken, _encrypted } = body;

      if (!botToken) {
        return json(
          { success: false, verified: false, error: 'Bot token is required' },
          { status: 400 }
        );
      }

      // Skip format validation if token is encrypted
      if (!_encrypted && !botToken.startsWith('xoxb-')) {
        return json(
          { 
            success: false, 
            verified: false, 
            error: 'Invalid bot token format. Token must start with "xoxb-"' 
          },
          { status: 400 }
        );
      }

      console.log(`[Slack-Verify] Verifying token for tenant: ${tenantId}, _encrypted: ${_encrypted}`);


      const result = await SlackIntegrationService.verifySlack({
        tenantId,
        botToken,
        userId: user.user.id,
        _encrypted, // Forward encryption flag to backend
      });

      console.log(`[Slack-Verify] Verification result:`, {
        success: result.success,
        verified: result.verified,
        workspaceName: result.workspaceName
      });

      return json(result);
    } catch (error) {
      console.log('[Slack-Verify] Error:', error);
      return json(
        {
          success: false,
          verified: false,
          error: error instanceof Error ? error.message : 'Failed to verify Slack token'
        },
        { status: 500 }
      );
    }
  }
});


