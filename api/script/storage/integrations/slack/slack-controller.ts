/**
 * Slack Integration Database Controller
 * 
 * Handles all database operations for Slack/Communication integrations
 * This is the DATA ACCESS LAYER - only DB operations, no business logic
 */

import { customAlphabet } from 'nanoid';
import { Model, ModelStatic } from 'sequelize';
import { 
  CreateSlackIntegrationDto, 
  UpdateSlackIntegrationDto,
  SlackIntegrationFilters,
  TenantCommunicationIntegration,
  SafeSlackIntegration,
  VerificationStatus,
  CommunicationType
} from './slack-types';

// Create nanoid generator with custom alphabet (alphanumeric + underscore + hyphen)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-', 21);

// ============================================================================
// Controller Class
// ============================================================================

export class SlackIntegrationController {
  private model: ModelStatic<Model<any, any>>;

  constructor(model: ModelStatic<Model<any, any>>) {
    this.model = model;
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  /**
   * Create a new Slack integration
   * 
   * @param data - Integration data
   * @returns Created integration (safe version without tokens)
   */
  async create(data: CreateSlackIntegrationDto): Promise<SafeSlackIntegration> {
    const integration = await this.model.create({
      id: nanoid(),
      ...data,
      communicationType: data.communicationType || CommunicationType.SLACK,
      verificationStatus: VerificationStatus.PENDING,
    });

    return this.toSafeObject(integration.toJSON());
  }

  // ==========================================================================
  // READ
  // ==========================================================================

  /**
   * Find integration by ID
   * 
   * @param id - Integration ID
   * @param includeToken - Include sensitive token (default: false)
   * @returns Integration or null
   */
  async findById(
    id: string, 
    includeToken: boolean = false
  ): Promise<TenantCommunicationIntegration | SafeSlackIntegration | null> {
    const integration = await this.model.findByPk(id);
    
    if (!integration) return null;
    
    const data = integration.toJSON();
    return includeToken ? data : this.toSafeObject(data);
  }

  /**
   * Find all integrations with filters
   * 
   * @param filters - Query filters
   * @returns Array of integrations (safe version)
   */
  async findAll(filters: SlackIntegrationFilters = {}): Promise<SafeSlackIntegration[]> {
    const where: any = {};
    
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.communicationType) where.communicationType = filters.communicationType;
    if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;
    if (filters.workspaceId) where.slackWorkspaceId = filters.workspaceId;

    const integrations = await this.model.findAll({ 
      where,
      order: [['createdAt', 'DESC']]
    });

    return integrations.map(i => this.toSafeObject(i.toJSON()));
  }

  /**
   * Find integration by tenant (most common query)
   * 
   * @param tenantId - Tenant ID
   * @param communicationType - Filter by type (default: SLACK)
   * @returns Integration or null
   */
  async findByTenant(
    tenantId: string,
    communicationType: CommunicationType = CommunicationType.SLACK
  ): Promise<SafeSlackIntegration | null> {
    const integration = await this.model.findOne({
      where: { 
        tenantId, 
        communicationType
      },
      order: [['createdAt', 'DESC']]
    });

    if (!integration) return null;
    return this.toSafeObject(integration.toJSON());
  }

  /**
   * Find integration by workspace
   * 
   * @param tenantId - Tenant ID
   * @param workspaceId - Slack Workspace ID
   * @returns Integration or null
   */
  async findByWorkspace(
    tenantId: string, 
    workspaceId: string
  ): Promise<SafeSlackIntegration | null> {
    const integration = await this.model.findOne({
      where: { tenantId, slackWorkspaceId: workspaceId }
    });

    if (!integration) return null;
    return this.toSafeObject(integration.toJSON());
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * Update integration
   * 
   * @param id - Integration ID
   * @param data - Update data
   * @returns Updated integration (safe version)
   */
  async update(
    id: string, 
    data: UpdateSlackIntegrationDto
  ): Promise<SafeSlackIntegration | null> {
    const integration = await this.model.findByPk(id);
    
    if (!integration) return null;

    await integration.update(data);
    return this.toSafeObject(integration.toJSON());
  }

  /**
   * Update verification status
   * 
   * @param id - Integration ID
   * @param status - New verification status
   * @returns Updated integration
   */
  async updateVerificationStatus(
    id: string,
    status: VerificationStatus
  ): Promise<SafeSlackIntegration | null> {
    const integration = await this.model.findByPk(id);
    
    if (!integration) return null;

    await integration.update({
      verificationStatus: status,
    });

    return this.toSafeObject(integration.toJSON());
  }

  /**
   * Update channels list
   * 
   * @param id - Integration ID
   * @param channels - Array of Slack channels
   * @returns Updated integration
   */
  async updateChannels(
    id: string,
    channels: any[]
  ): Promise<SafeSlackIntegration | null> {
    const integration = await this.model.findByPk(id);
    
    if (!integration) return null;

    await integration.update({
      slackChannels: channels,
    });

    return this.toSafeObject(integration.toJSON());
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Hard delete integration (permanent removal)
   * ⚠️ Use with caution! This cannot be undone.
   * 
   * @param id - Integration ID
   * @returns True if deleted, false if not found
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await this.model.destroy({ where: { id } });
    return result > 0;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * Check if integration exists
   * 
   * @param id - Integration ID
   * @returns True if exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.model.count({ where: { id } });
    return count > 0;
  }

  /**
   * Count integrations for a tenant
   * 
   * @param tenantId - Tenant ID
   * @param communicationType - Filter by type (optional)
   * @returns Count
   */
  async count(tenantId: string, communicationType?: CommunicationType): Promise<number> {
    const where: any = { tenantId };
    if (communicationType) where.communicationType = communicationType;
    
    return await this.model.count({ where });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Convert to safe object (remove sensitive tokens)
   * 
   * This is critical for security - never expose tokens in API responses!
   */
  private toSafeObject(data: any): SafeSlackIntegration {
    const { slackBotToken, ...safe } = data;
    
    // Return all fields except the sensitive token
    return safe;
  }
}

