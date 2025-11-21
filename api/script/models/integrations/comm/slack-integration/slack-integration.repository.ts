import { customAlphabet } from 'nanoid';
import {
  CommunicationType,
  VerificationStatus
} from '~storage/integrations/comm/slack-types';
import type {
  CreateSlackIntegrationDto,
  UpdateSlackIntegrationDto,
  SlackIntegrationFilters,
  TenantCommunicationIntegration,
  SafeSlackIntegration
} from '~storage/integrations/comm/slack-types';
import type { SlackIntegrationModelType } from './slack-integration.sequelize.model';

// Create nanoid generator with custom alphabet (alphanumeric + underscore + hyphen)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-', 21);

/**
 * Slack Integration Repository
 * Data access layer for tenant_communication_integrations table
 */
export class SlackIntegrationRepository {
  private model: SlackIntegrationModelType;

  constructor(model: SlackIntegrationModelType) {
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
   */
  private toPlainObject = (
    instance: InstanceType<SlackIntegrationModelType>,
    includeToken: boolean = false
  ): TenantCommunicationIntegration | SafeSlackIntegration => {
    const json = instance.toJSON();
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
      verificationStatus: VerificationStatus.PENDING
    });

    return this.toPlainObject(integration) as SafeSlackIntegration;
  };

  /**
   * Find integration by ID
   */
  findById = async (
    id: string,
    includeToken: boolean = false
  ): Promise<TenantCommunicationIntegration | SafeSlackIntegration | null> => {
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

    if (filters.tenantId !== undefined) {
      where.tenantId = filters.tenantId;
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
   * Find integration by tenant (most common query)
   */
  findByTenant = async (
    tenantId: string,
    communicationType: CommunicationType = CommunicationType.SLACK,
    includeToken: boolean = false
  ): Promise<TenantCommunicationIntegration | SafeSlackIntegration | null> => {
    const integration = await this.model.findOne({
      where: {
        tenantId,
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
   * Find integration by workspace
   */
  findByWorkspace = async (
    tenantId: string,
    workspaceId: string
  ): Promise<SafeSlackIntegration | null> => {
    const integration = await this.model.findOne({
      where: { tenantId, slackWorkspaceId: workspaceId }
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
  count = async (tenantId: string, communicationType?: CommunicationType): Promise<number> => {
    const where: Record<string, unknown> = { tenantId };
    
    if (communicationType !== undefined) {
      where.communicationType = communicationType;
    }

    return await this.model.count({ where });
  };
}

