import fetch from 'node-fetch';
import type { SlackChannel } from '../../../../../storage/integrations/comm/slack-types';

/**
 * Slack API Service
 * Handles ALL external Slack API communications
 * This is the ONLY place that makes HTTP calls to Slack
 */

export type SlackVerificationResult = {
  isValid: boolean;
  message: string;
  workspaceId?: string;
  workspaceName?: string;
  botUserId?: string;
  details?: any;
};

export type SlackChannelsResult = {
  success: boolean;
  channels: SlackChannel[];
  message: string;
  metadata?: {
    total: number;
    hasMore?: boolean;
  };
};

export type SlackMessageResponse = {
  ok: boolean;
  channel?: string;
  ts?: string;
  message?: any;
  error?: string;
};

export class SlackApiService {
  /**
   * Verify Slack bot token using auth.test API
   */
  async verifyToken(botToken: string): Promise<SlackVerificationResult> {
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
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
      console.error('[SlackApiService] Token verification error:', error);
      return {
        isValid: false,
        message: `Connection failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Fetch all Slack channels using conversations.list API
   */
  async fetchChannels(botToken: string): Promise<SlackChannelsResult> {
    try {
      const response = await fetch('https://slack.com/api/conversations.list', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json; charset=utf-8'
        }
      });

      const data: any = await response.json();

      if (!data.ok) {
        return {
          success: false,
          channels: [],
          message: `Failed to fetch channels: ${data.error || 'Unknown error'}`,
          metadata: { total: 0 }
        };
      }

      const channels: SlackChannel[] = (data.channels || [])
        .filter((channel: any) => !channel.is_archived)
        .map((channel: any) => ({
          id: channel.id,
          name: channel.name
        }));

      return {
        success: true,
        channels,
        message: 'Channels fetched successfully',
        metadata: {
          total: channels.length,
          hasMore: data.response_metadata?.next_cursor ? true : false
        }
      };
    } catch (error: any) {
      console.error('[SlackApiService] Fetch channels error:', error);
      return {
        success: false,
        channels: [],
        message: `Connection failed: ${error.message}`,
        metadata: { total: 0 }
      };
    }
  }

  /**
   * Post a message to a Slack channel
   */
  async postMessage(
    botToken: string,
    channelId: string,
    text: string,
    options?: {
      blocks?: any[];
      attachments?: any[];
      threadTs?: string;
    }
  ): Promise<SlackMessageResponse> {
    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          channel: channelId,
          text,
          blocks: options?.blocks,
          attachments: options?.attachments,
          thread_ts: options?.threadTs,
          unfurl_links: false,
          unfurl_media: false
        })
      });

      const data: any = await response.json();

      if (!data.ok) {
        return {
          ok: false,
          error: data.error || 'Unknown error'
        };
      }

      return {
        ok: true,
        channel: data.channel,
        ts: data.ts,
        message: data.message
      };
    } catch (error: any) {
      console.error('[SlackApiService] Post message error:', error);
      return {
        ok: false,
        error: error.message
      };
    }
  }

  /**
   * Upload a file to Slack (3-step process)
   */
  async uploadFile(
    botToken: string,
    channelId: string,
    fileBuffer: Buffer,
    filename: string,
    options?: {
      title?: string;
      initialComment?: string;
      threadTs?: string;
    }
  ): Promise<SlackMessageResponse> {
    try {
      // Step 1: Get upload URL
      const formData = new URLSearchParams();
      formData.append('filename', filename);
      formData.append('length', fileBuffer.length.toString());

      const uploadUrlResponse = await fetch('https://slack.com/api/files.getUploadURLExternal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      const uploadUrlResult: any = await uploadUrlResponse.json();

      if (!uploadUrlResult.ok || !uploadUrlResult.upload_url || !uploadUrlResult.file_id) {
        return {
          ok: false,
          error: uploadUrlResult.error || 'Failed to get upload URL'
        };
      }

      const { upload_url, file_id } = uploadUrlResult;

      // Step 2: Upload file to presigned URL
      const contentType = filename.endsWith('.txt') ? 'text/plain' :
                         filename.endsWith('.json') ? 'application/json' :
                         filename.endsWith('.pdf') ? 'application/pdf' :
                         'application/octet-stream';

      const uploadResponse = await fetch(upload_url, {
        method: 'POST',
        body: fileBuffer,
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length.toString()
        }
      });

      if (!uploadResponse.ok && uploadResponse.status !== 302) {
        return {
          ok: false,
          error: `Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`
        };
      }

      // Step 3: Complete upload and share to channel
      const completePayload: any = {
        files: [{
          id: file_id,
          title: options?.title || filename
        }],
        channel_id: channelId,
        initial_comment: options?.initialComment || `File: ${filename}`
      };

      if (options?.threadTs) {
        completePayload.thread_ts = options.threadTs;
      }

      const completeResponse = await fetch('https://slack.com/api/files.completeUploadExternal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(completePayload)
      });

      const completeResult: any = await completeResponse.json();

      if (!completeResult.ok) {
        return {
          ok: false,
          error: completeResult.error || 'Failed to complete upload'
        };
      }

      return {
        ok: true,
        channel: channelId,
        ts: '', // File upload doesn't return ts easily
        message: completeResult.files?.[0]
      };
    } catch (error: any) {
      console.error('[SlackApiService] Upload file error:', error);
      return {
        ok: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const slackApiService = new SlackApiService();

