import { encryptForStorage } from '~utils/encryption';
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
  TenantCommunicationIntegration
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
    } catch (error: any) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: { errorCode: 'unknown_error', message: error.message }
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
    tenantId: string,
    providerType: CommunicationType,
    data: {
      botToken: string;
      botUserId: string;
      workspaceId: string;
      workspaceName: string;
      createdByAccountId?: string | null;
    }
  ): Promise<SafeSlackIntegration> {
    // Verify credentials before saving
    const commType = this.mapCommunicationType(providerType);
    const verificationResult = await this.verifyCredentials(commType, data.botToken);

    if (!verificationResult.success) {
      const error: any = new Error(verificationResult.message);
      error.details = verificationResult.details;
      throw error;
    }
    const encryptedBotToken = encryptForStorage(data.botToken);
    const createData: CreateSlackIntegrationDto = {
      tenantId,
      communicationType: providerType,
      slackBotToken: encryptedBotToken,
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

    const integration = await this.repository.findByTenant(
      tenantId,
      providerType
    );

    return integration;
  }

  /**
   * List all integrations for a tenant
   */
  async listIntegrations(tenantId: string): Promise<SafeSlackIntegration[]> {
    // TODO: Update repository to support findAll by tenantId
    const integration = await this.repository.findByTenant(
      tenantId,
      CommunicationType.SLACK
    );
    return integration ? [integration] : [];
  }

  /**
   * Get integration by ID
   */
  async getIntegrationById(integrationId: string): Promise<TenantCommunicationIntegration | null> {
    return await this.repository.findById(integrationId, true);
  }

  /**
   * Get integration by tenant
   */
  async getIntegrationByTenant(tenantId: string): Promise<SafeSlackIntegration | null> {
    return await this.repository.findByTenant(
      tenantId,
      CommunicationType.SLACK
    );
  }

  /**
   * Get integration with token (for internal use)
   */
  async getIntegrationWithToken(tenantId: string): Promise<TenantCommunicationIntegration | null> {
    return await this.repository.findByTenant(
      tenantId,
      CommunicationType.SLACK,
      true // include token
    );
  }

  /**
   * Update integration by integrationId
   * VALIDATES credentials if botToken is being updated
   */
  async updateIntegration(
    integrationId: string,
    updateData: UpdateSlackIntegrationDto
  ): Promise<SafeSlackIntegration | null> {
    const existing = await this.repository.findById(integrationId, true);

    if (!existing) {
      return null;
    }

    // Verify credentials if botToken is being updated
    const tokenIsBeingUpdated = updateData.slackBotToken !== undefined;
    
    if (tokenIsBeingUpdated) {
      const commType = this.mapCommunicationType(existing.communicationType);
      const verificationResult = await this.verifyCredentials(
        commType, 
        updateData.slackBotToken
      );

      if (!verificationResult.success) {
        const error: any = new Error(verificationResult.message);
        error.details = verificationResult.details;
        throw error;
      }

      // Update verification status to VALID
      await this.repository.updateVerificationStatus(
        integrationId,
        VerificationStatus.VALID
      );
    }

    return await this.repository.update(integrationId, updateData);
  }

  /**
   * Update integration by tenantId (legacy method)
   * VALIDATES credentials if botToken is being updated
   */
  async updateIntegrationByTenant(
    tenantId: string,
    updateData: UpdateSlackIntegrationDto
  ): Promise<SafeSlackIntegration | null> {
    const existing = await this.repository.findByTenant(
      tenantId,
      CommunicationType.SLACK,
      true // include token for verification
    );

    if (!existing) {
      return null;
    }

    // Verify credentials if botToken is being updated
    const tokenIsBeingUpdated = updateData.slackBotToken !== undefined;
    
    if (tokenIsBeingUpdated) {
      const commType = this.mapCommunicationType(existing.communicationType);
      const verificationResult = await this.verifyCredentials(
        commType, 
        updateData.slackBotToken
      );

      if (!verificationResult.success) {
        const error: any = new Error(verificationResult.message);
        error.details = verificationResult.details;
        throw error;
      }

      const encryptedBotToken = encryptForStorage(updateData.slackBotToken);
      updateData.slackBotToken = encryptedBotToken;

      // Update verification status to VALID
      await this.repository.updateVerificationStatus(
        existing.id,
        VerificationStatus.VALID
      );
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
   * Delete integration by tenantId (legacy method)
   */
  async deleteIntegrationByTenant(tenantId: string): Promise<boolean> {
    const existing = await this.repository.findByTenant(
      tenantId,
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

