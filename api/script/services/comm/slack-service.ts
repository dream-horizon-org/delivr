// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { WebClient } from '@slack/web-api';
import fetch from 'node-fetch';
import type {
  CommConfig,
  SendMessageArgs,
  MessageResponse,
  MessageFile,
  ListChannelsResponse,
  Channel,
  VerificationResult,
  HealthCheckResult
} from './comm-types';
import { ICommService } from './comm-service.interface';
import { getStorage } from '../../storage/storage-instance';

/**
 * Slack Service
 * Implements ICommService for Slack platform
 * Provides all Slack API operations for Release Management notifications
 */
export class SlackService implements ICommService {
  private client: WebClient;

  constructor(private commConfig: CommConfig) {
    if (!commConfig.botToken) {
      throw new Error('Slack bot token is required');
    }

    this.client = new WebClient(commConfig.botToken);
  }

  // ============================================================================
  // MESSAGING OPERATIONS - Send Messages & Notifications
  // ============================================================================



  /**
   * Send a plain text message to channels configured for a specific stage
   * Fetches channels based on configId and stageEnum, then sends the message
   * 
   * @param configId - Slack configuration ID (from slack_configuration table)
   * @param stageEnum - Stage name (e.g., "development", "production")
   * @param message - Plain text message to send
   * @param files - Optional: files to attach to the message
   * 
   * @returns Map of channel IDs to their send responses
   */
  async sendSlackMessage(
    configId: string,
    stageEnum: string,
    message: string,
    files?: MessageFile[]
  ): Promise<Map<string, MessageResponse>> {
    const responses = new Map<string, MessageResponse>();
    
    try {
      // Get channel controller from storage
      const storage = getStorage();
      const channelController = (storage as any).channelController;
      
      // Fetch channel configuration by configId
      const channelConfig = await channelController.findById(configId);
      
      if (!channelConfig) {
        console.error(`[ConfigId ${configId}] Channel configuration not found`);
        throw new Error('Channel configuration not found');
      }
      
      // Get channel IDs for the specified stage
      const channelIds: string[] = channelConfig.channelData?.[stageEnum] ?? [];
      
      if (channelIds.length === 0) {
        console.warn(`[ConfigId ${configId}] No channels configured for stage "${stageEnum}"`);
        return responses;
      }

      // Send message to all channels for this stage
      for (const channelId of channelIds) {
        const responseMap = await this.sendBasicMessage({
          channelId,
          text: message,
          files
        });
        
        // Extract single response from map
        const response = responseMap.get(channelId);
        if (response) {
          responses.set(channelId, response);
        }
      }

      const fileInfo = files && files.length > 0 ? ` with ${files.length} file(s)` : '';
      console.log(`[ConfigId ${configId}] Sent message to ${channelIds.length} channel(s) in stage "${stageEnum}"${fileInfo}`);
      return responses;
    } catch (error: any) {
      console.error(`[ConfigId ${configId}] Failed to send message to stage "${stageEnum}":`, error);
      return responses;
    }
  }

