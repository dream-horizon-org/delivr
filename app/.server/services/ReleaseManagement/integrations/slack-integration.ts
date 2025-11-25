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
  tenantId: string;
  botToken: string;
  userId: string;
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
  tenantId: string;
  botToken: string;
  botUserId?: string;
  workspaceId?: string;
  workspaceName?: string;
  channels: SlackChannel[];
  userId: string;
}

export interface UpdateSlackIntegrationRequest {
  tenantId: string;
  botToken?: string;
  botUserId?: string;
  workspaceId?: string;
  workspaceName?: string;
  channels?: SlackChannel[];
  userId: string;
}

export interface SlackIntegration {
  id: string;
  tenantId: string;
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
    const endpoint = COMMUNICATION.slack.verify(data.tenantId);
    this.logRequest('POST', endpoint);
    
    try {
      const result = await this.post<VerifySlackResponse>(
        endpoint,
        { botToken: data.botToken },
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
      const endpoint = COMMUNICATION.slack.create(data.tenantId);
      const result = await this.post<SlackIntegrationResponse>(
        endpoint,
        {
          botToken: data.botToken,
          botUserId: data.botUserId,
          workspaceId: data.workspaceId,
          workspaceName: data.workspaceName,
          channels: data.channels
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
  async getIntegration(tenantId: string, userId: string): Promise<SlackIntegrationResponse> {
    try {
      return await this.get<SlackIntegrationResponse>(
        COMMUNICATION.slack.get(tenantId),
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
   */
  async fetchChannelsForIntegration(tenantId: string, userId: string): Promise<FetchSlackChannelsResponse> {
    try {
      return await this.get<FetchSlackChannelsResponse>(
        COMMUNICATION.slack.getChannels(tenantId),
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
      const endpoint = COMMUNICATION.slack.update(data.tenantId);
      const result = await this.patch<SlackIntegrationResponse>(
        endpoint,
        {
          botToken: data.botToken,
          botUserId: data.botUserId,
          workspaceId: data.workspaceId,
          workspaceName: data.workspaceName,
          channels: data.channels
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
  async deleteIntegration(tenantId: string, userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await this.delete<{ success: boolean; message?: string }>(
        COMMUNICATION.slack.delete(tenantId),
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

