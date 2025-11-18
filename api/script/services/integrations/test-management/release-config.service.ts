import type { ProjectTestManagementIntegrationRepository } from '~models/integrations/test-management/project-integration/project-integration.repository';
import type { ReleaseConfigTestManagementRepository } from '~models/integrations/test-management/release-config/release-config.repository';
import type {
    ReleaseConfigTestManagement,
    ReleaseConfigTestManagementWithIntegration,
    SetReleaseConfigTestManagementDto
} from '~types/integrations/test-management/release-config/release-config.interface';

/**
 * Test Management Config Service
 * 
 * Manages test management configuration for release configs.
 * 
 * Responsibilities:
 * - Manage configuration CRUD operations
 * - Store integration, platform params, and threshold settings
 * 
 * Does NOT:
 * - Store or manage runIds (that's Release Management's job)
 * - Execute test operations (use TestManagementRunService for that)
 */
export class TestManagementConfigService {
  constructor(
    private readonly configRepo: ReleaseConfigTestManagementRepository,
    private readonly integrationRepo: ProjectTestManagementIntegrationRepository
  ) {}

  /**
   * Get configuration for a release config
   */
  async getConfig(releaseConfigId: string): Promise<ReleaseConfigTestManagementWithIntegration | null> {
    const config = await this.configRepo.findByReleaseConfigId(releaseConfigId);
    if (!config) {
      return null;
    }

    const integration = await this.integrationRepo.findById(config.integrationId);
    if (!integration) {
      return null;
    }

    return {
      ...config,
      integration: {
        id: integration.id,
        name: integration.name,
        providerType: integration.providerType
      }
    };
  }

  /**
   * Set/Update configuration (Pure UPSERT)
   * - If config exists for releaseConfigId: UPDATE
   * - If config doesn't exist: CREATE
   */
  async setConfig(data: SetReleaseConfigTestManagementDto): Promise<ReleaseConfigTestManagement> {
    return await this.configRepo.upsert(data);
  }

  /**
   * Delete configuration
   */
  async deleteConfig(releaseConfigId: string): Promise<boolean> {
    return await this.configRepo.deleteByReleaseConfigId(releaseConfigId);
  }

  /**
   * Get all release configs using a specific integration
   */
  async getReleaseConfigsUsingIntegration(integrationId: string): Promise<string[]> {
    return await this.configRepo.findReleaseConfigsByIntegrationId(integrationId);
  }
}

