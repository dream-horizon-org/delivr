import { Request, Response } from "express";
import { customAlphabet } from "nanoid";
import { getStorage } from "../../storage/storage-instance";
import { SlackIntegrationController } from "../../storage/integrations/slack/slack-controller";
import { 
  CommunicationType, 
  VerificationStatus, 
  CreateSlackIntegrationDto, 
  UpdateSlackIntegrationDto,
  SafeSlackIntegration,
  SlackChannel
} from "../../storage/integrations/slack/slack-types";
import fetch from "node-fetch";

// Create nanoid generator for channel config IDs (shorter, URL-safe)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-', 21);

// ============================================================================
// SLACK CONTROLLERS
// ============================================================================

/**
 * Helper to get Slack controller from storage singleton
 */
const getSlackController = (): SlackIntegrationController => {
  const storage = getStorage();
  return (storage as any).slackController;
};

/**
 * Controller: Verify Slack Bot Token
 * POST /tenants/:tenantId/integrations/slack/verify
 */
export async function verifySlackToken(
  req: Request, 
  res: Response
): Promise<any> {
  const { botToken } = req.body;

  // Validation
  if (!botToken) {
    return res.status(400).json({
      success: false,
      error: "botToken is required"
    });
  }

  if (!botToken.startsWith('xoxb-')) {
    return res.status(400).json({
      success: false,
      error: "Invalid bot token format. Token must start with 'xoxb-'"
    });
  }

  try {
    // Verify Slack bot token
    const verificationResult = await verifySlackTokenAPI(botToken);

    return res.status(200).json({
      success: verificationResult.isValid,
      verified: verificationResult.isValid,
      message: verificationResult.message,
      workspaceId: verificationResult.workspaceId,
      workspaceName: verificationResult.workspaceName,
      botUserId: verificationResult.botUserId,
      details: verificationResult.details
    });
  } catch (error: any) {
    console.error("[Slack] Error verifying token:", error);
    return res.status(200).json({
      success: false,
      verified: false,
      message: error.message || "Failed to verify Slack token",
      error: error.message
    });
  }
}

/**
 * Controller: Fetch Slack Channels
 * POST /tenants/:tenantId/integrations/slack/channels
 */
export async function fetchSlackChannels(
  req: Request, 
  res: Response
): Promise<any> {
  const { botToken } = req.body;

  // Validation
  if (!botToken) {
    return res.status(400).json({
      success: false,
      error: "botToken is required"
    });
  }

  try {
    // Fetch Slack channels
    const channelsResult = await fetchSlackChannelsAPI(botToken);

    return res.status(200).json({
      success: channelsResult.success,
      channels: channelsResult.channels || [],
      message: channelsResult.message,
      metadata: channelsResult.metadata
    });
  } catch (error: any) {
    console.error("[Slack] Error fetching channels:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch Slack channels"
    });
  }
}

/**
 * Controller: Create or Update Slack Integration
 * POST /tenants/:tenantId/integrations/slack
 */
export async function createOrUpdateSlackIntegration(
  req: Request, 
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;
  const { 
    botToken,
    botUserId,
    workspaceId,
    workspaceName
  } = req.body;

  // Validation
  if (!botToken) {
    return res.status(400).json({
      success: false,
      error: "botToken is required"
    });
  }

  try {
    const slackController = getSlackController();
    
    // Check if integration already exists
    const existing = await slackController.findByTenant(tenantId, CommunicationType.SLACK);
    
    if (existing) {
      // Update existing integration
      const updateData: UpdateSlackIntegrationDto = {
        slackBotToken: botToken,
        slackBotUserId: botUserId,
        slackWorkspaceId: workspaceId,
        slackWorkspaceName: workspaceName,
        verificationStatus: VerificationStatus.VALID
      };

      const updated = await slackController.update(existing.id, updateData);
      
      return res.status(200).json({
        success: true,
        message: "Slack integration updated successfully",
        integration: sanitizeSlackResponse(updated)
      });
    } else {
      // Create new integration
      const createData: CreateSlackIntegrationDto = {
        tenantId,
        communicationType: CommunicationType.SLACK,
        slackBotToken: botToken,
        slackBotUserId: botUserId,
        slackWorkspaceId: workspaceId,
        slackWorkspaceName: workspaceName
      };

      const created = await slackController.create(createData);
      
      // Mark as verified since token was provided (assumes it was verified in the UI flow)
      await slackController.updateVerificationStatus(created.id, VerificationStatus.VALID);
      
      // Fetch updated record
      const updated = await slackController.findByTenant(tenantId, CommunicationType.SLACK);
      
      return res.status(201).json({
        success: true,
        message: "Slack integration created successfully",
        integration: sanitizeSlackResponse(updated)
      });
    }
  } catch (error: any) {
    console.error("[Slack] Error saving integration:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to save Slack integration"
    });
  }
}

