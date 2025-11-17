/**
 * Remix API Route: Slack Channels Fetch
 * POST /api/v1/tenants/:tenantId/integrations/slack/channels
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest } from '~/utils/authenticate';
import { SlackIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import type { User } from '~/.server/services/Auth/Auth.interface';

export const action = authenticateActionRequest({
  POST: async ({ request, params, user }: ActionFunctionArgs & { user: User }) => {
    const tenantId = params.tenantId;
    if (!tenantId) {
      return json({ error: 'Tenant ID required' }, { status: 400 });
    }

    try {
      const body = await request.json();
      const { botToken } = body;

      if (!botToken) {
        return json(
          { success: false, channels: [], error: 'Bot token is required' },
          { status: 400 }
        );
      }

      console.log(`[Slack-Channels] Fetching channels for tenant: ${tenantId}`);

      const result = await SlackIntegrationService.fetchChannels({
        tenantId,
        botToken,
        userId: user.user.id
      });

      console.log(`[Slack-Channels] Fetched ${result.channels?.length || 0} channels`);

      return json(result);
    } catch (error) {
      console.error('[Slack-Channels] Error:', error);
      return json(
        {
          success: false,
          channels: [],
          error: error instanceof Error ? error.message : 'Failed to fetch Slack channels'
        },
        { status: 500 }
      );
    }
  }
});


