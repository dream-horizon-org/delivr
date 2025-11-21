/**
 * Project Management Service Error Messages
 * Domain-specific error messages with context
 */

export const PROJECT_MANAGEMENT_ERROR_MESSAGES = {
  // Integration errors
  CREATE_INTEGRATION_FAILED: 'Failed to create project management integration',
  INTEGRATION_NOT_FOUND: 'Project management integration not found',
  UPDATE_INTEGRATION_FAILED: 'Failed to update project management integration',
  DELETE_INTEGRATION_FAILED: 'Failed to delete project management integration',
  VERIFY_INTEGRATION_FAILED: 'Failed to verify project management integration',
  INVALID_CONFIG: 'Invalid project management configuration',
  DUPLICATE_INTEGRATION_NAME: 'Integration with this name already exists for this project',

  // Configuration errors
  CREATE_CONFIG_FAILED: 'Failed to create project management configuration',
  CONFIG_NOT_FOUND: 'Project management configuration not found',
  UPDATE_CONFIG_FAILED: 'Failed to update project management configuration',
  DELETE_CONFIG_FAILED: 'Failed to delete project management configuration',
  VERIFY_CONFIG_FAILED: 'Failed to verify project management configuration',
  INVALID_PLATFORM_CONFIG: 'Invalid platform configuration',
  DUPLICATE_CONFIG_NAME: 'Configuration with this name already exists for this project',

  // Ticket errors
  CREATE_TICKETS_FAILED: 'Failed to create project management tickets',
  CHECK_TICKET_STATUS_FAILED: 'Failed to check ticket status',
  TICKET_NOT_FOUND: 'Ticket not found',
  INVALID_TICKET_REQUEST: 'Invalid ticket creation request',

  // Provider errors
  PROVIDER_NOT_SUPPORTED: 'Provider not supported',
  PROVIDER_ERROR: 'Provider error occurred'
} as const;

export const PROJECT_MANAGEMENT_SUCCESS_MESSAGES = {
  INTEGRATION_CREATED: 'Project management integration created successfully',
  INTEGRATION_UPDATED: 'Project management integration updated successfully',
  INTEGRATION_DELETED: 'Project management integration deleted successfully',
  INTEGRATION_VERIFIED: 'Project management integration verified successfully',

  CONFIG_CREATED: 'Project management configuration created successfully',
  CONFIG_UPDATED: 'Project management configuration updated successfully',
  CONFIG_DELETED: 'Project management configuration deleted successfully',
  CONFIG_VERIFIED: 'Project management configuration verified successfully',

  TICKETS_CREATED: 'Project management tickets created successfully',
  TICKET_STATUS_CHECKED: 'Ticket status checked successfully'
} as const;

