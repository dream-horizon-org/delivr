/**
 * API Route: Fetch Slack Channels (LIVE from Slack API)
 * GET /api/v1/integrations/:integrationId/channels?appId=xxx
 * 
 * Fetches ALL available Slack channels by calling Slack API with stored token
 * Used in Release Config to show all channels, not just stored ones
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { SlackIntegrationService } from '~/.server/services/ReleaseManagement/integrations';

export const loader = authenticateLoaderRequest(async ({ params, request, user }) => {
  const { integrationId } = params;
  const url = new URL(request.url);
  const appId = url.searchParams.get('appId');

  if (!integrationId) {
    return json(
      { success: false, error: 'Integration ID is required' },
      { status: 400 }
    );
  }

  if (!appId) {
    return json(
      { success: false, error: 'app id is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`[Slack Channels API] Fetching LIVE channels from Slack API for tenant: ${appId}, integrationId: ${integrationId}`);
    
    // Use service to call backend (handles authentication properly)
    // Pass integrationId to use the new endpoint that retrieves token internally
    const result = await SlackIntegrationService.fetchChannelsForIntegration(appId, user.user.id, integrationId);
    
    if (!result.success) {
      console.error(`[Slack Channels API] Error:`, result.error);
      
      return json(
        { 
          success: false, 
          error: result.error || 'Failed to fetch channels from Slack' 
        },
        { status: 500 }
      );
    }

    console.log(`[Slack Channels API] Result:`, result);

    const channels = result?.data?.channels || [];
    
    console.log(`[Slack Channels API] Successfully fetched ${channels.length} channels from Slack API`);
    
    return json({
      success: true,
      data: channels,
    });
  } catch (error) {
    console.error('[Slack Channels API] Error:', error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch channels' 
      },
      { status: 500 }
    );
  }
});

