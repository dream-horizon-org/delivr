/**
 * Integration Availability Utilities
 * 
 * Checks if integrations are configured for a release based on its release config.
 */

import type { Sequelize } from 'sequelize';

/**
 * Check integration availability for a release based on its release config
 * 
 * This function checks the release_configs table to see if integration config IDs are set.
 * If a config ID is not null, it means the integration is configured for this release.
 * 
 * @param releaseConfigId - The release config ID linked to the release
 * @param sequelize - Sequelize instance
 * @returns Object with integration availability flags
 * 
 * @example
 * const availability = await checkIntegrationAvailability(releaseConfigId, sequelize);
 * // {
 * //   hasProjectManagementIntegration: true,  // projectManagementConfigId is not null
 * //   hasTestPlatformIntegration: false       // testManagementConfigId is null
 * // }
 */
export async function checkIntegrationAvailability(
  releaseConfigId: string,
  sequelize: Sequelize
): Promise<{
  hasProjectManagementIntegration: boolean;
  hasTestPlatformIntegration: boolean;
}> {
  // Get the release config model (case-sensitive name must match model registration)
  const ReleaseConfigModel = sequelize.models.ReleaseConfig;
  
  if (!ReleaseConfigModel) {
    throw new Error('ReleaseConfig model not found in Sequelize');
  }

  // Fetch the release config
  const releaseConfig = await ReleaseConfigModel.findByPk(releaseConfigId);
  
  if (!releaseConfig) {
    throw new Error(`Release config not found: ${releaseConfigId}`);
  }

  // Convert to plain object
  const config = releaseConfig.toJSON();
  
  // Check if integration config IDs are set (not null)
  return {
    hasProjectManagementIntegration: config.projectManagementConfigId !== null && config.projectManagementConfigId !== undefined,
    hasTestPlatformIntegration: config.testManagementConfigId !== null && config.testManagementConfigId !== undefined
  };
}

