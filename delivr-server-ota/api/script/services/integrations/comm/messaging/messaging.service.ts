import type { MessageResponse } from '../comm-types';
import type { Task, Platform } from './messaging.interface';
import { ProviderFactory } from '../providers/provider.factory';
import type { CommIntegrationService } from '../comm-integration';
import type { CommConfigService } from '../comm-config';
import { CommunicationType } from '~types/integrations/comm/comm-integration';
import { CommType } from '../comm-types';

/**
 * Messaging Service
 * 
 * Orchestrates messaging operations across different communication providers.
 * Similar pattern to:
 * - test-management/test-run/test-run.service.ts (uses ProviderFactory)
 * - project-management/ticket/ticket.service.ts (uses ProviderFactory)
 * 
 * This service:
 * 1. Fetches channel config by configId
 * 2. Fetches integration by config.integrationId
 * 3. Dynamically gets provider based on integration.communicationType
 * 4. Delegates actual messaging to the provider
 */
export class MessagingService {
  constructor(
    private readonly commIntegrationService: CommIntegrationService,
    private readonly commConfigService: CommConfigService
  ) {}

  /**
   * Send templated message to appropriate channels based on task
   * 
   * @param configId - Channel configuration ID
   * @param task - Message template task type
   * @param parameters - Array of values to replace placeholders
   * @param fileUrl - Optional: URL of file to download and attach
   * @param platform - Optional: platform for platform-specific templates
   * @param channelIds - Optional: specific channel IDs to send to (for ad-hoc notifications). If not provided, uses configured channels.
   * @returns Map of channel IDs to message responses
   */
  async sendMessage(
    configId: string,
    task: Task,
    parameters: string[],
    fileUrl?: string,
    platform?: Platform,
    channelIds?: string[]
  ): Promise<Map<string, MessageResponse>> {
    // 1. Get channel configuration by configId
    const channelConfig = await this.commConfigService.getConfigById(configId);
    
    if (!channelConfig) {
      throw new Error(`Channel configuration not found: ${configId}`);
    }

    // 2. Get integration by config.integrationId (NOT by tenantId!)
    const integration = await this.commIntegrationService.getIntegrationById(
      channelConfig.integrationId
    );
    
    if (!integration) {
      throw new Error(`Communication integration not found: ${channelConfig.integrationId}`);
    }

    // 3. Map DB CommunicationType to CommType enum
    const commType = this.mapCommunicationType(integration.communicationType);

    // 4. Build config based on comm type
    const providerConfig = this.buildProviderConfig(commType, integration);

    // 5. Get provider dynamically based on integration type
    const provider = ProviderFactory.getProvider(commType, providerConfig);

    // 6. Delegate to provider
    return await provider.sendMessage(
      configId,
      task,
      parameters,
      fileUrl,
      platform,
      channelIds
    );
  }

  /**
   * Map database CommunicationType to CommType enum
   */
  private mapCommunicationType(dbType: CommunicationType): CommType {
    switch (dbType) {
      case CommunicationType.SLACK:
        return CommType.SLACK;
      // Future:
      // case CommunicationType.TEAMS:
      //   return CommType.TEAMS;
      default:
        throw new Error(`Unsupported communication type: ${dbType}`);
    }
  }

  /**
   * Build provider config based on comm type
   */
  private buildProviderConfig(commType: CommType, integration: any) {
    switch (commType) {
      case CommType.SLACK:
        if (!integration.slackBotToken) {
          throw new Error('Slack integration missing bot token');
        }
        return {
          commType: CommType.SLACK,
          botToken: integration.slackBotToken,
          workspaceId: integration.slackWorkspaceId
        };
      // Future:
      // case CommType.TEAMS:
      //   return {
      //     commType: CommType.TEAMS,
      //     webhookUrl: integration.teamsWebhookUrl
      //   };
      default:
        throw new Error(`Cannot build config for type: ${commType}`);
    }
  }

  /**
   * List available channels for a configuration
   * 
   * @param configId - Channel configuration ID
   * @returns List of channels
   */
  async listChannels(configId: string) {
    // 1. Get channel configuration
    const channelConfig = await this.commConfigService.getConfigById(configId);
    
    if (!channelConfig) {
      throw new Error(`Channel configuration not found: ${configId}`);
    }

    // 2. Get integration by config.integrationId
    const integration = await this.commIntegrationService.getIntegrationById(
      channelConfig.integrationId
    );
    
    if (!integration) {
      throw new Error(`Communication integration not found: ${channelConfig.integrationId}`);
    }

    // 3. Get provider dynamically
    const commType = this.mapCommunicationType(integration.communicationType);
    const providerConfig = this.buildProviderConfig(commType, integration);
    const provider = ProviderFactory.getProvider(commType, providerConfig);

    // 4. Delegate to provider
    return await provider.listChannels();
  }

  /**
   * Verify integration for a configuration
   * 
   * @param configId - Channel configuration ID
   * @returns Verification result
   */
  async verifyIntegration(configId: string) {
    // 1. Get channel configuration
    const channelConfig = await this.commConfigService.getConfigById(configId);
    
    if (!channelConfig) {
      throw new Error(`Channel configuration not found: ${configId}`);
    }

    // 2. Get integration by config.integrationId
    const integration = await this.commIntegrationService.getIntegrationById(
      channelConfig.integrationId
    );
    
    if (!integration) {
      throw new Error(`Communication integration not found: ${channelConfig.integrationId}`);
    }

    // 3. Get provider dynamically
    const commType = this.mapCommunicationType(integration.communicationType);
    const providerConfig = this.buildProviderConfig(commType, integration);
    const provider = ProviderFactory.getProvider(commType, providerConfig);

    // 4. Delegate to provider
    return await provider.verify();
  }

  /**
   * Health check for integration
   * 
   * @param configId - Channel configuration ID
   * @returns Health check result
   */
  async healthCheck(configId: string) {
    // 1. Get channel configuration
    const channelConfig = await this.commConfigService.getConfigById(configId);
    
    if (!channelConfig) {
      throw new Error(`Channel configuration not found: ${configId}`);
    }

    // 2. Get integration by config.integrationId
    const integration = await this.commIntegrationService.getIntegrationById(
      channelConfig.integrationId
    );
    
    if (!integration) {
      throw new Error(`Communication integration not found: ${channelConfig.integrationId}`);
    }

    // 3. Get provider dynamically
    const commType = this.mapCommunicationType(integration.communicationType);
    const providerConfig = this.buildProviderConfig(commType, integration);
    const provider = ProviderFactory.getProvider(commType, providerConfig);

    // 4. Delegate to provider
    return await provider.healthCheck();
  }

}

