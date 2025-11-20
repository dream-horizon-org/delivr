/**
 * JIRA Integration Database Controllers
 * 
 * Handles all database operations for JIRA integrations
 * Split into two controllers:
 * - JiraIntegrationController: Manages credentials (jira_integrations table)
 * - JiraConfigurationController: Manages configurations (jira_configurations table)
 * 
 * This is the DATA ACCESS LAYER - only DB operations, no business logic
 */

import { customAlphabet } from 'nanoid';
import { Model, ModelStatic } from 'sequelize';
import { 
  CreateJiraIntegrationDto, 
  UpdateJiraIntegrationDto,
  JiraIntegrationFilters,
  JiraIntegration,
  SafeJiraIntegration,
  JiraVerificationStatus,
  JiraIntegrationType,
  CreateJiraConfigurationDto,
  UpdateJiraConfigurationDto,
  JiraConfigurationFilters,
  JiraConfiguration,
  PlatformsConfigMap,
  EpicPlatform,
  PlatformJiraConfig
} from './jira-types';

// Create nanoid generator with custom alphabet (alphanumeric + underscore + hyphen)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-', 21);

// ============================================================================
// JIRA INTEGRATION CONTROLLER (Credentials)
// ============================================================================

export class JiraIntegrationController {
  private model: ModelStatic<Model<any, any>>;

