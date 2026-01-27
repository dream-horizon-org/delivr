import { TEST_MANAGEMENT_ERROR_MESSAGES } from '~controllers/integrations/test-management/constants';
import type { TenantTestManagementIntegrationRepository } from '~models/integrations/test-management/tenant-integration/tenant-integration.repository';
import type {
  CreateAppTestManagementIntegrationDto,
  AppTestManagementIntegration,
  AppTestManagementIntegrationConfig,
  TestManagementProviderType,
  UpdateAppTestManagementIntegrationDto,
  VerifyAppTestManagementIntegrationResult
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
   * Create a new app integration
   */
  async createAppIntegration(
    data: CreateAppTestManagementIntegrationDto
  ): Promise<AppTestManagementIntegration> {
    // Validate credentials before creating - prevents saving broken integrations
    const provider = ProviderFactory.getProvider(data.providerType);
    const isValidConfig = await provider.validateConfig(data.config);
    
    if (!isValidConfig) {
      throw new Error(
        `Failed to connect to ${data.providerType}. ${TEST_MANAGEMENT_ERROR_MESSAGES.INVALID_CONFIG}`
      );
    }
    
    return await this.repository.create(data);
  }

  /**
   * @deprecated Use createAppIntegration instead
   * Kept for backward compatibility
   */
  createTenantIntegration = this.createAppIntegration;

  /**
   * List all integrations for an app
   */
  async listAppIntegrations(appId: string): Promise<AppTestManagementIntegration[]> {
    return await this.repository.findAll({ appId });
  }

  /**
   * @deprecated Use listAppIntegrations instead
   * Kept for backward compatibility
   */
  listTenantIntegrations = this.listAppIntegrations;

  /**
   * Get a specific integration by ID
   */
  async getAppIntegration(integrationId: string): Promise<AppTestManagementIntegration | null> {
    return await this.repository.findById(integrationId);
  }

  /**
   * @deprecated Use getAppIntegration instead
   * Kept for backward compatibility
   */
  getTenantIntegration = this.getAppIntegration;

  /**
   * Update an existing integration
   */
  async updateAppIntegration(
    integrationId: string,
    data: UpdateAppTestManagementIntegrationDto
  ): Promise<AppTestManagementIntegration | null> {
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
      const isValidConfig = await provider.validateConfig(mergedConfig);
      
      if (!isValidConfig) {
        throw new Error(
          `Failed to connect to ${integration.providerType}. ${TEST_MANAGEMENT_ERROR_MESSAGES.INVALID_CONFIG}`
        );
      }
    }
    
    return await this.repository.update(integrationId, data);
  }

  /**
   * @deprecated Use updateAppIntegration instead
   * Kept for backward compatibility
   */
  updateTenantIntegration = this.updateAppIntegration;

  /**
   * Delete an integration
   */
  async deleteAppIntegration(integrationId: string): Promise<boolean> {
    return await this.repository.delete(integrationId);
  }

  /**
   * @deprecated Use deleteAppIntegration instead
   * Kept for backward compatibility
   */
  deleteTenantIntegration = this.deleteAppIntegration;

  /**
   * Verify an integration by testing connectivity
   */
  async verifyAppIntegration(
    integrationId: string
  ): Promise<VerifyAppTestManagementIntegrationResult> {
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
      const isValid = await provider.validateConfig(integration.config);
      
      return {
        success: isValid,
        status: isValid ? VerificationStatus.VALID : VerificationStatus.INVALID,
        message: isValid 
          ? 'Integration verified successfully'
          : 'Failed to verify integration'
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
   * @deprecated Use verifyAppIntegration instead
   * Kept for backward compatibility
   */
  verifyTenantIntegration = this.verifyAppIntegration;

  /**
   * Verify credentials without saving (stateless verification)
   * Used before creating an integration to test credentials
   */
  async verifyCredentials(
    providerType: TestManagementProviderType,
    config: AppTestManagementIntegrationConfig
  ): Promise<VerifyAppTestManagementIntegrationResult> {
    try {
      const provider = ProviderFactory.getProvider(providerType);
      const isValid = await provider.validateConfig(config);
      
      return {
        success: isValid,
        status: isValid ? VerificationStatus.VALID : VerificationStatus.INVALID,
        message: isValid 
          ? 'Credentials verified successfully'
          : 'Failed to verify credentials'
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

