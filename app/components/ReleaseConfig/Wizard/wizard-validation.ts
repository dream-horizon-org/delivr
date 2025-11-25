/**
 * Wizard Validation Utilities
 * Contains validation logic for wizard steps
 */

import type { ReleaseConfiguration } from '~/types/release-config';
import { 
  PLATFORMS, 
  BUILD_ENVIRONMENTS, 
  BUILD_UPLOAD_STEPS, 
  TARGET_PLATFORMS 
} from '~/types/release-config-constants';
import { validateConfiguration } from '~/utils/release-config-storage';
import { STEP_INDEX } from '~/constants/wizard-steps';
import { validateScheduling } from '~/components/ReleaseConfig/Scheduling/scheduling-validation';

/**
 * Validates if user can proceed from current wizard step
 * Each step has specific validation rules
 */
export const canProceedFromStep = (
  stepIndex: number,
  config: Partial<ReleaseConfiguration>
): boolean => {
  switch (stepIndex) {
    case STEP_INDEX.BASIC:
      return !!(config.name && config.name.trim());
      
    case STEP_INDEX.PLATFORMS:
      return !!config.targets && config.targets.length > 0;
      
    case STEP_INDEX.BUILD_UPLOAD:
      return !!config.buildUploadStep;
      
    case STEP_INDEX.PIPELINES:
      // Skip validation if not using CI/CD
      if (config.buildUploadStep !== BUILD_UPLOAD_STEPS.CI_CD) {
        return true;
      }
      
      if (!config.workflows || config.workflows.length === 0) {
        return false;
      }
      
      // Validate required pipelines based on selected distribution targets
      const needsAndroid = config.targets?.includes(TARGET_PLATFORMS.PLAY_STORE);
      const needsIOS = config.targets?.includes(TARGET_PLATFORMS.APP_STORE);
      
      if (needsAndroid) {
        const hasAndroidRegression = config.workflows.some(
          p => p.platform === PLATFORMS.ANDROID && 
               p.environment === BUILD_ENVIRONMENTS.REGRESSION && 
               p.enabled
        );
        if (!hasAndroidRegression) return false;
      }
      
      if (needsIOS) {
        const hasIOSRegression = config.workflows.some(
          p => p.platform === PLATFORMS.IOS && 
               p.environment === BUILD_ENVIRONMENTS.REGRESSION && 
               p.enabled
        );
        const hasTestFlight = config.workflows.some(
          p => p.platform === PLATFORMS.IOS && 
               p.environment === BUILD_ENVIRONMENTS.TESTFLIGHT && 
               p.enabled
        );
        if (!hasIOSRegression || !hasTestFlight) return false;
      }
      
      return true;
      
    case STEP_INDEX.TESTING:
    case STEP_INDEX.COMMUNICATION:
      return true; // Optional steps
      
    case STEP_INDEX.SCHEDULING:
      // If user opted out of scheduling, allow proceed
      if (!config.scheduling) {
        return true;
      }
      // If user opted in, validate scheduling config
      const schedulingErrors = validateScheduling(config.scheduling);
      return schedulingErrors.length === 0;
      
    case STEP_INDEX.REVIEW:
      const validation = validateConfiguration(config);
      return validation.isValid;
      
    default:
      return true;
  }
};

