/**
 * Project Management Integration Validation
 */

import { ProjectManagementProviderType } from '~types/integrations/project-management';
import {
  INTEGRATION_NAME_MIN_LENGTH,
  INTEGRATION_NAME_MAX_LENGTH,
  PROJECT_MANAGEMENT_PROVIDERS
} from './integration.constants';

/**
 * Validate integration name
 */
export const validateIntegrationName = (name: unknown): string | null => {
  if (typeof name !== 'string') {
    return 'Name must be a string';
  }

  const trimmedName = name.trim();

  if (trimmedName.length < INTEGRATION_NAME_MIN_LENGTH) {
    return `Name must be at least ${INTEGRATION_NAME_MIN_LENGTH} characters`;
  }

  if (trimmedName.length > INTEGRATION_NAME_MAX_LENGTH) {
    return `Name must not exceed ${INTEGRATION_NAME_MAX_LENGTH} characters`;
  }

  return null;
};

/**
 * Validate provider type
 */
export const validateProviderType = (providerType: unknown): string | null => {
  if (typeof providerType !== 'string') {
    return 'Provider type must be a string';
  }

  const isValidProvider = PROJECT_MANAGEMENT_PROVIDERS.includes(
    providerType as ProjectManagementProviderType
  );

  if (!isValidProvider) {
    return `Invalid provider type. Must be one of: ${PROJECT_MANAGEMENT_PROVIDERS.join(', ')}`;
  }

  return null;
};

/**
 * Validate config structure based on provider type
 */
export const validateConfigStructure = (
  config: unknown,
  providerType: ProjectManagementProviderType
): string | null => {
  if (typeof config !== 'object' || config === null) {
    return 'Config must be an object';
  }

  const configObj = config as Record<string, unknown>;

  // Check for baseUrl (common to all providers)
  if (typeof configObj.baseUrl !== 'string' || !configObj.baseUrl) {
    return 'Config must include baseUrl';
  }

  // Provider-specific validation
  switch (providerType) {
    case ProjectManagementProviderType.JIRA: {
      if (typeof configObj.apiToken !== 'string' || !configObj.apiToken) {
        return 'JIRA config must include apiToken';
      }
      if (typeof configObj.email !== 'string' || !configObj.email) {
        return 'JIRA config must include email';
      }
      if (typeof configObj.jiraType !== 'string' || !configObj.jiraType) {
        return 'JIRA config must include jiraType';
      }
      const validJiraTypes = ['CLOUD', 'SERVER', 'DATA_CENTER'];
      if (!validJiraTypes.includes(configObj.jiraType)) {
        return `jiraType must be one of: ${validJiraTypes.join(', ')}`;
      }
      break;
    }
    case ProjectManagementProviderType.LINEAR: {
      if (typeof configObj.apiKey !== 'string' || !configObj.apiKey) {
        return 'Linear config must include apiKey';
      }
      if (typeof configObj.teamId !== 'string' || !configObj.teamId) {
        return 'Linear config must include teamId';
      }
      break;
    }
    // Add validation for other providers as needed
    default:
      break;
  }

  return null;
};

