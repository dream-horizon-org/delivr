import { customAlphabet } from 'nanoid';
import {
  CommunicationType,
  VerificationStatus
} from '~types/integrations/comm/comm-integration';
import type {
  CreateSlackIntegrationDto,
  UpdateSlackIntegrationDto,
  SlackIntegrationFilters,
  AppCommunicationIntegration,
  TenantCommunicationIntegration,
  SafeSlackIntegration
} from '~types/integrations/comm/comm-integration';
import type { CommIntegrationModelType } from './comm-integration.sequelize.model';
import { decryptFromStorage } from '~utils/encryption';

// Create nanoid generator with custom alphabet (alphanumeric + underscore + hyphen)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-', 21);

/**
 * Communication Integration Repository
 * Data access layer for tenant_communication_integrations table
 */
export class CommIntegrationRepository {
  private model: CommIntegrationModelType;

  constructor(model: CommIntegrationModelType) {
    this.model = model;
  }

  /**
   * Convert to safe object (remove sensitive tokens)
   * This is critical for security - never expose tokens in API responses!
   */
  private toSafeObject = (data: any): SafeSlackIntegration => {
    const { slackBotToken, ...safe } = data;
    return safe;
  };

  /**
   * Convert Sequelize model instance to plain object
   * Decrypts tokens from backend storage when includeToken is true
   * Handles both backend and frontend encrypted formats for backward compatibility
   */
  private toPlainObject = (
    instance: InstanceType<CommIntegrationModelType>,
    includeToken: boolean = false
  ): AppCommunicationIntegration | SafeSlackIntegration => {
    const json = instance.toJSON();
    
    // Decrypt token from backend storage if including token (handles both formats)
    if (includeToken && json.slackBotToken) {
      try {
        json.slackBotToken = decryptFromStorage(json.slackBotToken);
      } catch (error: any) {
        console.error('[Comm] Failed to decrypt slackBotToken, keeping encrypted value:', error.message);
        // Keep encrypted value - might be corrupted or in unexpected format
      }
    }
    
    return includeToken ? json : this.toSafeObject(json);
  };

  /**
   * Create a new Slack integration
   */
  create = async (data: CreateSlackIntegrationDto): Promise<SafeSlackIntegration> => {
    const integration = await this.model.create({
      id: nanoid(),
      ...data,
      communicationType: data.communicationType ?? CommunicationType.SLACK,
      verificationStatus: VerificationStatus.PENDING,
      createdByAccountId: data.createdByAccountId ?? null
    });

    return this.toPlainObject(integration) as SafeSlackIntegration;
  };

  /**
   * Find integration by ID
   */
  findById = async (
    id: string,
    includeToken: boolean = false
  ): Promise<AppCommunicationIntegration | SafeSlackIntegration | null> => {
    const integration = await this.model.findByPk(id);

    if (!integration) {
      return null;
    }

    return this.toPlainObject(integration, includeToken);
  };

  /**
   * Find all integrations with filters
   */
  findAll = async (filters: SlackIntegrationFilters = {}): Promise<SafeSlackIntegration[]> => {
    const where: Record<string, unknown> = {};

    if (filters.appId !== undefined) {
      where.appId = filters.appId;
    }

    if (filters.communicationType !== undefined) {
      where.communicationType = filters.communicationType;
    }

    if (filters.verificationStatus !== undefined) {
      where.verificationStatus = filters.verificationStatus;
    }

    if (filters.workspaceId !== undefined) {
      where.slackWorkspaceId = filters.workspaceId;
    }

    const integrations = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return integrations.map(i => this.toPlainObject(i) as SafeSlackIntegration);
  };

  /**
   * Find integration by app (most common query)
   */
  findByApp = async (
    appId: string,
    communicationType: CommunicationType = CommunicationType.SLACK,
    includeToken: boolean = false
  ): Promise<AppCommunicationIntegration | SafeSlackIntegration | null> => {
    const integration = await this.model.findOne({
      where: {
        appId,
        communicationType
      },
      order: [['createdAt', 'DESC']]
    });

    if (!integration) {
      return null;
    }

    return this.toPlainObject(integration, includeToken);
  };

  /**
   * @deprecated Use findByApp instead
   * Kept for backward compatibility
   */
  findByApp = this.findByApp;

  /**
   * Find integration by workspace
   */
  findByWorkspace = async (
    appId: string,
    workspaceId: string
  ): Promise<SafeSlackIntegration | null> => {
    const integration = await this.model.findOne({
      where: { appId, slackWorkspaceId: workspaceId }
    });

    if (!integration) {
      return null;
    }

    return this.toPlainObject(integration) as SafeSlackIntegration;
  };

  /**
   * Update integration
   */
  update = async (
    id: string,
    data: UpdateSlackIntegrationDto
  ): Promise<SafeSlackIntegration | null> => {
    const integration = await this.model.findByPk(id);

    if (!integration) {
      return null;
    }

    await integration.update(data);
    return this.toPlainObject(integration) as SafeSlackIntegration;
  };

  /**
   * Update verification status
   */
  updateVerificationStatus = async (
    id: string,
    status: VerificationStatus
  ): Promise<SafeSlackIntegration | null> => {
    const integration = await this.model.findByPk(id);

    if (!integration) {
      return null;
    }

    await integration.update({
      verificationStatus: status
    });

    return this.toPlainObject(integration) as SafeSlackIntegration;
  };

  /**
   * Hard delete integration (permanent removal)
   * ⚠️ Use with caution! This cannot be undone.
   */
  delete = async (id: string): Promise<boolean> => {
    const result = await this.model.destroy({ where: { id } });
    return result > 0;
  };

  /**
   * Check if integration exists
   */
  exists = async (id: string): Promise<boolean> => {
    const count = await this.model.count({ where: { id } });
    return count > 0;
  };

  /**
   * Count integrations for a tenant
   */
  count = async (appId: string, communicationType?: CommunicationType): Promise<number> => {
    const where: Record<string, unknown> = { appId };
    
    if (communicationType !== undefined) {
      where.communicationType = communicationType;
    }

    return await this.model.count({ where });
  };
}

