/**
 * Release Orchestration Constants
 * 
 * Domain-specific constants for release management and orchestration.
 * Follows cursor rules: Constants have domain prefix and include context in messages.
 */

/**
 * Error messages for release orchestration
 * All messages include context about the release management domain
 */
export const RELEASE_ERROR_MESSAGES = {
  // Configuration errors
  RELEASE_CONFIG_ID_REQUIRED: 'Release configuration ID is required but not set for this release',
  RELEASE_CONFIG_NOT_FOUND: (configId: string) => `Release configuration not found: ${configId}`,
  
  // Release errors
  RELEASE_NOT_FOUND: (releaseId: string) => `Release ${releaseId} not found`,
  NO_PLATFORMS_FOR_RELEASE: (releaseId: string) => `No platforms found for release ${releaseId}`,
  
  // Task errors
  TASK_TYPE_NOT_IMPLEMENTED: (taskType: string) => `Task type ${taskType} not yet implemented`,
  
  // Integration errors - SCM
  SCM_INTEGRATION_NOT_AVAILABLE: 'SCM integration not available',
  
  // Integration errors - CI/CD
  CICD_WORKFLOW_NOT_CONFIGURED: 'CI/CD workflow not configured for this release',
  CICD_WORKFLOW_NOT_FOUND: (workflowId: string) => `Workflow ${workflowId} not found`,
  CICD_PROVIDER_UNSUPPORTED: (providerType: string) => `Unsupported CI/CD provider type: ${providerType}`,
  
  // Integration errors - Project Management
  PM_INTEGRATION_NOT_CONFIGURED: 'Project management integration not configured for this release',
  PM_TICKET_TASK_NOT_FOUND: 'CREATE_PROJECT_MANAGEMENT_TICKET task not found or ticket ID not available',
  
  // Integration errors - Test Management
  TEST_PLATFORM_NOT_AVAILABLE: 'Test platform integration not available',
  TEST_MANAGEMENT_NOT_CONFIGURED: 'Test management integration not configured for this release',
  TEST_SUITE_NOT_FOUND: 'Test suite not found. CREATE_TEST_SUITE task must complete first.',
  
  // Integration errors - Notification
  NOTIFICATION_INTEGRATION_NOT_AVAILABLE: 'Notification integration not available',
  
  // Platform-specific errors
  IOS_PLATFORM_REQUIRED: 'TRIGGER_TEST_FLIGHT_BUILD task requires iOS platform, but no iOS platform found',
  
  // Regression cycle errors
  REGRESSION_CYCLE_ID_NOT_FOUND: 'Regression cycle ID not found in task',
  REGRESSION_CYCLE_NOT_FOUND: (cycleId: string) => `Regression cycle ${cycleId} not found`,
  REGRESSION_CYCLE_TAG_NOT_FOUND: (cycleId: string) => `Cycle tag not found for regression cycle ${cycleId}`,
  REGRESSION_MODEL_NOT_FOUND: 'RegressionCycle model not found',
  
  // Task dependency errors
  AUTOMATION_RUN_NOT_FOUND: 'Automation run not found. TRIGGER_AUTOMATION_RUNS task must complete first.',
  RELEASE_TAG_TASK_NOT_FOUND: 'CREATE_RELEASE_TAG task not found or tag not created yet',
  CREATE_RELEASE_TAG_TASK_MISSING: 'CREATE_RELEASE_TAG task has not been executed yet. Release tag is not available.',
  
  // Storage errors
  STORAGE_NO_SEQUELIZE: 'Storage does not have Sequelize instance',
  REQUIRED_MODELS_NOT_FOUND_BUILD: 'Required models (Build, Platform, Release) not found',
  REQUIRED_MODELS_NOT_FOUND_RELEASE: 'Required models (Release, Platform) not found'
} as const;

/**
 * Success messages for release orchestration
 * All messages include context about the release management domain
 */
export const RELEASE_SUCCESS_MESSAGES = {
  TASK_EXECUTED: 'Release task executed successfully',
  STAGE_COMPLETED: 'Release stage completed successfully',
  RELEASE_CREATED: 'Release created successfully'
} as const;

/**
 * Default configuration values for release orchestration
 */
export const RELEASE_DEFAULTS = {
  POLL_INTERVAL_MS: 60000,        // Cron job polling interval (1 minute)
  LOCK_TIMEOUT_MS: 300000,         // Lock timeout for distributed execution (5 minutes)
  MAX_RETRY_ATTEMPTS: 3,           // Maximum retries for task execution
  TASK_TIMEOUT_MS: 600000          // Task execution timeout (10 minutes)
} as const;

