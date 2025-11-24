// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { WebClient } from '@slack/web-api';
import type {
  CommConfig,
  SendMessageArgs,
  MessageResponse,
  MessageFile,
  ListChannelsResponse,
  Channel,
  VerificationResult,
  HealthCheckResult
} from '../../comm-types';
import { ICommService } from '../provider.interface';
import { getStorage } from '../../../../../storage/storage-instance';
import { buildSlackMessage, downloadFileFromUrl } from '../../messaging/messaging.utils';
import { Task, Platform, ChannelBucket, BUCKET_TASK_MAPPING } from '../../messaging/messaging.interface';

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
   * Send a templated message to appropriate channels based on task
   * Automatically maps task to buckets and sends to configured channels
   * 
   * @param configId - Configuration ID (from respective integration table)
   * @param task - Message template task type (e.g., Task.REGRESSION_BUILDS)
   * @param parameters - Array of values to replace placeholders {0}, {1}, {2}...
   * @param fileUrl - Optional: URL of file to download and attach to the message
   * @param platform - Optional: platform for platform-specific templates (e.g., Platform.IOS)
   * 
   * @returns Map of channel IDs to their send responses
   */
  async sendMessage(
    configId: string,
    task: Task,
    parameters: string[],
    fileUrl?: string,
    platform?: Platform
  ): Promise<Map<string, MessageResponse>> {
    const responses = new Map<string, MessageResponse>();
    
    try {
      // Download file if URL provided
      const files = fileUrl ? await downloadFileFromUrl(fileUrl) : undefined;

      // Build message from template
      const message = buildSlackMessage(task, parameters, platform);
      
      if (!message) {
        const platformInfo = platform ? ` and platform "${platform}"` : '';
        console.error(`[ConfigId ${configId}] Failed to build message for task "${task}"${platformInfo}`);
        throw new Error(`Failed to build message for task "${task}"${platformInfo}`);
      }

      // Get channel controller from storage
      const storage = getStorage();
      const channelController = (storage as any).channelController;
      
      // Fetch channel configuration by configId
      const channelConfig = await channelController.findById(configId);
      
      if (!channelConfig) {
        console.error(`[ConfigId ${configId}] Channel configuration not found`);
        throw new Error('Channel configuration not found');
      }
      
      // Find all buckets that handle this task
      const relevantBuckets: ChannelBucket[] = [];
      for (const [bucket, tasks] of Object.entries(BUCKET_TASK_MAPPING)) {
        if (tasks.includes(task)) {
          relevantBuckets.push(bucket as ChannelBucket);
        }
      }
      
      if (relevantBuckets.length === 0) {
        console.warn(`[ConfigId ${configId}] No buckets configured for task "${task}"`);
        return responses;
      }

      // Collect all unique channel IDs from relevant buckets
      const channelIds = new Set<string>();
      const channels = channelConfig.channelData?.channels ?? {};
      
      for (const bucket of relevantBuckets) {
        // Use bucket name directly (singular form: 'release', 'build', 'regression', 'critical')
        const bucketChannels = channels[bucket] ?? [];
        
        // Handle both array of strings and array of objects with id property
        bucketChannels.forEach((channel: any) => {
          const channelId = typeof channel === 'string' ? channel : channel.id;
          if (channelId) {
            channelIds.add(channelId);
          }
        });
      }

      if (channelIds.size === 0) {
        console.warn(`[ConfigId ${configId}] No channels configured for buckets [${relevantBuckets.join(', ')}]`);
        return responses;
      }

      // Send message to all unique channels
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

      // Count actual successes
      const successCount = Array.from(responses.values()).filter(r => r.ok === true).length;
      const fileInfo = files && files.length > 0 ? ` with ${files.length} file(s)` : '';
      const bucketsInfo = relevantBuckets.join(', ');
      
      if (successCount === channelIds.size) {
        console.log(`[ConfigId ${configId}] Sent message for task "${task}" to ${channelIds.size} channel(s) in buckets [${bucketsInfo}]${fileInfo}`);
      } else {
        console.warn(`[ConfigId ${configId}] Sent message for task "${task}" to ${successCount}/${channelIds.size} channel(s) in buckets [${bucketsInfo}]${fileInfo}`);
      }
      
      return responses;
    } catch (error: any) {
      console.error(`[ConfigId ${configId}] Failed to send message for task "${task}":`, error);
      throw error; // Propagate error to caller instead of returning empty responses
    }
  }

  /**
   * Send a basic text message to one or more channels
   * Internal method - use sendSlackMessage for standard messaging
   * Supports file uploads via files parameter
   */
  async sendBasicMessage({
    channelId,
    text,
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
              // Convert Buffer to Uint8Array for node-fetch compatibility
            const uploadResponse = await fetch(upload_url, {
                method: 'POST',
              body: new Uint8Array(file.buffer),
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
}


