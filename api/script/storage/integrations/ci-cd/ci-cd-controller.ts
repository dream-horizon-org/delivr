/**
 * CI/CD Integration Database Controller
 * 
 * Handles all database operations for CI/CD integrations
 * This is the DATA ACCESS LAYER - only DB operations, no business logic
 */

import { customAlphabet } from 'nanoid';
import { Model, ModelStatic } from 'sequelize';
import {
  CICDProviderType,
  CreateCICDIntegrationDto,
  UpdateCICDIntegrationDto,
  CICDIntegrationFilters,
  TenantCICDIntegration,
  SafeCICDIntegration,
  VerificationStatus,
} from './ci-cd-types';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-', 21);

// ============================================================================
// Controller Class
// ============================================================================

export class CICDIntegrationController {
  private model: ModelStatic<Model<any, any>>;

  constructor(model: ModelStatic<Model<any, any>>) {
    this.model = model;
  }

  async create(data: CreateCICDIntegrationDto): Promise<SafeCICDIntegration> {
    const integration = await this.model.create({
      id: nanoid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    });

    return this.toSafeObject(integration.toJSON());
  }

  async findById(id: string, includeSecrets: boolean = false): Promise<TenantCICDIntegration | SafeCICDIntegration | null> {
    const integration = await this.model.findByPk(id);
    if (!integration) return null;
    const data = integration.toJSON();
    return includeSecrets ? data : this.toSafeObject(data);
  }

  async findAll(filters: CICDIntegrationFilters = {}): Promise<SafeCICDIntegration[]> {
    const where: any = {};
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.providerType) where.providerType = filters.providerType;
    if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;
    if (filters.hostUrl) where.hostUrl = filters.hostUrl;

    const results = await this.model.findAll({ where, order: [['createdAt', 'DESC']] });
    return results.map(r => this.toSafeObject(r.toJSON()));
  }

  async findByTenantAndProvider(tenantId: string, providerType: CICDProviderType): Promise<SafeCICDIntegration | null> {
    const integration = await this.model.findOne({
      where: { tenantId, providerType },
      order: [['createdAt', 'DESC']]
    });
    if (!integration) return null;
    return this.toSafeObject(integration.toJSON());
  }

  async findByTenantAndProviderWithSecrets(tenantId: string, providerType: CICDProviderType): Promise<TenantCICDIntegration | null> {
    const integration = await this.model.findOne({
      where: { tenantId, providerType },
      order: [['createdAt', 'DESC']]
    });
    if (!integration) return null;
    return integration.toJSON() as TenantCICDIntegration;
  }

  async update(id: string, data: UpdateCICDIntegrationDto): Promise<SafeCICDIntegration | null> {
    const integration = await this.model.findByPk(id);
    if (!integration) return null;
    await integration.update(data);
    return this.toSafeObject(integration.toJSON());
  }

  async updateVerificationStatus(id: string, status: VerificationStatus, error?: string): Promise<SafeCICDIntegration | null> {
    const integration = await this.model.findByPk(id);
    if (!integration) return null;
    await integration.update({
      verificationStatus: status,
      lastVerifiedAt: new Date(),
      verificationError: error || null,
    });
    return this.toSafeObject(integration.toJSON());
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.destroy({ where: { id } });
    return result > 0;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Convert a CI/CD integration to a safe object
   * 
   * @param data - Integration data
   * @returns Safe integration object
   */
  private toSafeObject(data: any): SafeCICDIntegration {
    const { apiToken, headerValue, ...safe } = data;
    return {
      ...safe
    };
  }
}


