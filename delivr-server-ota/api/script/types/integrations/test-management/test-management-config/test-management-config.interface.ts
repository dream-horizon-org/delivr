/**
 * Test Management Config Type Definitions
 * Reusable test configurations for tenants
 */

import type { PlatformConfigParameters } from '~services/integrations/test-management/providers/provider.interface';
import type { TestPlatform } from '../platform.interface';

/**
 * Platform-specific test configuration
 * Uses PlatformConfigParameters for type safety and consistency with provider layer
 * Note: runName and runDescription are NOT stored here - they are provided at test run creation time
 */
export type PlatformConfiguration = {
  platform: TestPlatform;
  parameters: PlatformConfigParameters;
};

/**
 * Test Management Config
 */
export type TestManagementConfig = {
  id: string;
  tenantId: string;
  integrationId: string;
  name: string;
  passThresholdPercent: number;
  platformConfigurations: PlatformConfiguration[];
  createdByAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * DTO for creating test management config
 */
export type CreateTestManagementConfigDto = {
  tenantId: string;
  integrationId: string;
  name: string;
  passThresholdPercent: number;
  platformConfigurations: PlatformConfiguration[];
  createdByAccountId?: string;
};

/**
 * DTO for updating test management config
 */
export type UpdateTestManagementConfigDto = {
  name?: string;
  passThresholdPercent?: number;
  platformConfigurations?: PlatformConfiguration[];
};

