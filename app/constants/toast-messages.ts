/**
 * Toast Notification Messages
 * Centralized location for all toast notification messages
 * used throughout the application
 */

// ============================================================================
// RELEASE CONFIGURATION MESSAGES
// ============================================================================

export const RELEASE_CONFIG_MESSAGES = {
  SAVE_SUCCESS: {
    title: 'Configuration Saved',
    message: 'Configuration has been saved successfully',
  },
  UPDATE_SUCCESS: {
    title: 'Configuration Updated',
    message: 'Configuration has been updated successfully',
  },
  SAVE_ERROR: (action: 'save' | 'update') => ({
    title: `Failed to ${action} configuration`,
    message: `Unable to ${action} the configuration. Please try again.`,
  }),
  ARCHIVE_SUCCESS: {
    title: 'Configuration Archived',
    message: 'Configuration has been archived successfully',
  },
  ARCHIVE_ERROR: {
    title: 'Archive Failed',
    message: 'Unable to archive the configuration',
  },
  SET_DEFAULT_SUCCESS: {
    title: 'Default Set',
    message: 'Configuration set as default successfully',
  },
  SET_DEFAULT_ERROR: {
    title: 'Failed to Set Default',
    message: 'Unable to set configuration as default',
  },
  DELETE_DRAFT_ERROR: {
    title: 'Delete Failed',
    message: 'Failed to delete draft',
  },
  DUPLICATE_INFO: {
    title: 'Coming Soon',
    message: 'Duplicate feature coming soon - will call API to duplicate configuration',
  },
} as const;

// ============================================================================
// INTEGRATION MESSAGES
// ============================================================================

export const INTEGRATION_MESSAGES = {
  DISCONNECT_NOT_IMPLEMENTED: (integrationName: string) => ({
    title: 'Not Available',
    message: `Disconnect not implemented for ${integrationName}`,
  }),
  DISCONNECT_SUCCESS: (integrationName: string) => ({
    title: 'Disconnected',
    message: `${integrationName} disconnected successfully!`,
  }),
  DISCONNECT_ERROR: (integrationName: string) => ({
    title: 'Disconnect Failed',
    message: `Failed to disconnect ${integrationName}`,
  }),
  CONNECT_SUCCESS: (integrationName: string, isUpdate: boolean) => ({
    title: isUpdate ? 'Integration Updated' : 'Integration Connected',
    message: isUpdate 
      ? `${integrationName} integration updated successfully!`
      : `${integrationName} integration connected successfully!`,
  }),
  DEMO_MODE: (integrationId: string) => ({
    title: 'Demo Mode',
    message: `${integrationId} connection initiated (demo mode)`,
  }),
} as const;

// ============================================================================
// RELEASE CREATION MESSAGES
// ============================================================================

export const RELEASE_MESSAGES = {
  CREATE_ERROR: {
    title: 'Failed to Create Release',
    message: 'Unable to create the release. Please try again.',
  },
  VALIDATION_ERROR: {
    title: 'Validation Error',
    message: 'Please fix the validation error before proceeding',
  },
  VALIDATION_ERRORS: {
    title: 'Validation Errors',
    message: 'Please fix validation errors before submitting',
  },
  CREATE_SUCCESS: {
    title: 'Release Created',
    message: 'Release has been created successfully',
  },
  DELETE_SUCCESS: {
    title: 'Release Deleted',
    message: 'Release has been deleted successfully',
  },
  DELETE_ERROR: {
    title: 'Failed to Delete Release',
    message: 'Unable to delete the release. Please try again.',
  },
} as const;

// ============================================================================
// GENERIC MESSAGES
// ============================================================================

export const GENERIC_MESSAGES = {
  SUCCESS: {
    title: 'Success',
    message: 'Operation completed successfully',
  },
  ERROR: {
    title: 'Error',
    message: 'An error occurred. Please try again.',
  },
  NETWORK_ERROR: {
    title: 'Network Error',
    message: 'Unable to connect. Please check your internet connection.',
  },
  PERMISSION_ERROR: {
    title: 'Permission Denied',
    message: 'You do not have permission to perform this action',
  },
  COMING_SOON: {
    title: 'Coming Soon',
    message: 'This feature is coming soon',
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a custom error message with title
 */
export function getErrorMessage(customMessage: string, title = 'Error') {
  return {
    title,
    message: customMessage,
  };
}

/**
 * Get a custom success message with title
 */
export function getSuccessMessage(customMessage: string, title = 'Success') {
  return {
    title,
    message: customMessage,
  };
}

