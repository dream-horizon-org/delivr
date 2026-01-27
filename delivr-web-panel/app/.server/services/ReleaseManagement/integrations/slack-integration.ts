/**
 * Slack Integration Service
 * Handles all Slack integration API calls from the web panel
 */

import { IntegrationService } from './base-integration';
import { COMMUNICATION } from './api-routes';

// ============================================================================
// Types
// ============================================================================

export interface SlackChannel {
  id: string;
  name: string;
}

export interface VerifySlackRequest {
  appId: string;
  botToken: string;
  userId: string;
  _encrypted?: boolean; // Flag to indicate botToken is encrypted
}

export interface VerifySlackResponse {
  success: boolean;
  verified: boolean;
  message: string;
  workspaceId?: string;
  workspaceName?: string;
  botUserId?: string;
  error?: string;
}

export interface FetchSlackChannelsResponse {
  success: boolean;
  data:{
    channels: SlackChannel[];
  }
  
  message?: string;
  error?: string;
}

export interface CreateSlackIntegrationRequest {
  appId: string;
  botToken: string;
  botUserId?: string;
  workspaceId?: string;
  workspaceName?: string;
  channels: SlackChannel[];
  userId: string;
  _encrypted?: boolean; // Flag to indicate botToken is encrypted
}

export interface UpdateSlackIntegrationRequest {
  appId: string;
  botToken?: string;
  botUserId?: string;
  workspaceId?: string;
  workspaceName?: string;
  channels?: SlackChannel[];
  userId: string;
  _encrypted?: boolean; // Flag to indicate botToken is encrypted
}

export interface SlackIntegration {
  id: string;
  appId: string;
  communicationType: 'SLACK' | 'TEAMS' | 'DISCORD';
  slackBotUserId: string | null;
  slackWorkspaceId: string | null;
  slackWorkspaceName: string | null;
  slackChannels: SlackChannel[] | null;
  verificationStatus: 'PENDING' | 'VALID' | 'INVALID';
  hasValidToken: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SlackIntegrationResponse {
  success: boolean;
  integration?: SlackIntegration;
  error?: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class SlackIntegrationServiceClass extends IntegrationService {
  /**
   * Verify Slack bot token
   */
  async verifySlack(data: VerifySlackRequest): Promise<VerifySlackResponse> {
    const endpoint = COMMUNICATION.slack.verify(data.appId);
    this.logRequest('POST', endpoint, { _encrypted: data._encrypted });
    
    try {
      const result = await this.post<VerifySlackResponse>(
        endpoint,
        { 
          botToken: data.botToken,
          _encrypted: data._encrypted, // Forward encryption flag
        },
        data.userId
      );

      this.logResponse('POST', endpoint, result.success);
      return result;
    } catch (error: any) {
      this.logResponse('POST', endpoint, false);
      
      return {
        success: false,
        verified: false,
        message: error.message || 'Failed to verify Slack token',
        error: error.message
      };
    }
  }

  /**
   * Create or update Slack integration
   */
  async createOrUpdateIntegration(data: CreateSlackIntegrationRequest): Promise<SlackIntegrationResponse> {
    try {
      const endpoint = COMMUNICATION.slack.create(data.appId);
      const result = await this.post<SlackIntegrationResponse>(
        endpoint,
        {
          botToken: data.botToken,
          botUserId: data.botUserId,
          workspaceId: data.workspaceId,
          workspaceName: data.workspaceName,
          channels: data.channels,
          _encrypted: data._encrypted, // Forward encryption flag
        },
        data.userId
      );

      this.logResponse('POST', endpoint, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save Slack integration'
      };
    }
  }

  /**
   * Get Slack integration for tenant
   */
  async getIntegration(appId: string, userId: string): Promise<SlackIntegrationResponse> {
    try {
      return await this.get<SlackIntegrationResponse>(
        COMMUNICATION.slack.get(appId),
        userId
      );
    } catch (error: any) {
      if ((error as any).status === 404) {
        return {
          success: false,
          error: 'No Slack integration found'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to get Slack integration'
      };
    }
  }

  /**
   * Fetch ALL Slack channels (live from Slack API using stored token)
   * Can use either appId (legacy) or integrationId (new)
   */
  async fetchChannelsForIntegration(
    appId: string, 
    userId: string, 
    integrationId?: string
  ): Promise<FetchSlackChannelsResponse> {
    try {
      // If integrationId is provided, use the new endpoint
      if (integrationId) {
        return await this.get<FetchSlackChannelsResponse>(
          COMMUNICATION.slack.getChannelsByIntegrationId(appId, integrationId),
          userId
        );
      }
      
      // Otherwise, use the legacy endpoint (requires botToken in body, which we don't have)
      // This will likely fail, but keeping for backward compatibility
      return await this.get<FetchSlackChannelsResponse>(
        COMMUNICATION.slack.getChannels(appId),
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        data: {
          channels: [],
        },
        error: error.message || 'Failed to fetch Slack channels'
      };
    }
  }

  /**
   * Update Slack integration
   */
  async updateIntegration(data: UpdateSlackIntegrationRequest): Promise<SlackIntegrationResponse> {
    try {
      const endpoint = COMMUNICATION.slack.update(data.appId);
      const result = await this.patch<SlackIntegrationResponse>(
        endpoint,
        {
          botToken: data.botToken,
          botUserId: data.botUserId,
          workspaceId: data.workspaceId,
          workspaceName: data.workspaceName,
          channels: data.channels,
          _encrypted: data._encrypted, // Forward encryption flag
        },
        data.userId
      );

      this.logResponse('PATCH', endpoint, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update Slack integration'
      };
    }
  }

  /**
   * Delete Slack integration
   */
  async deleteIntegration(appId: string, userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await this.delete<{ success: boolean; message?: string }>(
        COMMUNICATION.slack.delete(appId),
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete Slack integration'
      };
    }
  }
}

// Export singleton instance
export const SlackIntegrationService = new SlackIntegrationServiceClass();

