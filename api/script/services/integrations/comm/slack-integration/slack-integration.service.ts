import { slackApiService, SlackVerificationResult, SlackChannelsResult } from '../providers/slack/slack.provider';
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
  CreateOrUpdateIntegrationDto
} from '../../../../types/integrations/comm/slack-integration';

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
   */
  async verifyToken(botToken: string): Promise<SlackVerificationResult> {
    return await slackApiService.verifyToken(botToken);
  }

  /**
   * Fetch Slack channels
   */
  async fetchChannels(botToken: string): Promise<SlackChannelsResult> {
    console.log("fetching channels for bot token: ", botToken);
    return await slackApiService.fetchChannels(botToken);
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