/**
 * Controller: Get Slack Integration for Tenant
 * GET /tenants/:tenantId/integrations/slack
 */
export async function getSlackIntegration(
  req: Request, 
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;

  try {
    const slackController = getSlackController();
    const integration = await slackController.findByTenant(tenantId, CommunicationType.SLACK);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: "No Slack integration found for this tenant"
      });
    }

    return res.status(200).json({
      success: true,
      integration: sanitizeSlackResponse(integration)
    });
  } catch (error: any) {
    console.error("[Slack] Error fetching integration:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch Slack integration"
    });
  }
}

/**
 * Controller: Update Slack Integration
 * PATCH /tenants/:tenantId/integrations/slack
 */
export async function updateSlackIntegration(
  req: Request, 
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;
  const updateData = req.body;

  try {
    const slackController = getSlackController();
    const existing = await slackController.findByTenant(tenantId, CommunicationType.SLACK);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "No Slack integration found for this tenant"
      });
    }

    // If updating botToken, re-verify
    if (updateData.botToken) {
      const verificationResult = await verifySlackTokenAPI(updateData.botToken);
      
      if (!verificationResult.isValid) {
        return res.status(400).json({
          success: false,
          error: "Failed to verify updated Slack token",
          details: verificationResult.message
        });
      }

      // Update verification status and workspace info
      updateData.slackBotToken = updateData.botToken;
      updateData.slackWorkspaceId = verificationResult.workspaceId;
      updateData.slackWorkspaceName = verificationResult.workspaceName;
      updateData.slackBotUserId = verificationResult.botUserId;
      updateData.verificationStatus = VerificationStatus.VALID;
      
      // Remove the temporary botToken field
      delete updateData.botToken;

      // Update verification status
      await slackController.updateVerificationStatus(existing.id, VerificationStatus.VALID);
    }

    const updated = await slackController.update(existing.id, updateData);

    return res.status(200).json({
      success: true,
      message: "Slack integration updated successfully",
      integration: sanitizeSlackResponse(updated)
    });
  } catch (error: any) {
    console.error("[Slack] Error updating integration:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update Slack integration"
    });
  }
}

/**
 * Controller: Delete Slack Integration
 * DELETE /tenants/:tenantId/integrations/slack
 */
export async function deleteSlackIntegration(
  req: Request, 
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;

  try {
    const slackController = getSlackController();
    const existing = await slackController.findByTenant(tenantId, CommunicationType.SLACK);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "No Slack integration found for this tenant"
      });
    }

    await slackController.hardDelete(existing.id);

    return res.status(200).json({
      success: true,
      message: "Slack integration deleted successfully"
    });
  } catch (error: any) {
    console.error("[Slack] Error deleting integration:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete Slack integration"
    });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify Slack bot token by calling auth.test API
 */
