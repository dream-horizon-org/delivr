/**
 * Page Headers Constants
 * Centralized titles and descriptions for all main pages
 * 
 * Font sizes should match:
 * - Title: order={2} (not order 1)
 * - Description: size="md" (not "sm")
 */

// ============================================================================
// Releases Page
// ============================================================================

export const RELEASES_PAGE_HEADER = {
  TITLE: 'Releases',
  DESCRIPTION: 'Manage and track your release pipeline',
} as const;

// ============================================================================
// Workflows Page
// ============================================================================

export const WORKFLOWS_PAGE_HEADER = {
  TITLE: 'Workflows',
  DESCRIPTION: 'Configure build pipelines and automate your deployment process.',
} as const;

// ============================================================================
// Integrations Page
// ============================================================================

export const INTEGRATIONS_PAGE_HEADER = {
  TITLE: 'Integrations',
  DESCRIPTION: 'Connect external services to enhance your release management workflow.',
} as const;

// ============================================================================
// Distributions Page (already exists in distribution.constants.ts)
// ============================================================================

// Using DISTRIBUTIONS_LIST_UI.PAGE_TITLE and PAGE_SUBTITLE

// ============================================================================
// Configuration Page
// ============================================================================

export const CONFIGURATION_PAGE_HEADER = {
  TITLE_CREATE: 'Create Configuration',
  TITLE_EDIT: 'Edit Configuration',
  DESCRIPTION_CREATE: 'Set up a new release configuration to standardize your release process.',
  DESCRIPTION_EDIT: 'Update your release configuration settings.',
} as const;

// ============================================================================
// Workflow Form Page
// ============================================================================

export const WORKFLOW_FORM_HEADER = {
  TITLE_CREATE: 'Create Workflow',
  TITLE_EDIT: 'Edit Workflow',
  DESCRIPTION_CREATE: 'Configure a new CI/CD workflow for Jenkins or GitHub Actions',
  DESCRIPTION_EDIT: 'Update your CI/CD workflow configuration',
} as const;

// ============================================================================
// Configurations Settings Page
// ============================================================================

export const CONFIGURATIONS_SETTINGS_HEADER = {
  TITLE: 'Configurations',
  DESCRIPTION: 'Create and manage release configurations to standardize your release process.',
} as const;

