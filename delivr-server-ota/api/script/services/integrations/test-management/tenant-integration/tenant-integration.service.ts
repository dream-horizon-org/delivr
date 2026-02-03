import { TEST_MANAGEMENT_ERROR_MESSAGES } from '~controllers/integrations/test-management/constants';
import type { TenantTestManagementIntegrationRepository } from '~models/integrations/test-management/tenant-integration/tenant-integration.repository';
import type {
  CreateTenantTestManagementIntegrationDto,
  TenantTestManagementIntegration,
  TenantTestManagementIntegrationConfig,
  TestManagementProviderType,
  UpdateTenantTestManagementIntegrationDto,
  VerifyTenantTestManagementIntegrationResult
} from '~types/integrations/test-management/tenant-integration';
import { VerificationStatus } from '~types/integrations/test-management/tenant-integration';
import { ProviderFactory } from '../providers/provider.factory';

/**
 * Test Management Integration Service
 * 
 * Responsibilities:
 * - Manage test management integration credentials (CRUD)
 * - Verify integration connectivity
 * 
 * This service manages the credentials needed to connect to
 * external test management providers (Checkmate, TestRail, etc.)
 */
export class TestManagementIntegrationService {
  constructor(
    private readonly repository:TenantTestManagementIntegrationRepository
  ) {}

  /**
   * Create a new tenant integration
   */
  async createTenantIntegration(
    data: CreateTenantTestManagementIntegrationDto
  ): Promise<TenantTestManagementIntegration> {
    // Validate credentials before creating - prevents saving broken integrations
    const provider = ProviderFactory.getProvider(data.providerType);
    const validationResult = await provider.validateConfig(data.config);
    
    if (!validationResult.isValid) {
      const error: any = new Error(validationResult.message);
      error.details = validationResult.details;
      throw error;
    }
    
    return await this.repository.create(data);
  }

  /**
   * List all integrations for a tenant
   */
  async listTenantIntegrations(tenantId: string): Promise<TenantTestManagementIntegration[]> {
    return await this.repository.findAll({ tenantId });
  }

  /**
   * Get a specific integration by ID
   */
  async getTenantIntegration(integrationId: string): Promise<TenantTestManagementIntegration | null> {
    return await this.repository.findById(integrationId);
  }

  /**
   * Update an existing integration
   */
  async updateTenantIntegration(
    integrationId: string,
    data: UpdateTenantTestManagementIntegrationDto
  ): Promise<TenantTestManagementIntegration | null> {
    // If config is being updated, validate it
    const configIsBeingUpdated = data.config !== undefined;
    
    if (configIsBeingUpdated) {
      const integration = await this.repository.findById(integrationId);
      
      if (!integration) {
        return null;
      }
      
      // Merge config to get final config for validation
      const mergedConfig = {
        ...integration.config,
        ...data.config
      };
      
      // Validate merged config - ensures credentials work before saving
      const provider = ProviderFactory.getProvider(integration.providerType);
      const validationResult = await provider.validateConfig(mergedConfig);
      
      if (!validationResult.isValid) {
        const error: any = new Error(validationResult.message);
        error.details = validationResult.details;
        throw error;
      }
    }
    
    return await this.repository.update(integrationId, data);
  }

  /**
   * Delete an integration
   */
  async deleteTenantIntegration(integrationId: string): Promise<boolean> {
    return await this.repository.delete(integrationId);
  }

  /**
   * Verify an integration by testing connectivity
   */
  async verifyTenantIntegration(
    integrationId: string
  ): Promise<VerifyTenantTestManagementIntegrationResult> {
    const integration = await this.repository.findById(integrationId);
    
    if (!integration) {
      return {
        success: false,
        status: VerificationStatus.ERROR,
        message: 'Integration not found'
      };
    }

    try {
      const provider = ProviderFactory.getProvider(integration.providerType);
      const validationResult = await provider.validateConfig(integration.config);
      
      return {
        success: validationResult.isValid,
        status: validationResult.isValid ? VerificationStatus.VALID : VerificationStatus.INVALID,
        message: validationResult.message,
        details: validationResult.details
      };
    } catch (error) {
      return {
        success: false,
        status: VerificationStatus.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Verify credentials without saving (stateless verification)
   * Used before creating an integration to test credentials
   */
  async verifyCredentials(
    providerType: TestManagementProviderType,
    config:TenantTestManagementIntegrationConfig
  ): Promise<VerifyTenantTestManagementIntegrationResult> {
    try {
      const provider = ProviderFactory.getProvider(providerType);
      const validationResult = await provider.validateConfig(config);
      
      return {
        success: validationResult.isValid,
        status: validationResult.isValid ? VerificationStatus.VALID : VerificationStatus.INVALID,
        message: validationResult.message,
        details: validationResult.details
      };
    } catch (error) {
      return {
        success: false,
        status: VerificationStatus.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

