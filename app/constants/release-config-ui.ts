/**
 * Release Configuration UI Constants
 * All display strings, labels, messages, and UI-related constants
 * 
 * NO HARDCODED STRINGS IN COMPONENTS - USE THIS FILE!
 */

// ============================================================================
// Provider Display Names
// ============================================================================

export const PROVIDER_LABELS = {
  JENKINS: 'Jenkins',
  GITHUB_ACTIONS: 'GitHub Actions',
  MANUAL_UPLOAD: 'Manual Upload',
} as const;

// ============================================================================
// Environment Display Names
// ============================================================================

export const ENVIRONMENT_LABELS = {
  PRE_REGRESSION: 'Pre-Regression',
  REGRESSION: 'Regression',
  TESTFLIGHT: 'TestFlight',
  PRODUCTION: 'Production',
} as const;

// ============================================================================
// Platform Display Names
// ============================================================================

export const PLATFORM_LABELS = {
  ANDROID: 'Android',
  IOS: 'iOS',
  WEB: 'Web',
} as const;

// ============================================================================
// Target Platform Display Names
// ============================================================================

export const TARGET_PLATFORM_LABELS = {
  PLAY_STORE: 'Play Store',
  APP_STORE: 'App Store',
  WEB: 'Web',
} as const;

// ============================================================================
// Build Upload Method Labels
// ============================================================================

export const BUILD_UPLOAD_LABELS = {
  MANUAL: 'Manual Upload',
  CI_CD: 'CI/CD Workflows',
} as const;

export const BUILD_UPLOAD_DESCRIPTIONS = {
  MANUAL: 'Upload builds manually through the dashboard',
  CI_CD: 'Automate builds using connected CI/CD integrations',
} as const;

// ============================================================================
// Status Labels
// ============================================================================

export const STATUS_LABELS = {
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  REQUIRED: 'Required',
  OPTIONAL: 'Optional',
  CONFIGURED: 'Configured',
  NOT_CONFIGURED: 'Not Configured',
} as const;

// ============================================================================
// Pipeline Category Labels
// ============================================================================

export const PIPELINE_CATEGORY_LABELS = {
  PRE_REGRESSION_ANDROID: 'Android Pre-Regression Build',
  REGRESSION_ANDROID: 'Android Regression Build',
  PRE_REGRESSION_IOS: 'iOS Pre-Regression Build',
  REGRESSION_IOS: 'iOS Regression Build',
  TESTFLIGHT_IOS: 'iOS TestFlight Build',
} as const;

export const PIPELINE_CATEGORY_DESCRIPTIONS = {
  PRE_REGRESSION_ANDROID: 'Build for pre-regression testing on Android',
  REGRESSION_ANDROID: 'Build for regression testing on Android',
  PRE_REGRESSION_IOS: 'Build for pre-regression testing on iOS',
  REGRESSION_IOS: 'Build for regression testing on iOS',
  TESTFLIGHT_IOS: 'Build for TestFlight distribution on iOS',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  PLATFORM_NOT_SELECTED: 'Please select platforms first (previous step) to configure CI/CD workflows.',
  TARGET_NOT_SELECTED: 'Please select distribution targets first (previous step).',
  NO_INTEGRATIONS: 'No CI/CD integrations connected.',
  NO_JENKINS_INTEGRATION: 'No Jenkins integrations available.',
  NO_GITHUB_INTEGRATION: 'No GitHub Actions integrations available.',
  REQUIRED_PIPELINES_MISSING: 'Required pipelines missing:',
  INVALID_CONFIGURATION: 'Invalid configuration. Please check all fields.',
  TESTFLIGHT_ANDROID_INVALID: 'TestFlight is only available for iOS builds.',
} as const;

// ============================================================================
// Info Messages
// ============================================================================

export const INFO_MESSAGES = {
  CONNECT_INTEGRATIONS: 'Please connect CI/CD integrations from the Integrations page to enable automated workflows.',
  REDIRECT_TO_INTEGRATIONS: 'Go to Integrations page to connect CI/CD providers',
  NO_PROVIDERS_CONNECTED: 'No CI/CD providers are connected. Connect Jenkins or GitHub Actions to create workflows.',
  SELECT_PLATFORM_FIRST: 'Select distribution targets in the previous step to continue.',
} as const;

// ============================================================================
// Button Labels
// ============================================================================

