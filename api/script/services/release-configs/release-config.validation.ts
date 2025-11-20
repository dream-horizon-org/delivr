/**
 * Business logic validation for release configs
 */

import type { CreateReleaseConfigDto } from '~types/release-configs';

/**
 * Check if config has at least one integration configured
 * This is a business rule validation that happens after integration processing
 */
export const hasAtLeastOneIntegration = (config: Partial<CreateReleaseConfigDto>): boolean => {
  // Check all integration configs
  const hasScm = config.sourceCodeManagementConfigId !== undefined && config.sourceCodeManagementConfigId !== null;
  const hasCi = config.ciConfigId !== undefined && config.ciConfigId !== null;
  const hasTcm = config.testManagementConfigId !== undefined && config.testManagementConfigId !== null;
  const hasProjectMgmt = config.projectManagementConfigId !== undefined && config.projectManagementConfigId !== null;
  const hasComms = config.commsConfigId !== undefined && config.commsConfigId !== null;
  
  return hasScm || hasCi || hasTcm || hasProjectMgmt || hasComms;
};
