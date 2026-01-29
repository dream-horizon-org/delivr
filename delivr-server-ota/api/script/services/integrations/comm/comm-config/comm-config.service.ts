import { customAlphabet } from 'nanoid';
import { CommunicationType } from '~types/integrations/comm/comm-integration';
import type {
  AppCommChannel,
  TenantCommChannel,
  StageChannelMapping,
  SlackChannel
} from '~types/integrations/comm/comm-integration';
import type {
  CreateChannelConfigDto,
  UpdateStageChannelsDto,
  ChannelConfigValidationResult,
  ValidationError
} from '../../../../types/integrations/comm/slack-channel-config';
import { ChannelBucket } from '../messaging/messaging.interface';

// Create nanoid generator for channel config IDs (shorter, URL-safe)
const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-',
  21
);

/**
 * Communication Configuration Service
 * 
 * Responsibilities:
 * - Manage channel configurations (which channels for which stages/buckets)
 * - Validate channel configuration structure
 * 
 * This service manages reusable channel configurations that can be
 * linked to release configs.
 */
export class CommConfigService {
  constructor(
    private readonly configRepository: any, // TODO: Type this properly
    private readonly integrationRepository: any // TODO: Type this properly
  ) {}

  /**
   * Validate channel configuration data
   */
  validateConfig(data: CreateChannelConfigDto): ChannelConfigValidationResult {
    const errors: ValidationError[] = [];
    const { channelData } = data;

    // Check if channelData exists and is an object
    if (!channelData || typeof channelData !== 'object') {
      errors.push({
        field: 'channelData',
        message: 'channelData must be an object'
      });
      
      return {
        integration: 'communication',
        isValid: false,
        errors
      };
    }

    // Check if using new bucket-based structure (has 'channels' property)
    const isNewBucketStructure = 'channels' in channelData;

    if (isNewBucketStructure) {
      // Validate new bucket-based structure
      const channels = (channelData as any).channels;

      if (!channels || typeof channels !== 'object') {
        errors.push({
          field: 'channelData.channels',
          message: 'channels must be an object containing bucket mappings'
        });
        
        return {
          integration: 'communication',
          isValid: false,
          errors
        };
      }

      // Valid bucket names - derived from ChannelBucket enum (single source of truth)
      const validBuckets = Object.values(ChannelBucket);

      // Validate each bucket
      for (const [bucket, bucketChannels] of Object.entries(channels)) {
        // Check if bucket name is valid
        if (!validBuckets.includes(bucket as ChannelBucket)) {
          errors.push({
            field: `channelData.channels.${bucket}`,
            message: `Invalid bucket name '${bucket}'. Valid buckets: ${validBuckets.join(', ')}`
          });
          continue;
        }

        // Check if bucket contains an array
        if (!Array.isArray(bucketChannels)) {
          errors.push({
            field: `channelData.channels.${bucket}`,
            message: `Bucket '${bucket}' must contain an array of channels`
          });
          continue;
        }

        // Validate each channel in the bucket
        for (let i = 0; i < (bucketChannels as any[]).length; i++) {
          const channel = (bucketChannels as any[])[i];

          // Support both string IDs and objects with id/name
          if (typeof channel === 'string') {
            // Valid: just a channel ID string
            continue;
          }

          if (typeof channel === 'object' && channel !== null) {
            // Validate object format
            if (!channel.id) {
              errors.push({
                field: `channelData.channels.${bucket}[${i}].id`,
                message: `Channel ID is missing in bucket '${bucket}'`
              });
            }

            if (!channel.name) {
              errors.push({
                field: `channelData.channels.${bucket}[${i}].name`,
                message: `Channel name is missing in bucket '${bucket}'`
              });
            }

            if (channel.id && typeof channel.id !== 'string') {
              errors.push({
                field: `channelData.channels.${bucket}[${i}].id`,
                message: `Channel ID must be a string in bucket '${bucket}'`
              });
            }

            if (channel.name && typeof channel.name !== 'string') {
              errors.push({
                field: `channelData.channels.${bucket}[${i}].name`,
                message: `Channel name must be a string in bucket '${bucket}'`
              });
            }
          } else {
            errors.push({
              field: `channelData.channels.${bucket}[${i}]`,
              message: `Channel must be a string ID or an object with id and name in bucket '${bucket}'`
            });
          }
        }
      }
    } else {
      // Validate old stage-based structure (backward compatibility)
      for (const [stage, channels] of Object.entries(channelData)) {
        // Check if channels is an array
        if (!Array.isArray(channels)) {
          errors.push({
            field: `channelData.${stage}`,
            message: `Stage '${stage}' must contain an array of channels`
          });
          continue;
        }

        // Validate each channel in the stage
        for (let i = 0; i < channels.length; i++) {
          const channel = channels[i];

          // Check if channel has required properties
          if (!channel.id) {
            errors.push({
              field: `channelData.${stage}[${i}].id`,
              message: `Channel ID is missing in stage '${stage}'`
            });
          }

          if (!channel.name) {
            errors.push({
              field: `channelData.${stage}[${i}].name`,
              message: `Channel name is missing in stage '${stage}'`
            });
          }

          // Check if properties are strings
          if (channel.id && typeof channel.id !== 'string') {
            errors.push({
              field: `channelData.${stage}[${i}].id`,
              message: `Channel ID must be a string in stage '${stage}'`
            });
          }

          if (channel.name && typeof channel.name !== 'string') {
            errors.push({
              field: `channelData.${stage}[${i}].name`,
              message: `Channel name must be a string in stage '${stage}'`
            });
          }
        }
      }
    }

    return {
      integration: 'communication',
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create channel configuration
   */
  async createConfig(data: CreateChannelConfigDto): Promise<AppCommChannel> {
    const { appId, channelData } = data;

    // Validate: Check if integration exists
    const integration = await this.integrationRepository.findByApp(
      appId,
      CommunicationType.SLACK
    );

    if (!integration) {
      throw new Error('Communication integration not found for this tenant');
    }

    // Validate: Check channel data structure
    const validationResult = this.validateConfig(data);
    
    if (!validationResult.isValid) {
      const errorMessage = validationResult.errors
        .map(err => `${err.field}: ${err.message}`)
        .join('; ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    // Generate unique ID
    const id = nanoid();

    // Create channel configuration
    return await this.configRepository.create(
      id,
      integration.id,
      appId,
      channelData
    );
  }

  /**
   * Get config by ID
   */
  async getConfigById(id: string): Promise<AppCommChannel | null> {
    return await this.configRepository.findById(id);
  }

  /**
   * List configs by app id
   */
  async listConfigsByApp(appId: string): Promise<AppCommChannel[]> {
    const config = await this.configRepository.findByApp(appId);
    return config ? [config] : [];
  }

  /**
   * Update config
   */
  async updateConfig(
    id: string,
    data: Partial<{ channelData: any }>
  ): Promise<AppCommChannel | null> {
    const config = await this.configRepository.findById(id);

    if (!config) {
      return null;
    }

    // If updating channelData, validate it
    if (data.channelData) {
      const validationResult = this.validateConfig({
        appId: config.appId,
        channelData: data.channelData
      });

      if (!validationResult.isValid) {
        const errorMessage = validationResult.errors
          .map(err => `${err.field}: ${err.message}`)
          .join('; ');
        throw new Error(`Validation failed: ${errorMessage}`);
      }
    }

    // Update the config using repository
    return await this.configRepository.update(id, data);
  }

  /**
   * Delete config
   */
  async deleteConfig(id: string): Promise<boolean> {
    const config = await this.configRepository.findById(id);

    if (!config) {
      return false;
    }

    await this.configRepository.delete(id);
    return true;
  }

  /**
   * Update stage channels (legacy method - deprecated)
   * @deprecated Use updateConfig instead
   */
  async updateStageChannels(data: UpdateStageChannelsDto): Promise<TenantCommChannel | null> {
    const { id, stage, action, channels } = data;

    // Validate: Check if config exists
    const config = await this.configRepository.findById(id);

    if (!config) {
      return null;
    }

    // Business logic: Update channels
    return await this.configRepository.updateStageChannels(
      id,
      stage,
      action,
      channels
    );
  }
}

