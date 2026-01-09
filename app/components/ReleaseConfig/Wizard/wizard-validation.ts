/**
 * Wizard Validation Utilities
 * Contains validation logic for wizard steps
 */

import type { 
  ReleaseConfiguration, 
  ProjectManagementConfig,
  TestManagementConfig,
  CommunicationConfig,
  Workflow
} from '~/types/release-config';
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
 * Validates Test Management configuration
 * Returns array of error messages (empty if valid)
 */
export const validateTestManagement = (
  testManagement?: TestManagementConfig
): string[] => {
  const errors: string[] = [];
  
  // If disabled or not present, it's valid
  if (!testManagement?.enabled) {
    return errors;
  }
  
  // Check provider is selected (and not 'none')
  if (!testManagement.provider || testManagement.provider === 'none') {
    errors.push('Test management provider must be selected');
  }
  
  // Check integration ID
  if (!testManagement.integrationId || !testManagement.integrationId.trim()) {
    errors.push('Test management integration must be selected');
  }
  
  // Check platform configurations (projectId is now platform-specific)
  if (!testManagement.platformConfigurations || testManagement.platformConfigurations.length === 0) {
    errors.push('At least one platform configuration is required for Test Management');
  } else {
    // Validate each platform configuration has a projectId
    testManagement.platformConfigurations.forEach((pc: any, index: number) => {
      const platformName = pc.platform || `Platform ${index + 1}`;
      
      if (!pc.platform) {
        errors.push(`${platformName}: Platform is required`);
      }
      
      // ProjectId is now platform-specific (required for each platform)
      if (!pc.projectId || pc.projectId === 0) {
        errors.push(`${platformName}: Test Management project must be selected`);
      }
    });
  }
  
  // Validate pass threshold
  if (testManagement.passThresholdPercent === undefined || 
      testManagement.passThresholdPercent < 0 || 
      testManagement.passThresholdPercent > 100) {
    errors.push('Pass threshold must be between 0 and 100');
  }
  
  return errors;
};

/**
 * Validates Communication (Slack) configuration
 * Returns array of error messages (empty if valid)
 */
export const validateCommunication = (
  communication?: CommunicationConfig
): string[] => {
  const errors: string[] = [];
  
  // If no communication config or disabled, it's valid (optional)
  if (!communication?.enabled) {
    return errors;
  }
  
  // Check integration ID
  if (!communication.integrationId || !communication.integrationId.trim()) {
    errors.push('Slack integration must be selected');
  }
  
  // Check channel data exists
  if (!communication.channelData) {
    errors.push('Slack channel configuration is required');
  } else {
    const channelData = communication.channelData;
    
    // CRITICAL: All bucket types are mandatory - each must have at least one channel
    const hasReleaseChannels = channelData.releases && Array.isArray(channelData.releases) && channelData.releases.length > 0;
    const hasBuildChannels = channelData.builds && Array.isArray(channelData.builds) && channelData.builds.length > 0;
    const hasRegressionChannels = channelData.regression && Array.isArray(channelData.regression) && channelData.regression.length > 0;
    const hasCriticalChannels = channelData.critical && Array.isArray(channelData.critical) && channelData.critical.length > 0;
    
    // Validate each bucket type is present and has at least one channel
    if (!hasReleaseChannels) {
      errors.push('At least one channel must be configured for Releases bucket');
    }
    
    if (!hasBuildChannels) {
      errors.push('At least one channel must be configured for Build bucket');
    }
    
    if (!hasRegressionChannels) {
      errors.push('At least one channel must be configured for Regression bucket');
    }
    
    if (!hasCriticalChannels) {
      errors.push('At least one channel must be configured for Critical bucket');
    }
  }
  
  return errors;
};

/**
 * Validates JIRA/Project Management configuration
 * Returns array of error messages (empty if valid)
 */
export const validateProjectManagement = (
  projectManagement?: ProjectManagementConfig
): string[] => {
  const errors: string[] = [];
  
  // If disabled or not present, it's valid
  if (!projectManagement?.enabled) {
    return errors;
  }
  
  // Check integration ID
  if (!projectManagement.integrationId || !projectManagement.integrationId.trim()) {
    errors.push('JIRA integration must be selected');
  }
  
  // Check platform configurations
  if (!projectManagement.platformConfigurations || projectManagement.platformConfigurations.length === 0) {
    errors.push('At least one platform configuration is required');
  } else {
    // Validate each platform configuration
    projectManagement.platformConfigurations.forEach((pc: any, index: number) => {
      const platformName = pc.platform || `Platform ${index + 1}`;
      
      if (!pc.platform) {
        errors.push(`${platformName}: Platform is required`);
      }
      
      const params = pc.parameters || {};
      const projectKey = params.projectKey;
      const completedStatus = params.completedStatus;
      
      if (!projectKey || typeof projectKey !== 'string' || !projectKey.trim()) {
        errors.push(`${platformName}: Project Key is required`);
      }
      
      if (!completedStatus || typeof completedStatus !== 'string' || !completedStatus.trim()) {
        errors.push(`${platformName}: Completed Status is required`);
      }
    });
  }
  
  return errors;
};

