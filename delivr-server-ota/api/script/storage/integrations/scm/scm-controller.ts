/**
 * SCM Integration Database Controller
 * 
 * Handles all database operations for SCM integrations
 * This is the DATA ACCESS LAYER - only DB operations, no business logic
 */

import { customAlphabet } from 'nanoid';
import { Model, ModelStatic } from 'sequelize';
import { 
  CreateSCMIntegrationDto, 
  UpdateSCMIntegrationDto,
  SCMIntegrationFilters,
  TenantSCMIntegration,
  SafeSCMIntegration,
  VerificationStatus
} from './scm-types';
import { decryptFromStorage } from '../../../utils/encryption';

// Create nanoid generator with custom alphabet (alphanumeric + underscore + hyphen)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-', 21);

// ============================================================================
// Controller Class
// ============================================================================

export class SCMIntegrationController {
  private model: ModelStatic<Model<any, any>>;

  constructor(model: ModelStatic<Model<any, any>>) {
    this.model = model;
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  /**
   * Create a new SCM integration
   * 
   * @param data - Integration data
   * @returns Created integration (safe version without tokens)
   */
  async create(data: CreateSCMIntegrationDto): Promise<SafeSCMIntegration> {
    const integration = await this.model.create({
      id: nanoid(),
      ...data,
      scmType: data.scmType || 'GITHUB',
      defaultBranch: data.defaultBranch || 'main',
      webhookEnabled: data.webhookEnabled || false,
      isActive: true,
      verificationStatus: data.verificationStatus ?? VerificationStatus.PENDING,
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
  ): Promise<TenantSCMIntegration | SafeSCMIntegration | null> {
    const integration = await this.model.findByPk(id);
    
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
  async findAll(filters: SCMIntegrationFilters = {}): Promise<SafeSCMIntegration[]> {
    const where: any = {};
    
    if (filters.appId) where.appId = filters.appId;
    if (filters.scmType) where.scmType = filters.scmType;
    if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;
    if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;
    if (filters.owner) where.owner = filters.owner;
    if (filters.repo) where.repo = filters.repo;

    const integrations = await this.model.findAll({ 
      where,
      order: [['createdAt', 'DESC']]
    });

    return integrations.map(i => this.toSafeObject(i.toJSON()));
  }

  /**
   * Find integration by repository
   * 
   * @param appId - app id
   * @param owner - GitHub org/username
   * @param repo - Repository name
   * @returns Integration or null
   */
  async findByRepository(
    appId: string, 
    owner: string,
    repo: string
  ): Promise<SafeSCMIntegration | null> {
    const integration = await this.model.findOne({
      where: { appId, owner, repo }
    });

    if (!integration) return null;
    return this.toSafeObject(integration.toJSON());
  }

  /**
   * Find active integration for tenant (most common query)
   * 
   * @param appId - app id
   * @returns First active integration or null
   */
  async findActiveByTenant(appId: string): Promise<SafeSCMIntegration | null> {
    const integration = await this.model.findOne({
      where: { 
        appId, 
        isActive: true 
      },
      order: [['createdAt', 'DESC']]
    });

    if (!integration) return null;
    return this.toSafeObject(integration.toJSON());
  }

  /**
   * Find active integration for tenant WITH TOKENS (for internal use only)
   * ⚠️ WARNING: Returns full integration including accessToken (decrypted from backend storage)
   * Only use this for server-side operations that need to make API calls
   * 
   * @param appId - app id
   * @returns First active integration with decrypted tokens or null
   */
  async findActiveByTenantWithTokens(appId: string): Promise<TenantSCMIntegration | null> {
    const integration = await this.model.findOne({
      where: { 
        appId, 
        isActive: true 
      },
      order: [['createdAt', 'DESC']]
    });

    if (!integration) return null;
    
    const json = integration.toJSON() as TenantSCMIntegration;
    
    // Decrypt tokens from backend storage (handles both backend and frontend formats)
    if (json.accessToken) {
      try {
        json.accessToken = decryptFromStorage(json.accessToken);
      } catch (error: any) {
        console.error('[SCM] Failed to decrypt accessToken, keeping encrypted value:', error.message);
        // Keep encrypted value - might be corrupted or in unexpected format
      }
    }
    if (json.webhookSecret) {
      try {
        json.webhookSecret = decryptFromStorage(json.webhookSecret);
      } catch (error: any) {
        console.error('[SCM] Failed to decrypt webhookSecret, keeping encrypted value:', error.message);
        // Keep encrypted value - might be corrupted or in unexpected format
      }
    }
    
    return json;
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
    data: UpdateSCMIntegrationDto
  ): Promise<SafeSCMIntegration | null> {
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
   * @param error - Error message (if verification failed)
   * @returns Updated integration
   */
  async updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    error?: string
  ): Promise<SafeSCMIntegration | null> {
    const integration = await this.model.findByPk(id);
    
    if (!integration) return null;

    await integration.update({
      verificationStatus: status,
      lastVerifiedAt: new Date(),
      verificationError: error || null,
    });

    return this.toSafeObject(integration.toJSON());
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Soft delete integration (set isActive = false)
   * 
   * @param id - Integration ID
   * @returns True if deleted, false if not found
   */
  async softDelete(id: string): Promise<boolean> {
    const integration = await this.model.findByPk(id);
    
    if (!integration) return false;

    await integration.update({ isActive: false });
    return true;
  }

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
   * @param appId - app id
   * @param activeOnly - Only count active integrations (default: true)
   * @returns Count
   */
  async count(appId: string, activeOnly: boolean = true): Promise<number> {
    const where: any = { appId };
    if (activeOnly) where.isActive = true;
    
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
  private toSafeObject(data: any): SafeSCMIntegration {
    const { accessToken, webhookSecret, ...safe } = data;
    console.log('webhookSecret', webhookSecret);
    
    return {
      ...safe,
      hasValidToken: !!accessToken, // Just indicate if token exists
    };
  }
}

