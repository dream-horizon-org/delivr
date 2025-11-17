/**
 * Slack Integration Service
 * Handles all Slack integration API calls from the web panel
 */

import { IntegrationService } from './base-integration';

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

export interface FetchSlackChannelsRequest {
  tenantId: string;
  botToken: string;
  userId: string;
}

export interface FetchSlackChannelsResponse {
  success: boolean;
  channels: SlackChannel[];
  message?: string;
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
    this.logRequest('POST', `/tenants/${data.tenantId}/integrations/slack/verify`);
    
    try {
      const result = await this.post<VerifySlackResponse>(
        `/tenants/${data.tenantId}/integrations/slack/verify`,
        { botToken: data.botToken },
        data.userId
      );

      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/slack/verify`, result.success);
      return result;
    } catch (error: any) {
      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/slack/verify`, false);
      
      return {
        success: false,
        verified: false,
        message: error.message || 'Failed to verify Slack token',
        error: error.message
      };
    }
  }

  /**
   * Fetch Slack channels
   */
  async fetchChannels(data: FetchSlackChannelsRequest): Promise<FetchSlackChannelsResponse> {
    try {
      const result = await this.post<FetchSlackChannelsResponse>(
        `/tenants/${data.tenantId}/integrations/slack/channels`,
        { botToken: data.botToken },
        data.userId
      );

      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/slack/channels`, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        channels: [],
        message: error.message || 'Failed to fetch Slack channels'
      };
    }
  }

  /**
   * Create or update Slack integration
   */
  async createOrUpdateIntegration(data: CreateSlackIntegrationRequest): Promise<SlackIntegrationResponse> {
    try {
      const result = await this.post<SlackIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/slack`,
        {
          botToken: data.botToken,
          botUserId: data.botUserId,
          workspaceId: data.workspaceId,
          workspaceName: data.workspaceName,
          channels: data.channels
        },
        data.userId
      );

      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/slack`, result.success);
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
        `/tenants/${tenantId}/integrations/slack`,
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
   * Update Slack integration
   */
  async updateIntegration(data: UpdateSlackIntegrationRequest): Promise<SlackIntegrationResponse> {
    try {
      const result = await this.patch<SlackIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/slack`,
        {
          botToken: data.botToken,
          botUserId: data.botUserId,
          workspaceId: data.workspaceId,
          workspaceName: data.workspaceName,
          channels: data.channels
        },
        data.userId
      );

      this.logResponse('PATCH', `/tenants/${data.tenantId}/integrations/slack`, result.success);
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
        `/tenants/${tenantId}/integrations/slack`,
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

