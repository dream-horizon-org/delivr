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
  
  // Check provider config exists
  if (!testManagement.providerConfig) {
    errors.push('Test management provider configuration is required');
  } else {
    const providerConfig = testManagement.providerConfig as any;
    
    // Validate Checkmate-specific fields
    if (providerConfig.type === 'checkmate') {
      // Check project ID
      if (!providerConfig.projectId) {
        errors.push('Checkmate project must be selected');
      }
      
      // Check platform configurations
      if (!providerConfig.platformConfigurations || providerConfig.platformConfigurations.length === 0) {
        errors.push('At least one platform configuration is required for Checkmate');
      }
      
      // Validate pass threshold
      if (providerConfig.passThresholdPercent === undefined || 
          providerConfig.passThresholdPercent < 0 || 
          providerConfig.passThresholdPercent > 100) {
        errors.push('Pass threshold must be between 0 and 100');
      }
    }
    
    // Validate TestRail-specific fields
    if (providerConfig.type === 'testrail') {
      if (!providerConfig.projectId || !providerConfig.projectId.trim()) {
        errors.push('TestRail project ID is required');
      }
      
      if (!providerConfig.suiteId || !providerConfig.suiteId.trim()) {
        errors.push('TestRail suite ID is required');
      }
    }
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
  
  // If no communication config or slack disabled, it's valid (optional)
  if (!communication?.slack?.enabled) {
    return errors;
  }
  
  const slackConfig = communication.slack;
  
  // Check integration ID
  if (!slackConfig.integrationId || !slackConfig.integrationId.trim()) {
    errors.push('Slack integration must be selected');
  }
  
  // Check channel data exists
  if (!slackConfig.channelData) {
    errors.push('Slack channel configuration is required');
  } else {
    const channelData = slackConfig.channelData;
    
    // Check if at least one channel type has channels configured
    const hasReleaseChannels = channelData.releases && channelData.releases.length > 0;
    const hasBuildChannels = channelData.builds && channelData.builds.length > 0;
    const hasRegressionChannels = channelData.regression && channelData.regression.length > 0;
    const hasCriticalChannels = channelData.critical && channelData.critical.length > 0;
    
    if (!hasReleaseChannels && !hasBuildChannels && !hasRegressionChannels && !hasCriticalChannels) {
      errors.push('At least one Slack channel must be configured (releases, builds, regression, or critical)');
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
      
      if (!pc.projectKey || !pc.projectKey.trim()) {
        errors.push(`${platformName}: Project Key is required`);
      }
      
      if (!pc.completedStatus || !pc.completedStatus.trim()) {
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
  if (!config.workflows || config.workflows.length === 0) {
    errors.push('At least one CI/CD workflow must be configured');
    return errors;
  }
  
  // Validate required pipelines based on selected distribution targets
  const needsAndroid = config.targets?.includes(TARGET_PLATFORMS.PLAY_STORE);
  const needsIOS = config.targets?.includes(TARGET_PLATFORMS.APP_STORE);
  
  if (needsAndroid) {
    const hasAndroidRegression = config.workflows.some(
      (p: Workflow) => 
        p.platform === PLATFORMS.ANDROID && 
        p.environment === BUILD_ENVIRONMENTS.REGRESSION && 
        p.enabled
    );
    if (!hasAndroidRegression) {
      errors.push('Android Regression workflow is required for Play Store distribution');
    }
  }
  
  if (needsIOS) {
    const hasIOSRegression = config.workflows.some(
      (p: Workflow) => 
        p.platform === PLATFORMS.IOS && 
        p.environment === BUILD_ENVIRONMENTS.REGRESSION && 
        p.enabled
    );
    const hasTestFlight = config.workflows.some(
      (p: Workflow) => 
        p.platform === PLATFORMS.IOS && 
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
      return !!(config.name && config.name.trim());
      
    case STEP_INDEX.PLATFORMS:
      return !!config.targets && config.targets.length > 0;
      
    case STEP_INDEX.BUILD_UPLOAD:
      return true
      
    case STEP_INDEX.PIPELINES:
      // Use the validation helper function for workflows
      const workflowErrors = validateWorkflows(config);
      return workflowErrors.length === 0;
      
    case STEP_INDEX.TESTING:
      // Use the validation helper function for test management
      const testManagementErrors = validateTestManagement(config.testManagement);
      return testManagementErrors.length === 0;
    
    case STEP_INDEX.COMMUNICATION:
      // Use the validation helper function for communication
      const communicationErrors = validateCommunication(config.communication);
      return communicationErrors.length === 0;
      
    case STEP_INDEX.PROJECT_MANAGEMENT:
      // Use the validation helper function
      const jiraErrors = validateProjectManagement(config.projectManagement);
      return jiraErrors.length === 0;
      
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

