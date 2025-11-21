import { customAlphabet } from 'nanoid';
import { CommunicationType } from '../../../../storage/integrations/comm/slack-types';
import type {
  TenantCommChannel,
  StageChannelMapping,
  SlackChannel
} from '../../../../storage/integrations/comm/slack-types';
import type {
  CreateChannelConfigDto,
  UpdateStageChannelsDto,
  ChannelConfigValidationResult,
  ValidationError
} from '../../../../types/integrations/comm/slack-channel-config';

// Create nanoid generator for channel config IDs (shorter, URL-safe)
const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-',
  21
);

/**
 * Slack Channel Configuration Service
 * Business logic for channel configuration management
 */
export class SlackChannelConfigService {
  constructor(
    private channelConfigRepository: any, // Will be injected
    private integrationRepository: any // Will be injected
  ) {}

  /**
   * Validate channel configuration data
   * Public method for controller to validate before creating
   */
  validateCreateConfig(data: CreateChannelConfigDto): ChannelConfigValidationResult {
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

    // Validate each stage
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

    return {
      integration: 'communication',
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create channel configuration
   */
  async createConfig(data: CreateChannelConfigDto): Promise<TenantCommChannel> {
    const { tenantId, channelData } = data;

    // Validate: Check if integration exists
    const integration = await this.integrationRepository.findByTenant(
      tenantId,
      CommunicationType.SLACK
    );

    if (!integration) {
      throw new Error('Slack integration not found for this tenant');
    }

    // Validate: Check channel data structure
    const validationResult = this.validateCreateConfig(data);
    
    if (!validationResult.isValid) {
      const errorMessage = validationResult.errors
        .map(err => `${err.field}: ${err.message}`)
        .join('; ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    // Generate unique ID
    const id = nanoid();

    // Create channel configuration (repository expects 4 separate parameters)
    return await this.channelConfigRepository.create(
      id,
      integration.id,
      tenantId,
      channelData
    );
  }

  /**
   * Get channel configuration by ID
   */
  async getConfig(id: string): Promise<TenantCommChannel | null> {
    return await this.channelConfigRepository.findById(id);
  }

  /**
   * Get channel configuration by tenant
   */
  async getConfigByTenant(tenantId: string): Promise<TenantCommChannel | null> {
    return await this.channelConfigRepository.findByTenant(tenantId);
  }

  /**
   * Delete channel configuration
   */
  async deleteConfig(id: string): Promise<boolean> {
    const config = await this.channelConfigRepository.findById(id);

    if (!config) {
      return false;
    }

    await this.channelConfigRepository.delete(id);
    return true;
  }

  /**
   * Update stage channels (add or remove)
   */
  async updateStageChannels(data: UpdateStageChannelsDto): Promise<TenantCommChannel | null> {
    const { id, stage, action, channels } = data;

    // Validate: Check if config exists
    const config = await this.channelConfigRepository.findById(id);

    if (!config) {
      return null;
    }

    // Business logic: Update channels
    return await this.channelConfigRepository.updateStageChannels(
      id,
      stage,
      action,
      channels
    );
  }
}