async function verifySlackTokenAPI(
  botToken: string
): Promise<{
  isValid: boolean;
  message: string;
  workspaceId?: string;
  workspaceName?: string;
  botUserId?: string;
  details?: any;
}> {
  try {
    const response = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

    const data: any = await response.json();

    if (!data.ok) {
      return {
        isValid: false,
        message: `Invalid Slack token: ${data.error || 'Unknown error'}`,
        details: { error: data.error }
      };
    }

    return {
      isValid: true,
      message: 'Slack token verified successfully',
      workspaceId: data.team_id,
      workspaceName: data.team,
      botUserId: data.user_id,
      details: {
        url: data.url,
        team: data.team,
        user: data.user,
        teamId: data.team_id,
        userId: data.user_id,
        botId: data.bot_id
      }
    };
  } catch (error: any) {
    console.error('[Slack] Verification error:', error);
    return {
      isValid: false,
      message: `Connection failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * Fetch Slack channels using conversations.list API
 */
async function fetchSlackChannelsAPI(
  botToken: string
): Promise<{
  success: boolean;
  message?: string;
  channels?: SlackChannel[];
  metadata?: {
    total: number;
  };
}> {
  try {
    const allChannels: SlackChannel[] = [];
    let cursor: string | undefined = undefined;
    let hasMore = true;

    // Paginate through all channels
    while (hasMore) {
      const url = new URL('https://slack.com/api/conversations.list');
      url.searchParams.append('types', 'public_channel,private_channel');
      url.searchParams.append('limit', '200');
      if (cursor) {
        url.searchParams.append('cursor', cursor);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json; charset=utf-8'
        }
      });

      const data: any = await response.json();

      if (!data.ok) {
        return {
          success: false,
          message: `Failed to fetch channels: ${data.error || 'Unknown error'}`
        };
      }

      // Map channels to our format
      const channels = data.channels.map((ch: any) => ({
        id: ch.id,
        name: ch.name
      }));

      allChannels.push(...channels);

      // Check if there are more channels
      cursor = data.response_metadata?.next_cursor;
      hasMore = !!cursor;
    }

    return {
      success: true,
      channels: allChannels,
      metadata: {
        total: allChannels.length
      }
    };
  } catch (error: any) {
    console.error('[Slack] Channels fetch error:', error);
    return {
      success: false,
      message: `Failed to fetch channels: ${error.message}`
    };
  }
}

/**
 * Remove sensitive fields from Slack integration response
 */
function sanitizeSlackResponse(integration: any): SafeSlackIntegration {
  const { slackBotToken, ...safe } = integration;
  // Return all fields except the sensitive token
  return safe;
}

// ============================================================================
// CHANNEL CONFIGURATION CONTROLLERS
// ============================================================================

/**
 * Controller: Create Channel Configuration
 * POST /tenants/:tenantId/integrations/slack/channel-config
 * 
 * Body: {
 *   channelData: {
 *     "development": ["C111", "C222"],
 *     "production": ["C333"]
 *   }
 * }
 * 
 * Note: ID is autogenerated (UUID)
 */
export async function createChannelConfig(
  req: Request,
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;
  const { channelData } = req.body;

  // Validation
  if (!channelData || typeof channelData !== 'object') {
    return res.status(400).json({
      success: false,
      error: "'channelData' is required and must be an object"
    });
  }

  try {
    const slackController = getSlackController();
    const channelController = getChannelController();

    // Get the integration for this tenant
    const integration = await slackController.findByTenant(tenantId, CommunicationType.SLACK);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: "No Slack integration found for this tenant"
      });
    }

    // Generate unique ID (short, URL-safe)
    const id = nanoid();

    // Create the channel configuration
    const channelConfig = await channelController.create(
      id,
      integration.id,
      tenantId,
      channelData
    );

    return res.status(201).json({
      success: true,
      channelConfig
    });
  } catch (error: any) {
    console.error("[Slack] Error creating channel config:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create channel configuration"
    });
  }
}

/**
 * POST /tenants/:tenantId/integrations/slack/channel-config/get
 * Get channel configuration by ID
 * 
 * Request body:
 * {
 *   "id": "abc123..."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "channelConfig": {
 *     "id": "abc123...",
 *     "integrationId": "slack-int-123",
 *     "tenantId": "tenant-uuid",
 *     "channelData": {
 *       "development": ["C111", "C222"],
 *       "production": ["C333"]
 *     },
 *     "createdAt": "2025-01-01T00:00:00.000Z",
 *     "updatedAt": "2025-01-01T00:00:00.000Z"
 *   }
 * }
 */
export async function getChannelConfig(
  req: Request,
  res: Response
): Promise<any> {
  const { id: configId } = req.body;

  // Validation
  if (!configId) {
    return res.status(400).json({
      success: false,
      error: "'id' is required in request body"
    });
  }

  try {
    const channelController = getChannelController();

    // Fetch channel configuration by ID
    const channelConfig = await channelController.findById(configId);

    if (!channelConfig) {
      return res.status(404).json({
        success: false,
        error: "Channel configuration not found"
      });
    }

    return res.status(200).json({
      success: true,
      channelConfig
    });
  } catch (error: any) {
    console.error(`[Slack] Error fetching channel config ${configId}:`, error);
    return res.status(500).json({
      success: false,
      error: error.message ?? "Failed to fetch channel configuration"
    });
  }
}

/**
 * POST /tenants/:tenantId/integrations/slack/channel-config/delete
 * Delete channel configuration by ID
 * 
 * Request body:
 * {
 *   "id": "abc123..."
 * }
 * 
 * Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Channel configuration deleted successfully"
 * }
 * 
 * Response (404 Not Found):
 * {
 *   "success": false,
 *   "error": "Channel configuration not found"
 * }
 */
export async function deleteChannelConfig(
  req: Request,
  res: Response
): Promise<any> {
  const { id: configId } = req.body;

  // Validation
  if (!configId) {
    return res.status(400).json({
      success: false,
      error: "'id' is required in request body"
    });
  }

  try {
    const channelController = getChannelController();

    // Delete channel configuration by ID
    const deleted = await channelController.delete(configId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Channel configuration not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Channel configuration deleted successfully"
    });
  } catch (error: any) {
    console.error(`[Slack] Error deleting channel config ${configId}:`, error);
    return res.status(500).json({
      success: false,
      error: error.message ?? "Failed to delete channel configuration"
    });
  }
}

/**
 * POST /tenants/:tenantId/integrations/slack/channel-config/update
 * Update channel configuration - add or remove channels from a specific stage
 * 
 * Request body:
 * {
 *   "id": "abc123...",
 *   "stage": "development",
 *   "action": "add",  // or "remove"
 *   "channels": ["C111", "C222"]
 * }
 * 
 * Response (200 OK):
 * {
 *   "success": true,
 *   "channelConfig": {
 *     "id": "abc123...",
 *     "integrationId": "slack-int-123",
 *     "tenantId": "tenant-uuid",
 *     "channelData": {
 *       "development": ["C111", "C222", "C333"],
 *       "production": ["C444"]
 *     },
 *     "createdAt": "2025-01-01T00:00:00.000Z",
 *     "updatedAt": "2025-01-01T00:00:00.000Z"
 *   }
 * }
 */
export async function updateChannelConfig(
  req: Request,
  res: Response
): Promise<any> {
  const { id: configId, stage, action, channels } = req.body;

  // Validation
  if (!configId) {
    return res.status(400).json({
      success: false,
      error: "'id' is required in request body"
    });
  }

  if (!stage || typeof stage !== 'string') {
    return res.status(400).json({
      success: false,
      error: "'stage' is required and must be a string"
    });
  }

  if (!action || (action !== 'add' && action !== 'remove')) {
    return res.status(400).json({
      success: false,
      error: "'action' must be either 'add' or 'remove'"
    });
  }

  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    return res.status(400).json({
      success: false,
      error: "'channels' must be a non-empty array of channel IDs"
    });
  }

  try {
    const channelController = getChannelController();

    // Update stage channels (add or remove)
    const updatedConfig = await channelController.updateStageChannels(
      configId,
      stage,
      action,
      channels
    );

    if (!updatedConfig) {
      return res.status(404).json({
        success: false,
        error: "Channel configuration not found"
      });
    }

    return res.status(200).json({
      success: true,
      channelConfig: updatedConfig
    });
  } catch (error: any) {
    console.error(`[Slack] Error updating channel config ${configId}:`, error);
    return res.status(500).json({
      success: false,
      error: error.message ?? "Failed to update channel configuration"
    });
  }
}

/**
 * Helper to get Channel controller from storage singleton
 */
const getChannelController = () => {
  const storage = getStorage();
  return (storage as any).channelController;
};