export const BUTTON_LABELS = {
  ADD: 'Add',
  EDIT: 'Edit',
  DELETE: 'Delete',
  REMOVE: 'Remove',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  NEXT: 'Next',
  PREVIOUS: 'Previous',
  SUBMIT: 'Submit',
  CLOSE: 'Close',
  ADD_PIPELINE: 'Add Pipeline',
  ADD_WORKFLOW: 'Add Workflow',
  EDIT_WORKFLOW: 'Edit Workflow',
  CREATE_WORKFLOW: 'Create Workflow',
} as const;

// ============================================================================
// Section Titles
// ============================================================================

export const SECTION_TITLES = {
  CI_CD_WORKFLOWS: 'CI/CD Workflows',
  BUILD_PIPELINES: 'Build Pipelines',
  BUILD_UPLOAD_METHOD: 'Build Upload Method',
  PLATFORM_SELECTION: 'Platform Selection',
  TARGET_PLATFORMS: 'Target Platforms',
  TEST_MANAGEMENT: 'Test Management',
  COMMUNICATION: 'Communication',
  SCHEDULING: 'Scheduling',
  PROJECT_MANAGEMENT: 'Project Management',
  BASIC_INFORMATION: 'Basic Information',
  REVIEW: 'Review Configuration',
} as const;

// ============================================================================
// Section Descriptions
// ============================================================================

export const SECTION_DESCRIPTIONS = {
  CI_CD_WORKFLOWS: 'Configure automated CI/CD workflows for your selected platforms',
  BUILD_UPLOAD_METHOD: 'Choose how builds will be provided for releases',
  PLATFORM_SELECTION: 'Select the platforms and distribution targets for this release configuration',
  TEST_MANAGEMENT: 'Configure test management integrations',
  COMMUNICATION: 'Set up communication channels for release notifications',
  SCHEDULING: 'Configure release schedules and automation',
  PROJECT_MANAGEMENT: 'Configure project management integrations',
} as const;

// ============================================================================
// Field Labels
// ============================================================================

export const FIELD_LABELS = {
  NAME: 'Name',
  DESCRIPTION: 'Description',
  PLATFORM: 'Platform',
  ENVIRONMENT: 'Environment',
  PROVIDER: 'Provider',
  BUILD_PROVIDER: 'Build Provider',
  INTEGRATION: 'Integration',
  WORKFLOW_URL: 'Workflow URL',
  JOB_URL: 'Job URL',
  JOB_NAME: 'Job Name',
  WORKFLOW_ID: 'Workflow ID',
  WORKFLOW_PATH: 'Workflow Path',
  BRANCH: 'Branch',
  STATUS: 'Status',
  ENABLED: 'Enabled',
  TIMEOUT: 'Timeout',
  RETRY_ATTEMPTS: 'Retry Attempts',
  PARAMETERS: 'Parameters',
  INPUTS: 'Inputs',
} as const;

// ============================================================================
// Placeholder Text
// ============================================================================

export const PLACEHOLDERS = {
  WORKFLOW_NAME: 'Enter workflow name',
  JOB_NAME: 'Enter Jenkins job name',
  JOB_URL: 'https://jenkins.example.com/job/build-job',
  WORKFLOW_ID: 'Enter GitHub workflow ID',
  WORKFLOW_PATH: '.github/workflows/build.yml',
  BRANCH: 'main',
  SELECT_INTEGRATION: 'Select an integration',
  SELECT_PLATFORM: 'Select a platform',
  SELECT_ENVIRONMENT: 'Select an environment',
  SELECT_PROVIDER: 'Select a provider',
} as const;

// ============================================================================
// Badge Colors (Mantine)
// ============================================================================

export const BADGE_COLORS = {
  SUCCESS: 'green',
  ERROR: 'red',
  WARNING: 'yellow',
  INFO: 'blue',
  NEUTRAL: 'gray',
  PRIMARY: 'blue',
} as const;

// ============================================================================
// Icon Sizes
// ============================================================================

export const ICON_SIZES = {
  SMALL: 16,
  MEDIUM: 20,
  LARGE: 24,
  EXTRA_LARGE: 32,
} as const;

// ============================================================================
// Validation Messages
// ============================================================================

export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_URL: 'Please enter a valid URL',
  INVALID_EMAIL: 'Please enter a valid email',
  NAME_TOO_SHORT: 'Name must be at least 3 characters',
  NAME_TOO_LONG: 'Name must be less than 100 characters',
  DUPLICATE_NAME: 'A configuration with this name already exists',
} as const;