  /**
   * Send a basic text message to one or more channels
   * Internal method - use sendSlackMessage or sendSimpleMessage for standard messaging
   * Supports file uploads via files parameter
   */
  async sendBasicMessage({
    channelId,
    text,
    blocks,
    attachments,
    files,
    threadTs
  }: SendMessageArgs): Promise<Map<string, MessageResponse>> {
    const responses = new Map<string, MessageResponse>();
    
    // Normalize channelId to array for uniform processing
    const channelIds = Array.isArray(channelId) ? channelId : [channelId];
    
    // Send to each channel
    for (const currentChannelId of channelIds) {
    try {
      // First, upload files if provided
      let uploadedFiles: Array<{ id: string; name: string; url?: string }> = [];
      
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            // ========================================================================
            // SLACK 3-STEP FILE UPLOAD PROCESS (2025+)
            // ========================================================================
            
            // Step 1: Get upload URL using Slack's new external upload API
              // Note: Slack API requires form-urlencoded data for this endpoint
            const formData = new URLSearchParams();
            formData.append('filename', file.filename);
            formData.append('length', file.buffer.length.toString());

            const getUploadUrlResponse = await fetch('https://slack.com/api/files.getUploadURLExternal', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${this.commConfig.botToken}`,
                  'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: formData
            });

            const uploadUrlResult: any = await getUploadUrlResponse.json();

            if (!uploadUrlResult.ok || !uploadUrlResult.upload_url || !uploadUrlResult.file_id) {
                console.error(`[Slack] Step 1 failed:`, uploadUrlResult);
              throw new Error(`Failed to get upload URL: ${uploadUrlResult.error || 'Unknown error'}`);
            }

            const { upload_url, file_id } = uploadUrlResult;

              // Step 2: Upload file to the presigned URL using POST (per Slack API docs)
            // Use appropriate content type based on file extension
            const contentType = file.contentType || 
              (file.filename.endsWith('.txt') ? 'text/plain' : 
               file.filename.endsWith('.json') ? 'application/json' :
               file.filename.endsWith('.pdf') ? 'application/pdf' :
               'application/octet-stream');
            
              // Explicitly set Content-Length header - required for proper file upload
              // According to Slack API docs, use POST method for upload step
            const uploadResponse = await fetch(upload_url, {
                method: 'POST',
              body: file.buffer,
              headers: {
                  'Content-Type': contentType,
                  'Content-Length': file.buffer.length.toString()
              }
            });

              // 200 OK is expected for successful uploads (POST method)
              // 302 redirect may also occur, both indicate success
              if (!uploadResponse.ok && uploadResponse.status !== 302) {
                const errorText = await uploadResponse.text().catch(() => 'Unable to read error response');
                console.error(`[Slack] Step 2 failed: Status ${uploadResponse.status}, Response:`, errorText);
              throw new Error(`Failed to upload file to presigned URL: ${uploadResponse.status} ${uploadResponse.statusText}`);
            }

            // Step 3: Complete the upload and post to channel
            // The initial_comment will create a message in the channel with the file attached
            const completePayload: any = {
              files: [{
                id: file_id,
                title: file.title || file.filename
              }],
                channel_id: currentChannelId,
              initial_comment: file.initialComment || text || `File: ${file.filename}`
            };

            if (threadTs) {
              completePayload.thread_ts = threadTs;
            }

            const completeResponse = await fetch('https://slack.com/api/files.completeUploadExternal', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.commConfig.botToken}`,
                'Content-Type': 'application/json; charset=utf-8'
              },
              body: JSON.stringify(completePayload)
            });

            const completeResult: any = await completeResponse.json();

              if (!completeResult.ok) {
                console.error(`[Slack] Step 3 failed:`, completeResult);
              }

            if (completeResult.ok && completeResult.files && completeResult.files.length > 0) {
              const uploadedFile = completeResult.files[0];
              
              uploadedFiles.push({
                id: uploadedFile.id || file_id,
                name: file.filename,
                url: uploadedFile.permalink || uploadedFile.url_private
              });
              
                // files.completeUploadExternal with initial_comment already posts the message
                // No additional message needed - the file is automatically shared to the channel
            } else {
              throw new Error(`Failed to complete upload: ${completeResult.error || 'Unknown error'}`);
            }
          } catch (fileError: any) {
              console.error(`[Slack] Failed to upload file ${file.filename}:`, {
                error: fileError.message,
                stack: fileError.stack,
                filename: file.filename,
                fileSize: file.buffer.length,
                channelId: currentChannelId
              });
            // Continue with message even if file upload fails
          }
        }
      }

        // Only send a separate message if no files were uploaded
        // (files.completeUploadExternal already creates a message with the file)
        if (uploadedFiles.length === 0) {
      const result = await this.client.chat.postMessage({
            channel: currentChannelId,
        text,
        blocks,
        attachments: attachments as any,
        thread_ts: threadTs,
        unfurl_links: false,
        unfurl_media: false
      });

          responses.set(currentChannelId, {
        ok: result.ok,
        channel: result.channel!,
        ts: result.ts!,
            message: result.message
          });
        } else {
          // File was uploaded successfully with message
          // Return success response with file info
          responses.set(currentChannelId, {
            ok: true,
            channel: currentChannelId,
            ts: '', // Timestamp from completeUploadExternal is not easily accessible
            file: uploadedFiles[0]
      });
    }
      } catch (error: any) {
        console.error(`Failed to send message to channel ${currentChannelId}:`, error);
        responses.set(currentChannelId, {
          ok: false,
          channel: currentChannelId,
          ts: '',
          error: error.message
        });
      }
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
   * Get the timestamp of the last message in a channel
   * Used for auto-threading to the most recent message
   */
  async getLastMessageTs(channelId: string): Promise<string | undefined> {
    try {
      const result = await this.client.conversations.history({
        channel: channelId,
        limit: 1,
        inclusive: true
      });

      if (result.messages && result.messages.length > 0) {
        return result.messages[0].ts;
      }

      return undefined;
    } catch (error: any) {
      console.error(`[Slack] Failed to get last message in channel ${channelId}:`, error.message);
      return undefined;
    }
  }
}


