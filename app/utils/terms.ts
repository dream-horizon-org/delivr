import type { OwnerTermsStatusResponse } from '~/.server/services/Codepush/types';
import { DEFAULT_TERMS_CONFIG } from '../constants/termsConstants';
import type { TermsConditionChecker, TermsConfig, TermsTriggerConditions } from '~/types/terms-types';

/**
 * Merges user config with default config
 */
export const mergeTermsConfig = (userConfig: TermsConfig = {}): Required<TermsConfig> => {
  return {
    ...DEFAULT_TERMS_CONFIG,
    ...userConfig,
    triggerConditions: {
      ...DEFAULT_TERMS_CONFIG.triggerConditions,
      ...userConfig.triggerConditions,
    },
    modalConfig: {
      ...DEFAULT_TERMS_CONFIG.modalConfig,
      ...userConfig.modalConfig,
    },
  };
};

/**
 * Determines if terms modal should be shown based on status and conditions
 */
export const shouldShowTermsModal: TermsConditionChecker = (
  status: OwnerTermsStatusResponse,
  conditions: TermsTriggerConditions
): boolean => {
  // Custom condition takes precedence
  if (conditions.customCondition) {
    return conditions.customCondition(status);
  }

  // Check owner requirement
  if (conditions.requireOwner && !status.isOwner) {
    return false;
  }

  // Check acceptance requirement
  if (conditions.requireAcceptance && !status.termsAccepted) {
    return true;
  }

  // Check current version requirement
  if (conditions.requireCurrentVersion && !status.isCurrentVersion) {
    return true;
  }

  return false;
};

/**
 * Creates updated terms status after acceptance
 */
export const createUpdatedTermsStatus = (
  currentStatus: OwnerTermsStatusResponse,
  acceptedVersion: string,
  acceptedTime: number
): OwnerTermsStatusResponse => {
  return {
    ...currentStatus,
    termsAccepted: true,
    termsVersion: acceptedVersion,
    acceptedTime,
    isCurrentVersion: true,
  };
};

/**
 * Validates terms configuration
 */
export const validateTermsConfig = (config: TermsConfig): boolean => {
  if (!config || typeof config !== 'object') {
    console.warn('Terms config must be an object');
    return false;
  }

  // Validate checkOn
  if (config.checkOn && !['mount', 'manual', 'route-change'].includes(config.checkOn)) {
    console.warn('Invalid checkOn value in terms config. Must be: mount, manual, or route-change');
    return false;
  }

  // Validate trigger conditions
  if (config.triggerConditions) {
    const { triggerConditions } = config;
    if (typeof triggerConditions !== 'object') {
      console.warn('triggerConditions must be an object');
      return false;
    }
    
    // Validate boolean fields
    const booleanFields = ['requireOwner', 'requireAcceptance', 'requireCurrentVersion'] as const;
    for (const field of booleanFields) {
      if (triggerConditions[field] !== undefined && typeof triggerConditions[field] !== 'boolean') {
        console.warn(`triggerConditions.${field} must be a boolean`);
        return false;
      }
    }

    // Validate custom condition
    if (triggerConditions.customCondition && typeof triggerConditions.customCondition !== 'function') {
      console.warn('triggerConditions.customCondition must be a function');
      return false;
    }
  }

  // Validate modal config
  if (config.modalConfig) {
    const { modalConfig } = config;
    if (typeof modalConfig !== 'object') {
      console.warn('modalConfig must be an object');
      return false;
    }

    const booleanFields = ['closeable', 'blockingMode'] as const;
    for (const field of booleanFields) {
      if (modalConfig[field] !== undefined && typeof modalConfig[field] !== 'boolean') {
        console.warn(`modalConfig.${field} must be a boolean`);
        return false;
      }
    }
  }

  // Validate callback functions
  const callbackFields = ['onTermsRequired', 'onTermsAccepted', 'onTermsSkipped'] as const;
  for (const field of callbackFields) {
    if (config[field] !== undefined && typeof config[field] !== 'function') {
      console.warn(`${field} must be a function`);
      return false;
    }
  }

  return true;
};

/**
 * Safe error handler for terms operations
 */
export const handleTermsError = (error: unknown, context: string): void => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Terms error in ${context}:`, errorMessage);
  
  // Could integrate with error reporting service here
  // reportError(error, { context: `terms-${context}` });
};

/**
 * Checks if terms status indicates a blocking state
 */
export const isBlockingTermsState = (
  status: OwnerTermsStatusResponse | null,
  config: Required<TermsConfig>
): boolean => {
  if (!status || !config.modalConfig.blockingMode) {
    return false;
  }

  return shouldShowTermsModal(status, config.triggerConditions);
};
