import { Router, Request, Response } from "express";
import { Storage } from "../storage/storage";
import * as tenantPermissions from "../middleware/tenant-permissions";
import { SlackIntegrationController } from "../storage/integrations/slack/slack-controller";
import { 
  CommunicationType, 
  VerificationStatus, 
  CreateSlackIntegrationDto, 
  UpdateSlackIntegrationDto,
  SafeSlackIntegration,
  SlackChannel
} from "../storage/integrations/slack/slack-types";
import fetch from "node-fetch";

export function createSlackIntegrationRoutes(storage: Storage): Router {
  const router = Router();
  
  // Helper to get Slack controller from storage
  const getSlackController = (): SlackIntegrationController => {
    return (storage as any).slackController;
  };

  // ============================================================================
  // VERIFY Slack Bot Token
  // ============================================================================
  router.post(
    "/tenants/:tenantId/integrations/slack/verify",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
      const tenantId: string = req.params.tenantId;
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
        const verificationResult = await verifySlackToken(botToken);

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
        console.error("Error verifying Slack token:", error);
        return res.status(200).json({
          success: false,
          verified: false,
          message: error.message || "Failed to verify Slack token",
          error: error.message
        });
      }
    }
  );

  // ============================================================================
  // FETCH Slack Channels
  // ============================================================================
  router.post(
    "/tenants/:tenantId/integrations/slack/channels",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
      const tenantId: string = req.params.tenantId;
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
        const channelsResult = await fetchSlackChannels(botToken);

        return res.status(200).json({
          success: channelsResult.success,
          channels: channelsResult.channels || [],
          message: channelsResult.message,
          metadata: channelsResult.metadata
        });
      } catch (error: any) {
        console.error("Error fetching Slack channels:", error);
        return res.status(500).json({
          success: false,
          error: error.message || "Failed to fetch Slack channels"
        });
      }
    }
  );

  // ============================================================================
  // CREATE or UPDATE Slack Integration
  // ============================================================================
  router.post(
    "/tenants/:tenantId/integrations/slack",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
      const tenantId: string = req.params.tenantId;
      const { 
        botToken,
        botUserId,
        workspaceId,
        workspaceName,
        channels
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
            slackChannels: channels,
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
            slackWorkspaceName: workspaceName,
            slackChannels: channels
          };

          const created = await slackController.create(createData);
          
          return res.status(201).json({
            success: true,
            message: "Slack integration created successfully",
            integration: sanitizeSlackResponse(created)
          });
        }
      } catch (error: any) {
        console.error("Error saving Slack integration:", error);
        return res.status(500).json({
          success: false,
          error: error.message || "Failed to save Slack integration"
        });
      }
    }
  );

  // ============================================================================
  // GET Slack Integration for Tenant
  // ============================================================================
  router.get(
    "/tenants/:tenantId/integrations/slack",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
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
        console.error("Error fetching Slack integration:", error);
        return res.status(500).json({
          success: false,
          error: error.message || "Failed to fetch Slack integration"
        });
      }
    }
  );

  // ============================================================================
  // UPDATE Slack Integration
  // ============================================================================
  router.patch(
    "/tenants/:tenantId/integrations/slack",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
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
          const verificationResult = await verifySlackToken(updateData.botToken);
          
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
        console.error("Error updating Slack integration:", error);
        return res.status(500).json({
          success: false,
          error: error.message || "Failed to update Slack integration"
        });
      }
    }
  );

  // ============================================================================
  // DELETE Slack Integration
  // ============================================================================
  router.delete(
    "/tenants/:tenantId/integrations/slack",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
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
        console.error("Error deleting Slack integration:", error);
        return res.status(500).json({
          success: false,
          error: error.message || "Failed to delete Slack integration"
        });
      }
    }
  );

  return router;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify Slack bot token by calling auth.test API
 */
async function verifySlackToken(
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
    console.error('Slack verification error:', error);
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
async function fetchSlackChannels(
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
    console.error('Slack channels fetch error:', error);
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
  return {
    ...safe,
    // Return masked version of sensitive field
    hasValidToken: !!slackBotToken
  };
}

