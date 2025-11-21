/**
 * Project Management Configuration Validation
 */

import { isValidPlatform, type Platform } from '~types/integrations/project-management';
import {
  CONFIG_NAME_MIN_LENGTH,
  CONFIG_NAME_MAX_LENGTH
} from './configuration.constants';

/**
 * Validate config name
 */
export const validateConfigName = (name: unknown): string | null => {
  if (typeof name !== 'string') {
    return 'Name must be a string';
  }

  const trimmedName = name.trim();

  if (trimmedName.length < CONFIG_NAME_MIN_LENGTH) {
    return `Name must be at least ${CONFIG_NAME_MIN_LENGTH} characters`;
  }

  if (trimmedName.length > CONFIG_NAME_MAX_LENGTH) {
    return `Name must not exceed ${CONFIG_NAME_MAX_LENGTH} characters`;
  }

  return null;
};

/**
 * Validate platform configurations
 */
export const validatePlatformConfigurations = (platformConfigs: unknown): string | null => {
  if (!Array.isArray(platformConfigs)) {
    return 'Platform configurations must be an array';
  }

  if (platformConfigs.length === 0) {
    return 'At least one platform configuration is required';
  }

  for (const config of platformConfigs) {
    if (typeof config !== 'object' || config === null) {
      return 'Each platform configuration must be an object';
    }

    const configObj = config as Record<string, unknown>;

    // Validate platform
    if (!isValidPlatform(configObj.platform)) {
      return `Invalid platform: ${configObj.platform}`;
    }

    // Validate parameters
    if (typeof configObj.parameters !== 'object' || configObj.parameters === null) {
      return 'Each platform configuration must have parameters';
    }

    const params = configObj.parameters as Record<string, unknown>;

    // Validate projectKey
    if (typeof params.projectKey !== 'string' || !params.projectKey) {
      return `Platform ${configObj.platform} must have projectKey in parameters`;
    }

    // Validate completedStatus
    if (typeof params.completedStatus !== 'string' || !params.completedStatus) {
      return `Platform ${configObj.platform} must have completedStatus in parameters`;
    }
  }

  return null;
};

