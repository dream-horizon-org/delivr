/**
 * Test Management Config Service
 * Business logic for test management configurations
 */

import { TenantTestManagementIntegrationRepository } from '~models/integrations/test-management/tenant-integration';
import { TestManagementConfigRepository } from '~models/integrations/test-management/test-management-config';
import type {
  CreateTestManagementConfigDto,
  TestManagementConfig,
  UpdateTestManagementConfigDto
} from '~types/integrations/test-management/test-management-config';
import { TestPlatform, TEST_PLATFORMS } from '~types/integrations/test-management/platform.interface';

export class TestManagementConfigService {
  constructor(
    private readonly configRepo: TestManagementConfigRepository,
    private readonly integrationRepo: TenantTestManagementIntegrationRepository
  ) {}

  /**
   * Validate test management config data
   */
  validateConfig(data: CreateTestManagementConfigDto): {
    integration: string;
    isValid: boolean;
    errors: Array<{ field: string; message: string }>;
  } {
    const errors: Array<{ field: string; message: string }> = [];

    // 1. Validate tenantId - not blank or null
    if (!data.tenantId || data.tenantId.trim() === '') {
      errors.push({
        field: 'tenantId',
        message: 'Tenant ID is required and cannot be blank'
      });
    }

    // 2. Validate integrationId - not blank or null
    if (!data.integrationId || data.integrationId.trim() === '') {
      errors.push({
        field: 'integrationId',
        message: 'Integration ID is required when test management is enabled'
      });
    }

    // 3. Validate createdByAccountId - not blank or null
    if (!data.createdByAccountId || data.createdByAccountId.trim() === '') {
      errors.push({
        field: 'createdByAccountId',
        message: 'Created by account ID is required and cannot be blank'
      });
    }

    // 4. Validate platformConfigurations is an array
    if (!Array.isArray(data.platformConfigurations)) {
      errors.push({
        field: 'platformConfigurations',
        message: 'Platform configurations must be an array'
      });
    } else {
      // 5. Validate each platform in platformConfigurations
      data.platformConfigurations.forEach((config, index) => {
        if (!config.platform || !TEST_PLATFORMS.includes(config.platform as TestPlatform)) {
          errors.push({
            field: `platformConfigurations[${index}].platform`,
            message: `Invalid platform value. Must be one of: ${TEST_PLATFORMS.join(', ')}`
          });
        }
      });
    }

    return {
      integration: 'testManagement',
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create test management config
   */
  async createConfig(data: CreateTestManagementConfigDto): Promise<TestManagementConfig> {
    const integration = await this.integrationRepo.findById(data.integrationId);

    if (!integration) {
      throw new Error(`Test management integration not found: ${data.integrationId}`);
    }

    const tenantMatches = integration.tenantId === data.tenantId;

    if (!tenantMatches) {
      throw new Error('Integration does not belong to the specified tenant');
    }

    return this.configRepo.create(data);
  }

  /**
   * Get config by ID
   */
  async getConfigById(id: string): Promise<TestManagementConfig | null> {
    return this.configRepo.findById(id);
  }

  /**
   * List configs by tenant ID
   */
  async listConfigsByTenant(tenantId: string): Promise<TestManagementConfig[]> {
    return this.configRepo.findByTenantId(tenantId);
  }

  /**
   * Update config
   */
  async updateConfig(
    id: string,
    data: UpdateTestManagementConfigDto
  ): Promise<TestManagementConfig | null> {
    const config = await this.configRepo.findById(id);

    if (!config) {
      return null;
    }

    return this.configRepo.update(id, data);
  }

  /**
   * Delete config
   */
  async deleteConfig(id: string): Promise<boolean> {
    const config = await this.configRepo.findById(id);

    if (!config) {
      return false;
    }

    return this.configRepo.delete(id);
  }
}

