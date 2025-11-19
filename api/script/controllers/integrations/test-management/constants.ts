/**
 * Test Management specific error messages
 */
export const TEST_MANAGEMENT_ERROR_MESSAGES = {
  CREATE_INTEGRATION_FAILED: 'Failed to create test management integration',
  LIST_INTEGRATIONS_FAILED: 'Failed to list test management integrations',
  GET_INTEGRATION_FAILED: 'Failed to get test management integration',
  UPDATE_INTEGRATION_FAILED: 'Failed to update test management integration',
  DELETE_INTEGRATION_FAILED: 'Failed to delete test management integration',
  VERIFY_INTEGRATION_FAILED: 'Failed to verify test management integration',
  INTEGRATION_NOT_FOUND: 'Test management integration not found',
  INVALID_CONFIG: 'Invalid configuration: Missing or invalid required fields (baseUrl, authToken)',
  
  LINK_INTEGRATION_FAILED: 'Failed to link test management integration to release config',
  GET_LINK_FAILED: 'Failed to get test management integration link',
  UNLINK_INTEGRATION_FAILED: 'Failed to unlink test management integration',
  LINK_NOT_FOUND: 'Test management integration link not found',
  NO_ACTIVE_LINK: 'No active test management integration link found',
  
  SET_PLATFORM_PARAMS_FAILED: 'Failed to set test management platform parameters',
  GET_PLATFORM_PARAMS_FAILED: 'Failed to get test management platform parameters',
  UPDATE_PLATFORM_PARAMS_FAILED: 'Failed to update test management platform parameters',
  PLATFORM_PARAMS_NOT_FOUND: 'No test management parameters found for platform',
  LINK_ID_REQUIRED: 'Test management linkId query parameter is required',
  
  CREATE_TEST_RUNS_FAILED: 'Failed to create test management test runs',
  GET_TEST_STATUS_FAILED: 'Failed to get test management test status',
  GET_TEST_REPORT_FAILED: 'Failed to get test management test report',
  UPDATE_TEST_RUN_FAILED: 'Failed to update test management test run ID',
  RESET_TEST_RUN_FAILED: 'Failed to reset test management test run',
  CANCEL_TEST_RUN_FAILED: 'Failed to cancel test management test run',
  TEST_RUN_NOT_FOUND: 'Test management test run not found',
  
  CREATE_CONFIG_FAILED: 'Failed to create test management configuration',
  GET_CONFIG_FAILED: 'Failed to get test management configuration',
  LIST_CONFIGS_FAILED: 'Failed to list test management configurations',
  UPDATE_CONFIG_FAILED: 'Failed to update test management configuration',
  DELETE_CONFIG_FAILED: 'Failed to delete test management configuration',
  CONFIG_NOT_FOUND: 'Test management configuration not found',
  
  UNKNOWN_ERROR: 'Unknown test management error occurred'
} as const;

export const TEST_MANAGEMENT_SUCCESS_MESSAGES = {
  INTEGRATION_DELETED: 'Test management integration deleted successfully',
  INTEGRATION_UNLINKED: 'Test management integration unlinked successfully',
  TEST_RUN_ID_UPDATED: 'Test management test run ID updated successfully',
  TEST_RUN_RESET: 'Test run reset successfully',
  TEST_RUN_CANCELLED: 'Test run cancelled successfully',
  CONFIG_DELETED: 'Test management configuration removed successfully'
} as const;

