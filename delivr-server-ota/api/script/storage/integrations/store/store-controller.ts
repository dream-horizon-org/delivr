/**
 * Store Integration Database Controller
 * 
 * Handles all database operations for store integrations
 * This is the DATA ACCESS LAYER - only DB operations, no business logic
 */

import { customAlphabet } from 'nanoid';
import { Model, ModelStatic } from 'sequelize';
import {
  StoreType,
  IntegrationStatus,
  CredentialType,
  CreateStoreIntegrationDto,
  UpdateStoreIntegrationDto,
  StoreIntegrationFilters,
  StoreIntegration,
  SafeStoreIntegration,
  CreateStoreCredentialDto,
  StoreCredential,
} from './store-types';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-', 21);

// ============================================================================
// Store Integration Controller
// ============================================================================

export class StoreIntegrationController {
  private integrationModel: ModelStatic<Model<any, any>>;
  private credentialModel: ModelStatic<Model<any, any>>;

  constructor(
    integrationModel: ModelStatic<Model<any, any>>,
    credentialModel: ModelStatic<Model<any, any>>
  ) {
    this.integrationModel = integrationModel;
    this.credentialModel = credentialModel;
  }

  async create(data: CreateStoreIntegrationDto): Promise<SafeStoreIntegration> {
    const integration = await this.integrationModel.create({
      id: nanoid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    });

    return this.toSafeObject(integration.toJSON());
  }

  async findById(id: string): Promise<SafeStoreIntegration | null> {
    const integration = await this.integrationModel.findByPk(id);
    if (!integration) return null;
    return this.toSafeObject(integration.toJSON());
  }

  async findAll(filters: StoreIntegrationFilters = {}): Promise<SafeStoreIntegration[]> {
    const where: any = {};
    if (filters.appId) where.appId = filters.appId;
    if (filters.storeType) where.storeType = filters.storeType;
    if (filters.platform) where.platform = filters.platform;
    if (filters.status) where.status = filters.status;
    if (filters.appIdentifier) where.appIdentifier = filters.appIdentifier;

    const results = await this.integrationModel.findAll({ 
      where, 
      order: [['createdAt', 'DESC']] 
    });
    
    const integrations = results.map(r => this.toSafeObject(r.toJSON()));
    
    // Check if each integration has credentials
    for (const integration of integrations) {
      const credentialCount = await this.credentialModel.count({
        where: { integrationId: integration.id }
      });
      integration.hasCredentials = credentialCount > 0;
    }
    
    return integrations;
  }

  async findByTenantAndStoreType(
    appId: string, 
    storeType: StoreType
  ): Promise<SafeStoreIntegration[]> {
    const results = await this.integrationModel.findAll({
      where: { appId, storeType },
      order: [['createdAt', 'DESC']]
    });
    return results.map(r => this.toSafeObject(r.toJSON()));
  }

  async findByTenantStoreTypeAndAppIdentifier(
    appId: string,
    storeType: StoreType,
    appIdentifier: string
  ): Promise<SafeStoreIntegration | null> {
    const integration = await this.integrationModel.findOne({
      where: { appId, storeType, appIdentifier }
    });
    if (!integration) return null;
    return this.toSafeObject(integration.toJSON());
  }

  async update(id: string, data: UpdateStoreIntegrationDto): Promise<SafeStoreIntegration | null> {
    const integration = await this.integrationModel.findByPk(id);
    if (!integration) return null;
    
    await integration.update({
      ...data,
      updatedAt: new Date(),
    });
    
    return this.toSafeObject(integration.toJSON());
  }

  async updateStatus(
    id: string, 
    status: IntegrationStatus
  ): Promise<SafeStoreIntegration | null> {
    const integration = await this.integrationModel.findByPk(id);
    if (!integration) return null;
    
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (status === IntegrationStatus.VERIFIED) {
      updateData.lastVerifiedAt = new Date();
    }
    
    await integration.update(updateData);
    return this.toSafeObject(integration.toJSON());
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.integrationModel.destroy({ where: { id } });
    return result > 0;
  }

  private toSafeObject(data: StoreIntegration): SafeStoreIntegration {
    // Include createdByAccountId - it's metadata, not sensitive data
    return {
      ...data,
      hasCredentials: false // Default to false; will be set to true by findAll() if credentials exist
    };
  }
}

// ============================================================================
// Store Credential Controller
// ============================================================================

export class StoreCredentialController {
  private model: ModelStatic<Model<any, any>>;

  constructor(model: ModelStatic<Model<any, any>>) {
    this.model = model;
  }

  async create(data: CreateStoreCredentialDto): Promise<StoreCredential> {
    const credential = await this.model.create({
      id: nanoid(),
      createdAt: new Date(),
      encryptionScheme: data.encryptionScheme || 'AES-256-GCM',
      ...data,
    });

    return credential.toJSON() as StoreCredential;
  }

  async findByIntegrationId(integrationId: string): Promise<StoreCredential | null> {
    const credential = await this.model.findOne({
      where: { integrationId },
      order: [['createdAt', 'DESC']]
    });
    if (!credential) return null;
    return credential.toJSON() as StoreCredential;
  }

  async deleteByIntegrationId(integrationId: string): Promise<boolean> {
    const result = await this.model.destroy({ where: { integrationId } });
    return result > 0;
  }

  async rotate(integrationId: string, newCredential: CreateStoreCredentialDto): Promise<StoreCredential> {
    const existing = await this.findByIntegrationId(integrationId);
    if (existing) {
      await this.model.update(
        { rotatedAt: new Date() },
        { where: { id: existing.id } }
      );
    }
    return this.create(newCredential);
  }
}

