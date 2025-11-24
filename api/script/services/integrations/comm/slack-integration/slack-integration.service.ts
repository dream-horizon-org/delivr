import { CommType } from '../comm-types';
import { ProviderFactory } from '../providers/provider.factory';
import {
  CommunicationType,
  VerificationStatus
} from '../../../../storage/integrations/comm/slack-types';
import type {
  CreateSlackIntegrationDto,
  UpdateSlackIntegrationDto,
  SafeSlackIntegration,
  TenantCommunicationIntegration
} from '../../../../storage/integrations/comm/slack-types';
import type {
  CreateOrUpdateIntegrationDto,
  UpdateIntegrationDataDto
} from '../../../../types/integrations/comm/slack-integration';

/**
 * Verification result for Slack integration
 */
export type SlackVerificationResult = {
  isValid: boolean;
  message: string;
  workspaceId?: string;
  workspaceName?: string;
  botUserId?: string;
  details?: any;
};

/**
 * Channels result for Slack integration
 */
export type SlackChannelsResult = {
  success: boolean;
  channels: Array<{ id: string; name: string }>;
  message: string;
  metadata?: {
    total: number;
    hasMore?: boolean;
  };
};

/**
 * Slack Integration Service
 * Business logic for Slack integration management (CRUD, verification)
 */
export class SlackIntegrationService {
  constructor(
    private integrationRepository: any // Will be injected
  ) {}

  /**
   * Verify Slack bot token
   * Uses provider factory pattern (same as project-management and test-management)
   */
  async verifyToken(botToken: string): Promise<SlackVerificationResult> {
    // Get provider using factory (consistent with other integrations)
    const provider = ProviderFactory.getProvider(CommType.SLACK, {
      commType: CommType.SLACK,
      botToken: botToken
    });

    // Use provider to verify
    const result = await provider.verify();

    return {
      isValid: result.success,
      message: result.message,
      workspaceId: result.workspaceId,
      workspaceName: result.workspaceName,
      botUserId: result.botUserId,
      details: result.error ? { error: result.error } : undefined
    };
  }

  /**
   * Fetch Slack channels
   * Uses provider factory pattern (same as other integrations)
   */
  async fetchChannels(botToken: string): Promise<SlackChannelsResult> {
    // Get provider using factory
    const provider = ProviderFactory.getProvider(CommType.SLACK, {
      commType: CommType.SLACK,
      botToken: botToken
    });

    // Use provider to list channels
    const result = await provider.listChannels();

    return {
      success: true,
      channels: result.channels.map(ch => ({ id: ch.id, name: ch.name })),
      message: 'Channels fetched successfully',
      metadata: {
        total: result.total
      }
    };
  }

  /**
   * Create or update Slack integration
   */
  async createOrUpdateIntegration(
    dto: CreateOrUpdateIntegrationDto
  ): Promise<{ integration: SafeSlackIntegration; isNew: boolean }> {
    const { tenantId, data } = dto;
    // Check if integration already exists
    const existing = await this.integrationRepository.findByTenant(
      tenantId,
      CommunicationType.SLACK
    );

    if (existing) {
      // Update existing integration
      const updateData: UpdateSlackIntegrationDto = {
        slackBotToken: data.botToken,
        slackBotUserId: data.botUserId,
        slackWorkspaceId: data.workspaceId,
        slackWorkspaceName: data.workspaceName,
        verificationStatus: VerificationStatus.VALID
      };

      const updated = await this.integrationRepository.update(existing.id, updateData);
      return { integration: updated, isNew: false };
    } else {
      // Create new integration
      const createData: CreateSlackIntegrationDto = {
        tenantId,
        communicationType: CommunicationType.SLACK,
        slackBotToken: data.botToken,
        slackBotUserId: data.botUserId,
        slackWorkspaceId: data.workspaceId,
        slackWorkspaceName: data.workspaceName
      };

      const created = await this.integrationRepository.create(createData);

      // Update verification status
      await this.integrationRepository.updateVerificationStatus(
        created.id,
        VerificationStatus.VALID
      );

      const integration = await this.integrationRepository.findByTenant(
        tenantId,
        CommunicationType.SLACK
      );

      return { integration, isNew: true };
    }
  }

  /**
   * Get Slack integration by tenant
   */
  async getIntegration(tenantId: string): Promise<SafeSlackIntegration | null> {
    return await this.integrationRepository.findByTenant(
      tenantId,
      CommunicationType.SLACK
    );
  }

  /**
   * Get Slack integration with token (for internal use)
   */
  async getIntegrationWithToken(
    tenantId: string
  ): Promise<TenantCommunicationIntegration | null> {
    return await this.integrationRepository.findByTenant(
      tenantId,
      CommunicationType.SLACK,
      true // include token
    );
  }

  /**
   * Get integration by ID (with token for internal use)
   */
  async getIntegrationById(
    integrationId: string
  ): Promise<TenantCommunicationIntegration | null> {
    return await this.integrationRepository.findById(integrationId, true);
  }

  /**
   * Update Slack integration
   */
  async updateIntegration(
    tenantId: string,
    updateData: UpdateSlackIntegrationDto
  ): Promise<SafeSlackIntegration | null> {
    const existing = await this.integrationRepository.findByTenant(
      tenantId,
      CommunicationType.SLACK
    );

    if (!existing) {
      return null;
    }

    return await this.integrationRepository.update(existing.id, updateData);
  }

  /**
   * Delete Slack integration
   */
  async deleteIntegration(tenantId: string): Promise<boolean> {
    const existing = await this.integrationRepository.findByTenant(
      tenantId,
      CommunicationType.SLACK
    );

    if (!existing) {
      return false;
    }

    await this.integrationRepository.delete(existing.id);
    return true;
  }
}

