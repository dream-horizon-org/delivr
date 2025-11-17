// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { WebClient } from '@slack/web-api';
import type {
  CommConfig,
  SendMessageArgs,
  MessageResponse,
  ReleaseNotificationArgs,
  BuildNotificationArgs,
  DeploymentNotificationArgs,
  ListChannelsResponse,
  Channel,
  VerificationResult,
  HealthCheckResult,
  MessageAttachment,
  NotificationType
} from './comm-types';
import { MessageTemplate, buildSlackMessage } from './templates';
import { ICommService } from './comm-service.interface';

/**
 * Slack Service
 * Implements ICommService for Slack platform
 * Provides all Slack API operations for Release Management notifications
 */
export class SlackService implements ICommService {
  private client: WebClient;
  private config: {
    workspaceId?: string;
    channels?: Channel[];
  };

  constructor(private commConfig: CommConfig) {
    if (!commConfig.botToken) {
      throw new Error('Slack bot token is required');
    }

    this.client = new WebClient(commConfig.botToken);

    this.config = {
      workspaceId: commConfig.workspaceId,
      channels: commConfig.channels || []
    };
  }

  // ============================================================================
  // MESSAGING OPERATIONS - Send Messages & Notifications
  // ============================================================================

  /**
   * Send message using predefined template
   * This is the main method for template-based messaging
   * 
   * @param tenantId - Tenant ID (for context/logging)
   * @param templateEnum - Template type from MessageTemplate enum
   * @param templateParameters - Array of parameters to fill template
   * @param sendOnThread - Whether to send as thread (uses first configured channel)
   */
  async sendTemplateMessage(
    tenantId: string,
    templateEnum: MessageTemplate,
    templateParameters: string[],
    sendOnThread: boolean = false
  ): Promise<Map<string, MessageResponse>> {
    const responses = new Map<string, MessageResponse>();
    
    try {
      // Build message from template
      const { text, attachments } = buildSlackMessage(templateEnum, templateParameters);
      
      // Get channels to send to (use configured channels)
      const channels = this.config.channels || [];
      
      if (channels.length === 0) {
        console.warn(`[Tenant ${tenantId}] No channels configured for Slack notifications`);
        return responses;
      }

      // Send to all configured channels
      for (const channel of channels) {
        const response = await this.sendBasicMessage({
          channelId: channel.id,
          text,
          attachments,
          threadTs: sendOnThread ? undefined : undefined // TODO: Implement thread support
        });
        
        responses.set(channel.id, response);
      }

      console.log(`[Tenant ${tenantId}] Sent ${templateEnum} to ${channels.length} channel(s)`);
      return responses;
    } catch (error: any) {
      console.error(`[Tenant ${tenantId}] Failed to send template message:`, error);
      return responses;
    }
  }

  /**
   * Send a basic text message to a channel
   * Internal method - use sendTemplateMessage for standard messaging
   */
  async sendBasicMessage({
    channelId,
    text,
    blocks,
    attachments,
    threadTs,
    priority
  }: SendMessageArgs): Promise<MessageResponse> {
    try {
      const result = await this.client.chat.postMessage({
        channel: channelId,
        text,
        blocks,
        attachments: attachments as any,
        thread_ts: threadTs,
        unfurl_links: false,
        unfurl_media: false
      });

      return {
        ok: result.ok,
        channel: result.channel!,
        ts: result.ts!,
        message: result.message
      };
    } catch (error: any) {
      console.error(`Failed to send message to channel ${channelId}:`, error);
      return {
        ok: false,
        channel: channelId,
        ts: '',
        error: error.message
      };
    }
  }



  // ============================================================================
  // RELEASE NOTIFICATIONS - Formatted release updates
  // ============================================================================

