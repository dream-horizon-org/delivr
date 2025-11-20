/**
 * Test Management Config Type Definitions
 * Reusable test configurations for projects
 */

import type { TestPlatform } from '../platform.interface';

/**
 * Platform-specific test configuration
 */
export type PlatformConfiguration = {
  platform: TestPlatform;
  parameters: Record<string, unknown>;
};

/**
 * Test Management Config
 */
export type TestManagementConfig = {
  id: string;
  projectId: string;
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
  projectId: string;
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