/**
 * Validates Workflows (CI/CD Pipelines) configuration
 * Returns array of error messages (empty if valid)
 */
export const validateWorkflows = (
  config: Partial<ReleaseConfiguration>
): string[] => {
  const errors: string[] = [];
  
  // Skip validation if using manual upload (not CI/CD)
  if (config.hasManualBuildUpload) {
    return errors;
  }
  
  // If using CI/CD, validate workflows exist
  const workflows = config.ciConfig?.workflows || [];
  if (!workflows || workflows.length === 0) {
    errors.push('At least one CI/CD workflow must be configured');
    return errors;
  }
  
  // Validate required pipelines based on selected platform-targets
  const needsAndroid = config.platformTargets?.some(
    (pt) => pt.platform === PLATFORMS.ANDROID && pt.target === TARGET_PLATFORMS.PLAY_STORE
  );
  const needsIOS = config.platformTargets?.some(
    (pt) => pt.platform === PLATFORMS.IOS && pt.target === TARGET_PLATFORMS.APP_STORE
  );
  
  if (needsAndroid) {
    const hasAndroidRegression = workflows.some(
      (p: Workflow) => 
        p.platform.toUpperCase() === PLATFORMS.ANDROID.toUpperCase() && 
        p.environment === BUILD_ENVIRONMENTS.REGRESSION && 
        p.enabled
    );
    const hasAndroidAAB = workflows.some(
      (p: Workflow) => 
        p.platform === PLATFORMS.ANDROID && 
        p.environment === BUILD_ENVIRONMENTS.AAB_BUILD && 
        p.enabled
    );
    if(!hasAndroidAAB) {
      errors.push('Android AAB workflow is required for Play Store distribution');
    }
    if (!hasAndroidRegression) {
      errors.push('Android Regression workflow is required for Play Store distribution');
    }
  }
  
  if (needsIOS) {
    const hasIOSRegression = workflows.some(
      (p: Workflow) => 
        p.platform.toUpperCase() === PLATFORMS.IOS.toUpperCase() && 
        p.environment === BUILD_ENVIRONMENTS.REGRESSION && 
        p.enabled
    );
    const hasTestFlight = workflows.some(
      (p: Workflow) => 
        p.platform.toUpperCase() === PLATFORMS.IOS.toUpperCase() && 
        p.environment === BUILD_ENVIRONMENTS.TESTFLIGHT && 
        p.enabled
    );
    
    if (!hasIOSRegression) {
      errors.push('iOS Regression workflow is required for App Store distribution');
    }
    if (!hasTestFlight) {
      errors.push('iOS TestFlight workflow is required for App Store distribution');
    }
  }
  
  return errors;
};

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
      // Ensure both name and baseBranch are non-empty strings
      const hasValidName = !!(config.name && typeof config.name === 'string' && config.name.trim());
      const hasValidBaseBranch = !!(config.baseBranch && typeof config.baseBranch === 'string' && config.baseBranch.trim());
      return hasValidName && hasValidBaseBranch;
      
    case STEP_INDEX.PLATFORMS:
      return !!(config.platformTargets && config.platformTargets.length > 0);
      
    case STEP_INDEX.BUILD_UPLOAD:
      // Ensure user has explicitly selected an upload method
      return config.hasManualBuildUpload !== undefined
      
    case STEP_INDEX.PIPELINES:
      // Use the validation helper function for workflows
      const workflowErrors = validateWorkflows(config);
      console.log("workflowErrors", workflowErrors);
      return workflowErrors.length === 0;
      
    case STEP_INDEX.TESTING:
      // Use the validation helper function for test management
      const testManagementErrors = validateTestManagement(config.testManagementConfig);
      return testManagementErrors.length === 0;
    
    case STEP_INDEX.COMMUNICATION:
      // Use the validation helper function for communication
      const communicationErrors = validateCommunication(config.communicationConfig);
      return communicationErrors.length === 0;
      
    case STEP_INDEX.PROJECT_MANAGEMENT:
      // Use the validation helper function
      const jiraErrors = validateProjectManagement(config.projectManagementConfig);
      return jiraErrors.length === 0;
      
    case STEP_INDEX.SCHEDULING:
      // CRITICAL: Cannot configure scheduling without platformTargets
      if (!config.platformTargets || config.platformTargets.length === 0) {
        return false; // Cannot proceed - no platform-targets selected
      }
      

      // Allow clicking Continue if scheduling is enabled (validation will be checked in handleNext)
      // This allows users to see validation errors when they click Continue
      // If user opted out of scheduling, allow proceed
      if (!config.releaseSchedule) {
        return true;
      }
      
      // Scheduling is enabled - allow clicking Continue to see validation errors
      // Actual validation will be checked in handleNext
      return true;
      
    case STEP_INDEX.REVIEW:
      const validation = validateConfiguration(config);
      console.log('validation', validation);
      return validation.isValid;
      
    default:
      return true;
  }
};