  /**
   * Send release notification to multiple channels
   */
  async sendReleaseNotification({
    releaseName,
    version,
    environment,
    changes,
    url,
    author,
    status = 'created',
    channels
  }: ReleaseNotificationArgs): Promise<Map<string, MessageResponse>> {
    const responses = new Map<string, MessageResponse>();

    // Build formatted message
    const color = this.getStatusColor(status);
    const emoji = this.getStatusEmoji(status);
    
    const attachments: MessageAttachment[] = [{
      color,
      title: `${emoji} Release ${status === 'created' ? 'Created' : status === 'deployed' ? 'Deployed' : 'Failed'}`,
      fields: [
        {
          title: 'Release',
          value: releaseName,
          short: true
        },
        {
          title: 'Version',
          value: version,
          short: true
        }
      ],
      footer: author ? `By ${author}` : undefined,
      timestamp: Math.floor(Date.now() / 1000)
    }];

    if (environment) {
      attachments[0].fields?.push({
        title: 'Environment',
        value: environment,
        short: true
      });
    }

    if (url) {
      attachments[0].fields?.push({
        title: 'Release URL',
        value: `<${url}|View Release>`,
        short: true
      });
    }

    if (changes && changes.length > 0) {
      const changesText = changes.map(c => `• ${c}`).join('\n');
      attachments[0].fields?.push({
        title: 'Changes',
        value: changesText,
        short: false
      });
    }

    // Send to all channels
    for (const channelId of channels) {
      const response = await this.sendBasicMessage({
        channelId,
        text: `${emoji} Release ${releaseName} ${version} ${status}`,
        attachments
      });
      responses.set(channelId, response);
    }

    return responses;
  }

  /**
   * Send build status notification
   */
  async sendBuildNotification({
    buildId,
    status,
    branch,
    commit,
    duration,
    url,
    error,
    channels
  }: BuildNotificationArgs): Promise<Map<string, MessageResponse>> {
    const responses = new Map<string, MessageResponse>();

    const color = status === 'success' ? 'good' : status === 'failed' ? 'danger' : '#808080';
    const emoji = status === 'success' ? '✅' : status === 'failed' ? '❌' : '🔨';

    const attachments: MessageAttachment[] = [{
      color,
      title: `${emoji} Build ${status === 'success' ? 'Succeeded' : status === 'failed' ? 'Failed' : 'Started'}`,
      fields: [
        {
          title: 'Build ID',
          value: buildId,
          short: true
        }
      ],
      timestamp: Math.floor(Date.now() / 1000)
    }];

    if (branch) {
      attachments[0].fields?.push({
        title: 'Branch',
        value: branch,
        short: true
      });
    }

    if (commit) {
      attachments[0].fields?.push({
        title: 'Commit',
        value: commit.substring(0, 7),
        short: true
      });
    }

    if (duration) {
      attachments[0].fields?.push({
        title: 'Duration',
        value: `${Math.floor(duration / 60)}m ${duration % 60}s`,
        short: true
      });
    }

    if (url) {
      attachments[0].fields?.push({
        title: 'Build URL',
        value: `<${url}|View Build>`,
        short: true
      });
    }

    if (error) {
      attachments[0].fields?.push({
        title: 'Error',
        value: error,
        short: false
      });
    }

    for (const channelId of channels) {
      const response = await this.sendBasicMessage({
        channelId,
        text: `${emoji} Build ${buildId} ${status}`,
        attachments
      });
      responses.set(channelId, response);
    }

    return responses;
  }

  /**
   * Send deployment status notification
   */
  async sendDeploymentNotification({
    deploymentId,
    environment,
    status,
    version,
    url,
    error,
    channels
  }: DeploymentNotificationArgs): Promise<Map<string, MessageResponse>> {
    const responses = new Map<string, MessageResponse>();

    const color = status === 'success' ? 'good' : status === 'failed' ? 'danger' : status === 'rollback' ? 'warning' : '#808080';
    const emoji = status === 'success' ? '🚀' : status === 'failed' ? '❌' : status === 'rollback' ? '⏮️' : '⏳';

    const statusText = status === 'success' ? 'Deployed Successfully' : 
                       status === 'failed' ? 'Deployment Failed' : 
                       status === 'rollback' ? 'Rollback Initiated' : 
                       'Deployment Started';

    const attachments: MessageAttachment[] = [{
      color,
      title: `${emoji} ${statusText}`,
      fields: [
        {
          title: 'Environment',
          value: environment,
          short: true
        },
        {
          title: 'Deployment ID',
          value: deploymentId,
          short: true
        }
      ],
      timestamp: Math.floor(Date.now() / 1000)
    }];

    if (version) {
      attachments[0].fields?.push({
        title: 'Version',
        value: version,
        short: true
      });
    }

    if (url) {
      attachments[0].fields?.push({
        title: 'Deployment URL',
        value: `<${url}|View Deployment>`,
        short: true
      });
    }

    if (error) {
      attachments[0].fields?.push({
        title: 'Error',
        value: error,
        short: false
      });
    }

    for (const channelId of channels) {
      const response = await this.sendBasicMessage({
        channelId,
        text: `${emoji} Deployment to ${environment} ${status}`,
        attachments
      });
      responses.set(channelId, response);
    }

    return responses;
  }