  constructor(model: ModelStatic<Model<any, any>>) {
    this.model = model;
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  /**
   * Create a new JIRA integration (credentials)
   * 
   * @param data - Integration data (credentials only)
   * @returns Created integration (safe version without tokens)
   */
  async create(data: CreateJiraIntegrationDto): Promise<SafeJiraIntegration> {
    const integration = await this.model.create({
      id: nanoid(),
      tenantId: data.tenantId,
      jiraInstanceUrl: data.jiraInstanceUrl,
      apiToken: data.apiToken,  // TODO: Encrypt this before storing
      email: data.email,
      jiraType: data.jiraType || JiraIntegrationType.JIRA_CLOUD,
      isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
      verificationStatus: JiraVerificationStatus.NOT_VERIFIED,
      lastVerifiedAt: null,
      createdByAccountId: data.createdByAccountId
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
   * @param includeTokens - Include sensitive tokens (default: false)
   * @returns Integration or null
   */
  async findById(
    id: string, 
    includeTokens: boolean = false
  ): Promise<JiraIntegration | SafeJiraIntegration | null> {
    const integration = await this.model.findOne({
      where: { id }
    });
    
    if (!integration) return null;
    
    const data = integration.toJSON();
    return includeTokens ? data : this.toSafeObject(data);
  }

  /**
   * Find integration by tenant ID (most common query)
   * 
   * @param tenantId - Tenant ID
   * @param includeTokens - Include sensitive tokens (default: false)
   * @returns Integration or null
   */
  async findByTenantId(
    tenantId: string,
    includeTokens: boolean = false
  ): Promise<JiraIntegration | SafeJiraIntegration | null> {
    const integration = await this.model.findOne({
      where: { tenantId }
    });
    
    if (!integration) return null;
    
    const data = integration.toJSON();
    return includeTokens ? data : this.toSafeObject(data);
  }

  /**
   * Find all integrations with filters
   * 
   * @param filters - Query filters
   * @returns Array of integrations (safe version)
   */
  async findAll(filters: JiraIntegrationFilters = {}): Promise<SafeJiraIntegration[]> {
    const where: any = {};
    
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (typeof filters.isEnabled === 'boolean') where.isEnabled = filters.isEnabled;
    if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;
    if (filters.jiraType) where.jiraType = filters.jiraType;

    const integrations = await this.model.findAll({ 
      where,
      order: [['createdAt', 'DESC']]
    });

    return integrations.map(i => this.toSafeObject(i.toJSON()));
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * Update integration by tenant ID
   * 
   * @param tenantId - Tenant ID
   * @param data - Update data (credentials only)
   * @returns Updated integration (safe version) or null if not found
   */
  async update(
    tenantId: string, 
    data: UpdateJiraIntegrationDto
  ): Promise<SafeJiraIntegration | null> {
    const integration = await this.model.findOne({
      where: { tenantId }
    });
    
    if (!integration) return null;

    // Build update payload
    const updatePayload: any = {};
    
    if (data.jiraInstanceUrl !== undefined) updatePayload.jiraInstanceUrl = data.jiraInstanceUrl;
    if (data.apiToken !== undefined) updatePayload.apiToken = data.apiToken;  // TODO: Encrypt
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.jiraType !== undefined) updatePayload.jiraType = data.jiraType;
    if (data.isEnabled !== undefined) updatePayload.isEnabled = data.isEnabled;

    await integration.update(updatePayload);
    return this.toSafeObject(integration.toJSON());
  }

  /**
   * Update verification status
   * 
   * @param tenantId - Tenant ID
   * @param status - New verification status
   * @returns Updated integration
   */
  async updateVerificationStatus(
    tenantId: string,
    status: JiraVerificationStatus
  ): Promise<SafeJiraIntegration | null> {
    const integration = await this.model.findOne({
      where: { tenantId }
    });
    
    if (!integration) return null;

    await integration.update({
      verificationStatus: status,
      lastVerifiedAt: new Date()
    });

    return this.toSafeObject(integration.toJSON());
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Soft delete integration (set isEnabled = false)
   * 
   * @param tenantId - Tenant ID
   * @returns True if deleted, false if not found
   */
  async softDelete(tenantId: string): Promise<boolean> {
    const integration = await this.model.findOne({
      where: { tenantId }
    });
    
    if (!integration) return false;

    await integration.update({ isEnabled: false });
    return true;
  }

  /**
   * Hard delete integration (permanent removal)
   * ⚠️ Use with caution! This cannot be undone.
   * 
   * @param tenantId - Tenant ID
   * @returns True if deleted, false if not found
   */
  async hardDelete(tenantId: string): Promise<boolean> {
    const result = await this.model.destroy({ 
      where: { tenantId } 
    });
    return result > 0;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * Check if integration exists for tenant
   * 
   * @param tenantId - Tenant ID
   * @returns True if exists
   */
  async exists(tenantId: string): Promise<boolean> {
    const count = await this.model.count({ 
      where: { tenantId } 
    });
    return count > 0;
  }

  /**
   * Count integrations with filters
   * 
   * @param filters - Query filters
   * @returns Count
   */
  async count(filters: JiraIntegrationFilters = {}): Promise<number> {
    const where: any = {};
    
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (typeof filters.isEnabled === 'boolean') where.isEnabled = filters.isEnabled;
    
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
  private toSafeObject(data: any): SafeJiraIntegration {
    const safeData: SafeJiraIntegration = {
      id: data.id,
      tenantId: data.tenantId,
      jiraInstanceUrl: data.jiraInstanceUrl,
      email: data.email,
      jiraType: data.jiraType,
      isEnabled: data.isEnabled,
      verificationStatus: data.verificationStatus as JiraVerificationStatus,
      lastVerifiedAt: data.lastVerifiedAt,
      createdByAccountId: data.createdByAccountId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      hasValidToken: !!data.apiToken
    };
    
    return safeData;
  }
}

// ============================================================================
// JIRA CONFIGURATION CONTROLLER (Reusable Configs)
// ============================================================================

export class JiraConfigurationController {
  private model: ModelStatic<Model<any, any>>;

  constructor(model: ModelStatic<Model<any, any>>) {
    this.model = model;
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  /**
   * Create a new JIRA configuration
   * 
   * @param data - Configuration data
   * @returns Created configuration
   */
  async create(data: CreateJiraConfigurationDto): Promise<JiraConfiguration> {
    const config = await this.model.create({
      id: nanoid(),
      tenantId: data.tenantId,
      configName: data.configName,
      description: data.description,
      platformsConfig: data.platformsConfig,
      isActive: true,
      createdByAccountId: data.createdByAccountId
    });

    return config.toJSON() as JiraConfiguration;
  }

  // ==========================================================================
  // READ
  // ==========================================================================

  /**
   * Find configuration by ID
   * 
   * @param id - Configuration ID
   * @returns Configuration or null
   */
  async findById(id: string): Promise<JiraConfiguration | null> {
    const config = await this.model.findOne({
      where: { id }
    });
    
    if (!config) return null;
    return config.toJSON() as JiraConfiguration;
  }

  /**
   * Find configuration by tenant ID and config name
   * 
   * @param tenantId - Tenant ID
   * @param configName - Configuration name
   * @returns Configuration or null
   */
  async findByName(tenantId: string, configName: string): Promise<JiraConfiguration | null> {
    const config = await this.model.findOne({
      where: { 
        tenantId,
        configName 
      }
    });
    
    if (!config) return null;
    return config.toJSON() as JiraConfiguration;
  }

  /**
   * Find all configurations with filters
   * 
   * @param filters - Query filters
   * @returns Array of configurations
   */
  async findAll(filters: JiraConfigurationFilters = {}): Promise<JiraConfiguration[]> {
    const where: any = {};
    
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;
    if (filters.configName) where.configName = filters.configName;

    const configs = await this.model.findAll({ 
      where,
      order: [['createdAt', 'DESC']]
    });

    return configs.map(c => c.toJSON() as JiraConfiguration);
  }

  /**
   * Find all active configurations for a tenant
   * 
   * @param tenantId - Tenant ID
   * @returns Array of active configurations
   */
  async findByTenantId(tenantId: string): Promise<JiraConfiguration[]> {
    return this.findAll({ tenantId, isActive: true });
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * Update configuration by ID
   * 
   * @param id - Configuration ID
   * @param data - Update data
   * @returns Updated configuration or null if not found
   */
  async update(
    id: string, 
    data: UpdateJiraConfigurationDto
  ): Promise<JiraConfiguration | null> {
    const config = await this.model.findOne({
      where: { id }
    });
    
    if (!config) return null;

    // Build update payload
    const updatePayload: any = {};
    
    if (data.configName !== undefined) updatePayload.configName = data.configName;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.platformsConfig !== undefined) updatePayload.platformsConfig = data.platformsConfig;
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

    await config.update(updatePayload);
    return config.toJSON() as JiraConfiguration;
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Soft delete configuration (set isActive = false)
   * 
   * @param id - Configuration ID
   * @returns True if deleted, false if not found
   */
  async softDelete(id: string): Promise<boolean> {
    const config = await this.model.findOne({
      where: { id }
    });
    
    if (!config) return false;

    await config.update({ isActive: false });
    return true;
  }

  /**
   * Hard delete configuration (permanent removal)
   * ⚠️ Use with caution! This cannot be undone.
   * ⚠️ Will fail if there are epics referencing this config (FK constraint)
   * 
   * @param id - Configuration ID
   * @returns True if deleted, false if not found
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await this.model.destroy({ 
      where: { id } 
    });
    return result > 0;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * Check if configuration exists
   * 
   * @param id - Configuration ID
   * @returns True if exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.model.count({ 
      where: { id } 
    });
    return count > 0;
  }

  /**
   * Count configurations with filters
   * 
   * @param filters - Query filters
   * @returns Count
   */
  async count(filters: JiraConfigurationFilters = {}): Promise<number> {
    const where: any = {};
    
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;
    
    return await this.model.count({ where });
  }

  /**
   * Resolve platform configuration from a configuration
   * Extracts platform-specific settings from the platformsConfig JSON
   * 
   * @param configId - Configuration ID
   * @param platform - Platform to resolve
   * @returns Platform configuration or null
   */
  async resolvePlatformConfig(
    configId: string, 
    platform: EpicPlatform
  ): Promise<PlatformJiraConfig | null> {
    const config = await this.findById(configId);
    
    if (!config) return null;
    
    const platformConfig = config.platformsConfig[platform];
    
    return platformConfig || null;
  }
}
