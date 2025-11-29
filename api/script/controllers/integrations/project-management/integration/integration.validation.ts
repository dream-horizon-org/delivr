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
 * Validate config structure based on provider type (for CREATE operations)
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

/**
 * Validate partial config structure (for UPDATE operations)
 * Only validates fields that are present - allows partial updates
 */
export const validatePartialConfigStructure = (
  config: unknown,
  providerType: ProjectManagementProviderType
): string | null => {
  if (typeof config !== 'object' || config === null) {
    return 'Config must be an object';
  }

  const configObj = config as Record<string, unknown>;

  // Validate baseUrl if provided
  if ('baseUrl' in configObj) {
    if (typeof configObj.baseUrl !== 'string' || !configObj.baseUrl) {
      return 'baseUrl must be a non-empty string';
    }
  }

  // Provider-specific validation (only validate fields that are present)
  switch (providerType) {
    case ProjectManagementProviderType.JIRA: {
      if ('apiToken' in configObj) {
        if (typeof configObj.apiToken !== 'string' || !configObj.apiToken) {
          return 'apiToken must be a non-empty string';
        }
      }
      if ('email' in configObj) {
        if (typeof configObj.email !== 'string' || !configObj.email) {
          return 'email must be a non-empty string';
        }
      }
      if ('jiraType' in configObj) {
        if (typeof configObj.jiraType !== 'string' || !configObj.jiraType) {
          return 'jiraType must be a non-empty string';
        }
        const validJiraTypes = ['CLOUD', 'SERVER', 'DATA_CENTER'];
        if (!validJiraTypes.includes(configObj.jiraType)) {
          return `jiraType must be one of: ${validJiraTypes.join(', ')}`;
        }
      }
      break;
    }
    case ProjectManagementProviderType.LINEAR: {
      if ('apiKey' in configObj) {
        if (typeof configObj.apiKey !== 'string' || !configObj.apiKey) {
          return 'apiKey must be a non-empty string';
        }
      }
      if ('teamId' in configObj) {
        if (typeof configObj.teamId !== 'string' || !configObj.teamId) {
          return 'teamId must be a non-empty string';
        }
      }
      break;
    }
    // Add validation for other providers as needed
    default:
      break;
  }

  return null;
};