  // ============================================================================
  // CHANNEL OPERATIONS - Manage channels
  // ============================================================================

  /**
   * List all channels the bot has access to
   */
  async listChannels(): Promise<ListChannelsResponse> {
    try {
      const channels: Channel[] = [];
      let cursor: string | undefined = undefined;
      let hasMore = true;

      while (hasMore) {
        const result = await this.client.conversations.list({
          types: 'public_channel,private_channel',
          limit: 200,
          cursor
        });

        if (result.channels) {
          result.channels.forEach((ch: any) => {
            channels.push({
              id: ch.id,
              name: ch.name,
              isPrivate: ch.is_private,
              memberCount: ch.num_members
            });
          });
        }

        cursor = result.response_metadata?.next_cursor;
        hasMore = !!cursor;
      }

      return {
        channels,
        total: channels.length
      };
    } catch (error: any) {
      console.error('Failed to list channels:', error);
      return {
        channels: [],
        total: 0
      };
    }
  }

  /**
   * Get channel details
   */
  async getChannel(channelId: string): Promise<Channel | null> {
    try {
      const result = await this.client.conversations.info({
        channel: channelId
      });

      if (result.channel) {
        const ch: any = result.channel;
        return {
          id: ch.id,
          name: ch.name,
          isPrivate: ch.is_private,
          memberCount: ch.num_members
        };
      }

      return null;
    } catch (error: any) {
      console.error(`Failed to get channel ${channelId}:`, error);
      return null;
    }
  }

  // ============================================================================
  // VERIFICATION & HEALTH CHECK
  // ============================================================================

  /**
   * Verify Slack connection and bot token
   */
  async verify(): Promise<VerificationResult> {
    try {
      const result = await this.client.auth.test();

      if (!result.ok) {
        return {
          success: false,
          message: `Verification failed: ${result.error || 'Unknown error'}`,
          error: result.error
        };
      }

      return {
        success: true,
        message: 'Slack connection verified successfully',
        workspaceId: result.team_id,
        workspaceName: result.team,
        botUserId: result.user_id
      };
    } catch (error: any) {
      console.error('Slack verification failed:', error);
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Health check - test if Slack API is responsive
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const result = await this.client.api.test();
      const latency = Date.now() - startTime;

      return {
        healthy: result.ok,
        latency
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get color for status
   */
  private getStatusColor(status: string): string {
    switch (status) {
      case 'created':
      case 'success':
      case 'deployed':
        return 'good'; // Green
      case 'failed':
        return 'danger'; // Red
      case 'started':
      case 'pending':
        return '#808080'; // Gray
      case 'rollback':
        return 'warning'; // Yellow
      default:
        return '#808080';
    }
  }

  /**
   * Get emoji for status
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'created':
        return '🎉';
      case 'deployed':
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'started':
      case 'pending':
        return '⏳';
      case 'rollback':
        return '⏮️';
      default:
        return '📢';
    }
  }

  /**
   * Format mention for user
   */
  formatMention(userId: string): string {
    return `<@${userId}>`;
  }

  /**
   * Format channel mention
   */
  formatChannelMention(channelId: string): string {
    return `<#${channelId}>`;
  }

  /**
   * Format link
   */
  formatLink(url: string, text?: string): string {
    return text ? `<${url}|${text}>` : `<${url}>`;
  }
}


