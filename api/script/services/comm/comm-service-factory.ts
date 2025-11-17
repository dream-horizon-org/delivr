// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { getStorage } from '../../storage/storage-instance';
import { ICommService } from './comm-service.interface';
import { SlackService } from './slack-service';
import { CommType, CommConfig } from './comm-types';
import { CommunicationType } from '../../storage/integrations/slack/slack-types';

/**
 * Comm Service Factory
 * Creates Slack service instance for tenant's communication integration
 */
export class CommServiceFactory {
  /**
   * Create Slack service for a specific tenant
   * Auto-loads tenant's Slack integration configuration
   * 
   * @param tenantId - Tenant ID
   * @returns Slack service instance
   */
  static async createForTenant(tenantId: string): Promise<ICommService> {
    const storage = getStorage();
    
    // Get Slack controller
    const slackController = (storage as any).slackController;
    if (!slackController) {
      throw new Error('Slack controller not initialized');
    }

    // Find active Slack integration for tenant (include token for internal use)
    const integration = await slackController.findByTenant(
      tenantId,
      CommunicationType.SLACK,
      true  // includeToken = true for internal use
    ) as any;

    if (!integration) {
      throw new Error(`No Slack integration found for tenant ${tenantId}`);
    }

    // Check if integration is valid
    if (integration.verificationStatus !== 'VALID') {
      throw new Error(`Slack integration for tenant ${tenantId} is not verified`);
    }

    // Build Comm config
    const commConfig: CommConfig = {
      commType: CommType.SLACK,
      botToken: integration.slackBotToken,
      workspaceId: integration.slackWorkspaceId,
      channels: integration.slackChannels || []
    };

    // Validate token exists
    if (!commConfig.botToken) {
      throw new Error(`Slack bot token not found for tenant ${tenantId}`);
    }

    // Create Slack service
    return new SlackService(commConfig);
  }

  /**
   * Create Slack service with explicit configuration
   * 
   * @param config - Slack service configuration
   * @returns Slack service instance
   */
  static create(config: CommConfig): ICommService {
    if (config.commType !== CommType.SLACK) {
      throw new Error(`Only Slack is supported. Got: ${config.commType}`);
    }
    return new SlackService(config);
  }

  /**
   * Validate Slack configuration
   */
  static validateConfig(config: Partial<CommConfig>): config is CommConfig {
    return config.commType === CommType.SLACK && !!config.botToken;
  }

  /**
   * Check if tenant has Slack integration configured
   */
  static async hasTenantIntegration(tenantId: string): Promise<boolean> {
    try {
      const storage = getStorage();
      const slackController = (storage as any).slackController;
      
      if (!slackController) {
        return false;
      }

      const integration = await slackController.findByTenant(
        tenantId,
        CommunicationType.SLACK,
        false  // Don't need token for checking existence
      );

      return !!integration && integration.verificationStatus === 'VALID';
    } catch (error) {
      console.error(`Error checking comm integration for tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Get tenant's configured channels
   */
  static async getTenantChannels(tenantId: string): Promise<string[]> {
    try {
      const storage = getStorage();
      const slackController = (storage as any).slackController;
      
      if (!slackController) {
        return [];
      }

      const integration = await slackController.findByTenant(
        tenantId,
        CommunicationType.SLACK,
        false  // Don't need token for getting channels
      );

      if (!integration || !integration.slackChannels) {
        return [];
      }

      return integration.slackChannels.map((ch: any) => ch.id);
    } catch (error) {
      console.error(`Error getting channels for tenant ${tenantId}:`, error);
      return [];
    }
  }
}


