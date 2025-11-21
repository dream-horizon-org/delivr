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

export class TestManagementConfigService {
  constructor(
    private readonly configRepo: TestManagementConfigRepository,
    private readonly integrationRepo: TenantTestManagementIntegrationRepository
  ) {}

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

