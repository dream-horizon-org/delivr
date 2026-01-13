// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { WebClient } from '@slack/web-api';
import type {
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
import { buildSlackMessage, downloadFileFromUrl } from './slack.utils';
import { Task, Platform, ChannelBucket, BUCKET_TASK_MAPPING } from '../../messaging/messaging.interface';
import {
  SLACK_API_BASE_URL,
  SLACK_API_ENDPOINTS,
  SLACK_ERROR_MESSAGES,
  SLACK_CONTENT_TYPES,
  SLACK_FILE_EXTENSIONS,
  SLACK_HTTP_STATUS,
  SLACK_LIMITS,
  SLACK_CONVERSATION_TYPES,
  SLACK_HTTP_HEADERS,
  SLACK_AUTH_SCHEMES,
  SLACK_FORM_FIELDS,
  SLACK_RESPONSE_FIELDS,
  SLACK_MESSAGE_OPTIONS
} from './slack.constants';
import type {
  SlackConfig,
  SlackUploadUrlResponse,
  SlackCompleteUploadPayload,
  SlackCompleteUploadResponse,
  SlackUploadedFile
} from './slack.interface';

export class SlackProvider implements ICommService {
  private readonly client: WebClient;

  constructor(private readonly commConfig: SlackConfig) {
    if (!commConfig.botToken) {
      throw new Error(SLACK_ERROR_MESSAGES.TOKEN_REQUIRED);
    }

    this.client = new WebClient(commConfig.botToken);
  }

  // ============================================================================
  // MESSAGING OPERATIONS - Send Messages & Notifications
  // ============================================================================

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
      // Construct filename from version (parameters[0]) and extension from URL
      let fileName: string | undefined;
      if (fileUrl && parameters[0]) {
        const urlWithoutQuery = fileUrl.split('?')[0];
        const extensionMatch = urlWithoutQuery.match(/\.[^.]+$/);
        const extension = extensionMatch ? extensionMatch[0] : '';
        fileName = `${parameters[0]}${extension}`;
      }
      const files = fileUrl ? await downloadFileFromUrl(fileUrl, fileName) : undefined;

      // Build message from template
      const message = buildSlackMessage(task, parameters, platform);
      
      if (!message) {
        const platformInfo = platform ? ` and platform "${platform}"` : '';
        console.error(`[ConfigId ${configId}] ${SLACK_ERROR_MESSAGES.BUILD_MESSAGE_FAILED} "${task}"${platformInfo}`);
        throw new Error(`${SLACK_ERROR_MESSAGES.BUILD_MESSAGE_FAILED} "${task}"${platformInfo}`);
      }

      // Get comm config service from storage
      const storage = getStorage();
      const commConfigService = (storage as any).commConfigService;
      
      if (!commConfigService) {
        console.error(`[ConfigId ${configId}] CommConfigService not available on storage`);
        throw new Error('CommConfigService not available');
      }
      
      // Fetch channel configuration by configId
      const channelConfig = await commConfigService.getConfigById(configId);
      
      if (!channelConfig) {
        console.error(`[ConfigId ${configId}] ${SLACK_ERROR_MESSAGES.CHANNEL_CONFIG_NOT_FOUND}`);
        throw new Error(SLACK_ERROR_MESSAGES.CHANNEL_CONFIG_NOT_FOUND);
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
      const channels = channelConfig.channelData ?? {};
      console.log('[SlackProvider] Channels:', JSON.stringify(channels, null, 2));
      
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
      const uploadedFiles: SlackUploadedFile[] = [];
      
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            // ========================================================================
            // SLACK 3-STEP FILE UPLOAD PROCESS (2025+)
            // ========================================================================
            
            // Step 1: Get upload URL using Slack's new external upload API
            const formData = new URLSearchParams();
            formData.append(SLACK_FORM_FIELDS.FILENAME, file.filename);
            formData.append(SLACK_FORM_FIELDS.LENGTH, file.buffer.length.toString());

            const getUploadUrlResponse = await fetch(`${SLACK_API_BASE_URL}${SLACK_API_ENDPOINTS.FILES_GET_UPLOAD_URL_EXTERNAL}`, {
              method: 'POST',
              headers: {
                [SLACK_HTTP_HEADERS.AUTHORIZATION]: `${SLACK_AUTH_SCHEMES.BEARER} ${this.commConfig.botToken}`,
                [SLACK_HTTP_HEADERS.CONTENT_TYPE]: SLACK_CONTENT_TYPES.FORM_URLENCODED
              },
              body: formData
            });

            const uploadUrlResult: SlackUploadUrlResponse = await getUploadUrlResponse.json();

            if (!uploadUrlResult[SLACK_RESPONSE_FIELDS.OK] || 
                !uploadUrlResult[SLACK_RESPONSE_FIELDS.UPLOAD_URL] || 
                !uploadUrlResult[SLACK_RESPONSE_FIELDS.FILE_ID]) {
              console.error(`[Slack] Step 1 failed:`, uploadUrlResult);
              throw new Error(`${SLACK_ERROR_MESSAGES.UPLOAD_URL_FAILED}: ${uploadUrlResult[SLACK_RESPONSE_FIELDS.ERROR] || SLACK_ERROR_MESSAGES.UNKNOWN_ERROR}`);
            }

            const { upload_url, file_id } = uploadUrlResult;

            // Step 2: Upload file to the presigned URL using POST (per Slack API docs)
            const contentType = file.contentType || 
              (file.filename.endsWith(SLACK_FILE_EXTENSIONS.TXT) ? SLACK_CONTENT_TYPES.TEXT : 
               file.filename.endsWith(SLACK_FILE_EXTENSIONS.JSON) ? SLACK_CONTENT_TYPES.JSON :
               file.filename.endsWith(SLACK_FILE_EXTENSIONS.PDF) ? SLACK_CONTENT_TYPES.PDF :
               SLACK_CONTENT_TYPES.OCTET_STREAM);
            
            const uploadResponse = await fetch(upload_url, {
              method: 'POST',
              body: new Uint8Array(file.buffer),
              headers: {
                [SLACK_HTTP_HEADERS.CONTENT_TYPE]: contentType,
                [SLACK_HTTP_HEADERS.CONTENT_LENGTH]: file.buffer.length.toString()
              }
            });

            // 200 OK is expected for successful uploads (POST method)
            // 302 redirect may also occur, both indicate success
            if (!uploadResponse.ok && uploadResponse.status !== SLACK_HTTP_STATUS.REDIRECT) {
              const errorText = await uploadResponse.text().catch(() => SLACK_ERROR_MESSAGES.UNABLE_TO_READ_ERROR);
              console.error(`[Slack] Step 2 failed: Status ${uploadResponse.status}, Response:`, errorText);
              throw new Error(`${SLACK_ERROR_MESSAGES.FILE_UPLOAD_FAILED}: ${uploadResponse.status} ${uploadResponse.statusText}`);
            }

            // Step 3: Complete the upload and post to channel
            const completePayload: SlackCompleteUploadPayload = {
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

            const completeResponse = await fetch(`${SLACK_API_BASE_URL}${SLACK_API_ENDPOINTS.FILES_COMPLETE_UPLOAD_EXTERNAL}`, {
              method: 'POST',
              headers: {
                [SLACK_HTTP_HEADERS.AUTHORIZATION]: `${SLACK_AUTH_SCHEMES.BEARER} ${this.commConfig.botToken}`,
                [SLACK_HTTP_HEADERS.CONTENT_TYPE]: SLACK_CONTENT_TYPES.JSON_UTF8
              },
              body: JSON.stringify(completePayload)
            });

            const completeResult: SlackCompleteUploadResponse = await completeResponse.json();

            if (!completeResult[SLACK_RESPONSE_FIELDS.OK]) {
              console.error(`[Slack] Step 3 failed:`, completeResult);
            }

            if (completeResult[SLACK_RESPONSE_FIELDS.OK] && 
                completeResult[SLACK_RESPONSE_FIELDS.FILES] && 
                completeResult[SLACK_RESPONSE_FIELDS.FILES].length > 0) {
              const uploadedFile = completeResult[SLACK_RESPONSE_FIELDS.FILES][0];
              
              uploadedFiles.push({
                id: uploadedFile.id || file_id,
                name: file.filename,
                url: uploadedFile.permalink || uploadedFile.url_private
              });
            } else {
              throw new Error(`${SLACK_ERROR_MESSAGES.COMPLETE_UPLOAD_FAILED}: ${completeResult[SLACK_RESPONSE_FIELDS.ERROR] || SLACK_ERROR_MESSAGES.UNKNOWN_ERROR}`);
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
          unfurl_links: SLACK_MESSAGE_OPTIONS.UNFURL_LINKS,
          unfurl_media: SLACK_MESSAGE_OPTIONS.UNFURL_MEDIA
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
      console.error(`${SLACK_ERROR_MESSAGES.SEND_MESSAGE_FAILED} ${currentChannelId}:`, error);
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

  async listChannels(): Promise<ListChannelsResponse> {
    try {
      const channels: Channel[] = [];
      let cursor: string | undefined = undefined;
      let hasMore = true;

      while (hasMore) {
        const result = await this.client.conversations.list({
          types: `${SLACK_CONVERSATION_TYPES.PUBLIC_CHANNEL},${SLACK_CONVERSATION_TYPES.PRIVATE_CHANNEL}`,
          limit: SLACK_LIMITS.CONVERSATIONS_LIST_LIMIT,
          cursor
        });

        if (result[SLACK_RESPONSE_FIELDS.CHANNELS]) {
          result[SLACK_RESPONSE_FIELDS.CHANNELS].forEach((ch: any) => {
            channels.push({
              id: ch.id,
              name: ch.name,
              isPrivate: ch.is_private,
              memberCount: ch.num_members
            });
          });
        }

        cursor = result[SLACK_RESPONSE_FIELDS.RESPONSE_METADATA]?.[SLACK_RESPONSE_FIELDS.NEXT_CURSOR];
        hasMore = !!cursor;
      }

      return {
        channels,
        total: channels.length
      };
    } catch (error: any) {
      console.error(SLACK_ERROR_MESSAGES.LIST_CHANNELS_FAILED, error);
      return {
        channels: [],
        total: 0
      };
    }
  }

  // ============================================================================
  // VERIFICATION & HEALTH CHECK
  // ============================================================================

  async verify(): Promise<VerificationResult> {
    try {
      const result = await this.client.auth.test();

      if (!result[SLACK_RESPONSE_FIELDS.OK]) {
        return {
          success: false,
          message: `${SLACK_ERROR_MESSAGES.VERIFICATION_FAILED}: ${result[SLACK_RESPONSE_FIELDS.ERROR] || SLACK_ERROR_MESSAGES.UNKNOWN_ERROR}`,
          error: result[SLACK_RESPONSE_FIELDS.ERROR]
        };
      }

      return {
        success: true,
        message: 'Slack connection verified successfully',
        workspaceId: result[SLACK_RESPONSE_FIELDS.TEAM_ID],
        workspaceName: result[SLACK_RESPONSE_FIELDS.TEAM],
        botUserId: result[SLACK_RESPONSE_FIELDS.USER_ID]
      };
    } catch (error: any) {
      console.error(SLACK_ERROR_MESSAGES.VERIFICATION_FAILED, error);
      return {
        success: false,
        message: `${SLACK_ERROR_MESSAGES.CONNECTION_FAILED}: ${error.message}`,
        error: error.message
      };
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const result = await this.client.api.test();
      const latency = Date.now() - startTime;

      return {
        healthy: result[SLACK_RESPONSE_FIELDS.OK],
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

