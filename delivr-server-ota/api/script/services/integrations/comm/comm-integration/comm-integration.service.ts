import { CommType } from '../comm-types';
import type { VerificationResult, ListChannelsResponse } from '../comm-types';
import { ProviderFactory } from '../providers/provider.factory';
import {
  CommunicationType,
  VerificationStatus
} from '~types/integrations/comm/comm-integration';
import type {
  CreateSlackIntegrationDto,
  UpdateSlackIntegrationDto,
  SafeSlackIntegration,
  AppCommunicationIntegration
} from '~types/integrations/comm/comm-integration';

/**
 * Communication Integration Service
 * 
 * Responsibilities:
 * - Manage communication integration credentials (CRUD)
 * - Verify integration connectivity
 * 
 * This service manages the credentials needed to connect to
 * external communication providers (Slack, Teams, Discord, etc.)
 */
export class CommIntegrationService {
  constructor(
    private readonly repository: any // TODO: Type this properly with CommIntegrationRepository
  ) {}

  /**
   * Verify credentials without saving (stateless verification)
   */
  async verifyCredentials(
    providerType: CommType,
    botToken: string
  ): Promise<VerificationResult> {
    try {
      const provider = ProviderFactory.getProvider(providerType, {
        commType: providerType,
        botToken
      });

      const result = await provider.verify();
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Fetch channels from provider (stateless)
   */
  async fetchChannels(
    providerType: CommType,
    botToken: string
  ): Promise<ListChannelsResponse> {
    const provider = ProviderFactory.getProvider(providerType, {
      commType: providerType,
      botToken
    });

    return await provider.listChannels();
  }

  /**
   * Create a new integration
   */
  async createIntegration(
    appId: string,
    providerType: CommunicationType,
    data: {
      botToken: string;
      botUserId: string;
      workspaceId: string;
      workspaceName: string;
      createdByAccountId?: string | null;
    }
  ): Promise<SafeSlackIntegration> {
    const createData: CreateSlackIntegrationDto = {
      appId,
      communicationType: providerType,
      slackBotToken: data.botToken,
      slackBotUserId: data.botUserId,
      slackWorkspaceId: data.workspaceId,
      slackWorkspaceName: data.workspaceName,
      createdByAccountId: data.createdByAccountId ?? null
    };

    const created = await this.repository.create(createData);

    // Update verification status
    await this.repository.updateVerificationStatus(
      created.id,
      VerificationStatus.VALID
    );

    const integration = await this.repository.findByApp(
      appId,
      providerType
    );

    return integration;
  }

  /**
   * List all integrations for a tenant
   */
  async listIntegrations(appId: string): Promise<SafeSlackIntegration[]> {
    // TODO: Update repository to support findAll by appId
    const integration = await this.repository.findByApp(
      appId,
      CommunicationType.SLACK
    );
    return integration ? [integration] : [];
  }

  /**
   * Get integration by ID
   */
  async getIntegrationById(integrationId: string): Promise<AppCommunicationIntegration | null> {
    return await this.repository.findById(integrationId, true);
  }

  /**
   * Get integration by tenant
   */
  async getIntegrationByApp(appId: string): Promise<SafeSlackIntegration | null> {
    return await this.repository.findByApp(
      appId,
      CommunicationType.SLACK
    );
  }

  /**
   * Get integration with token (for internal use)
   */
  async getIntegrationWithToken(appId: string): Promise<AppCommunicationIntegration | null> {
    return await this.repository.findByApp(
      appId,
      CommunicationType.SLACK,
      true // include token
    );
  }

  /**
   * Update integration by integrationId
   */
  async updateIntegration(
    integrationId: string,
    updateData: UpdateSlackIntegrationDto
  ): Promise<SafeSlackIntegration | null> {
    const existing = await this.repository.findById(integrationId);

    if (!existing) {
      return null;
    }

    return await this.repository.update(integrationId, updateData);
  }

  /**
   * Update integration by appId (legacy method)
   */
  async updateIntegrationByApp(
    appId: string,
    updateData: UpdateSlackIntegrationDto
  ): Promise<SafeSlackIntegration | null> {
    const existing = await this.repository.findByApp(
      appId,
      CommunicationType.SLACK
    );

    if (!existing) {
      return null;
    }

    return await this.repository.update(existing.id, updateData);
  }

  /**
   * Delete integration by integrationId
   */
  async deleteIntegration(integrationId: string): Promise<boolean> {
    const existing = await this.repository.findById(integrationId);

    if (!existing) {
      return false;
    }

    await this.repository.delete(integrationId);
    return true;
  }

  /**
   * Delete integration by appId (legacy method)
   */
  async deleteIntegrationByApp(appId: string): Promise<boolean> {
    const existing = await this.repository.findByApp(
      appId,
      CommunicationType.SLACK
    );

    if (!existing) {
      return false;
    }

    await this.repository.delete(existing.id);
    return true;
  }

  /**
   * Verify integration by testing connection
   */
  async verifyIntegration(integrationId: string): Promise<VerificationResult> {
    const integration = await this.repository.findById(integrationId, true);

    if (!integration) {
      return {
        success: false,
        message: 'Integration not found'
      };
    }

    try {
      const commType = this.mapCommunicationType(integration.communicationType);
      const provider = ProviderFactory.getProvider(commType, {
        commType,
        botToken: integration.slackBotToken
      });

      const result = await provider.verify();
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Map database CommunicationType to CommType enum
   */
  private mapCommunicationType(dbType: CommunicationType): CommType {
    switch (dbType) {
      case CommunicationType.SLACK:
        return CommType.SLACK;
      default:
        throw new Error(`Unsupported communication type: ${dbType}`);
    }
  }
}

