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
} as const;

/**
 * Get display label for any build provider (including manual upload)
 */
export const getBuildProviderLabel = (provider: string): string => {
  if (provider === 'JENKINS') return PROVIDER_LABELS.JENKINS;
  if (provider === 'GITHUB_ACTIONS') return PROVIDER_LABELS.GITHUB_ACTIONS;
  if (provider === 'MANUAL_UPLOAD') return BUILD_UPLOAD_LABELS.MANUAL;
  return provider;
};

// ============================================================================
// Environment Display Names
// ============================================================================

export const ENVIRONMENT_LABELS = {
  PRE_REGRESSION: 'Pre-Regression',
  REGRESSION: 'Regression',
  TESTFLIGHT: 'TestFlight',
  PRODUCTION: 'Production',
  AAB_BUILD: 'Playstore Build',
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
  ENABLE: 'Enable',
  DISABLE: 'Disable',
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
  AAB_BUILD_ANDROID: 'Playstore Build',
  PRE_REGRESSION_IOS: 'iOS Pre-Regression Build',
  REGRESSION_IOS: 'iOS Regression Build',
  TESTFLIGHT_IOS: 'iOS TestFlight Build',
} as const;

export const PIPELINE_CATEGORY_DESCRIPTIONS = {
  PRE_REGRESSION_ANDROID: 'Build for pre-regression testing on Android',
  REGRESSION_ANDROID: 'Build for regression testing on Android',
  AAB_BUILD_ANDROID: 'Playstore build for Android releases',
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
// Config Summary Labels
// ============================================================================

export const SUMMARY_LABELS = {
  // Section Titles
  TARGET_PLATFORMS: 'Target Platforms',
  TEST_MANAGEMENT: 'Test Management',
  SCHEDULING: 'Scheduling',
  COMMUNICATION: 'Communication',
  
  // Target Platforms
  NO_TARGETS_SELECTED: 'No target platforms selected',
  
  // Test Management
  PROVIDER: 'Provider:',
  SETTINGS_CONFIGURED: 'Settings configured',
  TEST_MANAGEMENT_DISABLED: 'Test management integration disabled',
  
  // Scheduling
  FREQUENCY: 'Frequency:',
  TIMEZONE: 'Timezone:',
  RELEASE_TIME: 'Release Time:',
  KICKOFF_TIME: 'Kickoff Time:',
  RELEASE_OFFSET: 'Release Offset:',
  WORKING_DAYS: 'Working Days:',
  REGRESSION_SLOTS: 'Regression Slots:',
  SCHEDULING_NOT_CONFIGURED: 'Scheduling not configured',
  
  // Communication
  SLACK_ENABLED: 'Slack Integration Enabled',
  SLACK_DISABLED: 'Slack disabled',
  EMAIL_ENABLED: 'Email Notifications Enabled',
  EMAIL_DISABLED: 'Email disabled',
  
  // Slack Channel Types
  CHANNEL_RELEASES: '• Releases:',
  CHANNEL_BUILDS: '• Builds:',
  CHANNEL_REGRESSION: '• Regression:',
  CHANNEL_CRITICAL: '• Critical:',
  
  // Units & Suffixes
  DAYS_SUFFIX: 'days',
  DAYS_WEEK_SUFFIX: 'days/week',
  SLOTS_SUFFIX: 'slots',
  RECIPIENTS_SUFFIX: 'recipient(s)',
  CUSTOM_FREQUENCY_TEMPLATE: (days: number) => `(${days} days)`,
  
  // Fallbacks
  NONE: 'None',
} as const;

// ============================================================================
// Regression Slot Activity Labels
// ============================================================================

export const REGRESSION_ACTIVITY_LABELS = {
  REGRESSION_BUILDS: 'Builds',
  POST_RELEASE_NOTES: 'Notes',
  AUTOMATION_BUILDS: 'Auto Builds',
  AUTOMATION_RUNS: 'Tests',
} as const;

// ============================================================================
// Info Messages
// ============================================================================

export const INFO_MESSAGES = {
  CONNECT_INTEGRATIONS: 'Please connect CI/CD integrations from the Integrations page to enable automated workflows.',
  REDIRECT_TO_INTEGRATIONS: 'Go to Integrations page to connect CI/CD providers',
  NO_PROVIDERS_CONNECTED: 'No CI/CD providers are connected. Connect Jenkins or GitHub Actions to create workflows.',
  SELECT_PLATFORM_FIRST: 'Select distribution targets in the previous step to continue.',
  NOT_SET: 'Not set',
  MINOR: 'MINOR',
  YES: 'Yes',
  NO: 'No',
  NO_WORKFLOWS_CONFIGURED: 'No workflows configured yet',
  MANUAL_UPLOAD_DASHBOARD_INFO: 'Builds will be uploaded manually through the release dashboard',
  REVIEW_DESCRIPTION: 'Review your release management configuration before saving',
  SETTINGS_CONFIGURED: 'Settings configured',
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
  WORKFLOW_NAME: 'Workflow Name',
  SELECT_WORKFLOW: 'Select Workflow',
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
  CONFIGURATION_NAME: 'Configuration Name',
  RELEASE_TYPE: 'Release Type',
  DEFAULT_CONFIG: 'Default Config',
  CONFIGURED_WORKFLOWS: 'Configured Workflows',
} as const;

// ============================================================================
// Placeholder Text
// ============================================================================

export const PLACEHOLDERS = {
  WORKFLOW_NAME: 'e.g., Android Pre-Regression Build',
  WORKFLOW_NAME_ENTER: 'Enter workflow name',
  SELECT_WORKFLOW: 'Choose a pre-configured workflow',
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
  EXTRA_SMALL: 12,
  SMALL: 16,
  MEDIUM: 20,
  LARGE: 24,
  EXTRA_LARGE: 32,
} as const;

// ============================================================================
// Pipeline Requirement Messages
// ============================================================================

export const PIPELINE_REQUIREMENTS = {
  ANDROID_REGRESSION: 'Android Regression',
  ANDROID_REGRESSION_DESC: 'Required for Play Store releases',
  IOS_REGRESSION: 'iOS Regression',
  IOS_REGRESSION_DESC: 'Required for App Store releases',
  IOS_TESTFLIGHT: 'iOS TestFlight',
  IOS_TESTFLIGHT_DESC: 'Required for TestFlight distribution',
  ALL_CONFIGURED: 'All required pipelines configured ✓',
  MISSING_PIPELINES: 'Required pipelines missing',
  ADD_MISSING_HINT: 'Add the missing pipelines above to continue with the configuration.',
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
  JIRA_PROJECT_KEY_INVALID: 'Must be uppercase letters and numbers',
} as const;

// ============================================================================
// JIRA Field Names (for form handling)
// ============================================================================

/**
 * Frontend JIRA field names (must match backend parameters)
 * Backend: api/script/types/integrations/project-management/configuration/configuration.interface.ts
 * PlatformConfiguration.parameters keys
 */
export const JIRA_FIELD_NAMES = {
  PROJECT_KEY: 'projectKey' as const,
  ISSUE_TYPE: 'issueType' as const,
  COMPLETED_STATUS: 'completedStatus' as const,
  PRIORITY: 'priority' as const,
  LABELS: 'labels' as const,
  ASSIGNEE: 'assignee' as const,
} as const;

/**
 * Backend parameter field names (for API communication)
 * These MUST match the backend PlatformConfiguration.parameters interface
 */
export const JIRA_BACKEND_PARAMS = {
  PROJECT_KEY: 'projectKey',
  ISSUE_TYPE: 'issueType',
  COMPLETED_STATUS: 'completedStatus',
  PRIORITY: 'priority',
  LABELS: 'labels',
  ASSIGNEE: 'assignee',
} as const;

// ============================================================================
// JIRA UI Constants
// ============================================================================

export const JIRA_LABELS = {
  SECTION_TITLE: 'JIRA Project Management',
  SECTION_DESCRIPTION: 'Configure JIRA project tracking for each platform. Each platform can have different project settings.',
  ENABLE_INTEGRATION: 'Enable JIRA Integration',
  ENABLE_DESCRIPTION: 'Link releases and builds to JIRA issues',
  INTEGRATION_LABEL: 'JIRA Integration',
  INTEGRATION_PLACEHOLDER: 'Select a connected JIRA integration',
  INTEGRATION_DESCRIPTION: 'Choose which JIRA instance to use',
  PLATFORM_SETTINGS_TITLE: 'Platform-Specific Settings',
  PLATFORM_SETTINGS_DESCRIPTION: 'Configure JIRA project settings for each platform. Different platforms can use different projects, issue types, and completion statuses.',
  GLOBAL_SETTINGS_TITLE: 'Global Settings',
  AUTO_CREATE_TICKETS: 'Auto-create release tickets',
  AUTO_CREATE_DESCRIPTION: 'Automatically create JIRA tickets for each release',
  LINK_BUILDS: 'Link builds to JIRA issues',
  LINK_BUILDS_DESCRIPTION: 'Automatically link build information to relevant JIRA issues',
  PROJECT_KEY: 'Project Key',
  PROJECT_KEY_PLACEHOLDER: 'e.g., APP, FE, MOBILE',
  PROJECT_KEY_DESCRIPTION: 'JIRA project key (uppercase letters and numbers)',
  ISSUE_TYPE: 'Issue Type',
  ISSUE_TYPE_PLACEHOLDER: 'Select issue type',
  ISSUE_TYPE_DESCRIPTION: 'Type of JIRA issue to create for releases',
  COMPLETION_STATUS: 'Completion Status',
  COMPLETION_STATUS_PLACEHOLDER: 'Select completion status',
  COMPLETION_STATUS_DESCRIPTION: 'Status that indicates work is complete',
  PRIORITY: 'Priority',
  PRIORITY_PLACEHOLDER: 'Select default priority',
  PRIORITY_DESCRIPTION: 'Default priority for created issues',
  NO_PLATFORMS_WARNING: 'Please select at least one platform in the "Target Platforms" step before configuring JIRA.',
  NO_INTEGRATIONS_WARNING: 'Please connect a JIRA integration first in the Integrations page.',
  CREATE_LABEL: '+ Create',
} as const;

// ============================================================================
// Communication / Slack UI Constants
// ============================================================================

export const COMMUNICATION_LABELS = {
  SECTION_TITLE: 'Communication Channels',
  SECTION_DESCRIPTION: 'Configure Slack notifications for your team',
  NO_INTEGRATIONS_TITLE: 'No Communication Integrations Configured',
  NO_INTEGRATIONS_MESSAGE: 'You need to connect a communication integration (like Slack) before you can configure notifications.',
  GO_TO_INTEGRATIONS: 'Go to Integrations',
} as const;

export const SLACK_LABELS = {
  INTEGRATION_TITLE: 'Slack Integration',
  ENABLE_NOTIFICATIONS: 'Enable Slack Notifications',
  ENABLE_DESCRIPTION: 'Send release updates and notifications to Slack',
  WORKSPACE_LABEL: 'Slack Workspace',
  WORKSPACE_PLACEHOLDER: 'Select Slack integration',
  WORKSPACE_DESCRIPTION: 'Choose the connected Slack workspace',
  NO_WORKSPACE_MESSAGE: 'No Slack integration found. Please connect Slack in the Integrations page before configuring notifications.',
  LOADING_CHANNELS: 'Loading channels...',
  NO_CHANNELS_MESSAGE: 'No channels found for this workspace.',
  CHANNEL_MAPPINGS_TITLE: 'Channel Mappings',
  
  // Channel types
  RELEASES_LABEL: 'Releases Channels',
  RELEASES_DESCRIPTION: 'Release announcements and status updates (supports multiple channels)',
  BUILDS_LABEL: 'Builds Channels',
  BUILDS_DESCRIPTION: 'Build status and completion notifications (supports multiple channels)',
  REGRESSION_LABEL: 'Regression Channels',
  REGRESSION_DESCRIPTION: 'Regression test updates (supports multiple channels)',
  CRITICAL_LABEL: 'Critical Alerts Channels',
  CRITICAL_DESCRIPTION: 'Critical issues and urgent notifications (supports multiple channels)',
  
  // Common
  SELECT_CHANNELS_PLACEHOLDER: 'Select channels',
} as const;

// ============================================================================
// Platform Selection UI Constants
// ============================================================================

export const PLATFORM_SELECTION_LABELS = {
  SECTION_TITLE: 'Platforms & Distribution Targets',
  SECTION_DESCRIPTION: 'Select platforms and their distribution targets',
  STEP_1: 'Step 1: Select platforms (Android/iOS)',
  STEP_2: 'Step 2: For each platform, select distribution targets',
  DISTRIBUTION_TARGETS_LABEL: 'Distribution Targets:',
  TARGET_SINGULAR: 'target',
  TARGET_PLURAL: 'targets',
  TARGETS_CONFIGURED: 'distribution target(s) configured',
  SELECT_AT_LEAST_ONE: 'Please select at least one distribution target to continue.',
  SELECTED_PREFIX: 'Selected:',
  COMING_SOON: 'Coming Soon',
} as const;

// ============================================================================
// Test Management UI Constants
// ============================================================================

export const TEST_MANAGEMENT_LABELS = {
  SECTION_TITLE: 'Test Management Integration',
  SECTION_DESCRIPTION: 'Connect your test management tool to track test execution during releases',
  OPTIONAL_INFO: 'Optional: Test management integration allows you to automatically create test runs, track test execution status, and link test results to your releases.',
  ENABLE_INTEGRATION: 'Enable Test Management Integration',
  ENABLE_DESCRIPTION: 'Connect a test management tool for automated test tracking',
  PROVIDER_LABEL: 'Test Management Provider',
  PROVIDER_PLACEHOLDER: 'Select a provider',
  CHECKMATE_CONFIG_TITLE: 'Checkmate Configuration',
  NO_CHECKMATE_MESSAGE: 'No Checkmate integration found. Please connect Checkmate in the Integrations page before configuring test management.',
  TESTRAIL_COMING_SOON: 'TestRail integration coming soon. Stay tuned!',
  ZEPHYR_COMING_SOON: 'Zephyr integration coming soon. Stay tuned!',
  DISABLED_MESSAGE: 'Test management integration is disabled. You can still create releases without automated test tracking.',
} as const;

// ============================================================================
// Scheduling UI Constants
// ============================================================================

export const SCHEDULING_LABELS = {
  SECTION_TITLE: 'Release Scheduling',
  SECTION_DESCRIPTION: 'Configure release cadence, timing, and regression test slots',
  ENABLE_RELEASE_TRAIN: 'Enable Release Train Scheduling',
  ENABLE_DESCRIPTION: 'Automate release cycles with predefined schedules, regression slots, and working days',
  OPTIONAL_INFO: 'Release train scheduling is optional.',
  OPTIONAL_DETAIL: 'Enable it if you want to automate recurring releases with predefined cycles, kickoff times, regression slots, and working days.',
  WITHOUT_SCHEDULING: 'Without scheduling, you\'ll create releases manually when needed.',
  CONFIGURE_BELOW: 'Configure your release train schedule below. All fields are required for automated release cycles.',
  VALIDATION_ERRORS: 'Validation Errors',
  
  // Frequency
  FREQUENCY_TITLE: 'Release Frequency',
  FREQUENCY_LABEL: 'Frequency',
  FREQUENCY_PLACEHOLDER: 'Select release frequency',
  FREQUENCY_DESCRIPTION: 'How often do you want to create releases?',
  CUSTOM_FREQUENCY_LABEL: 'Custom Frequency (Days)',
  CUSTOM_FREQUENCY_PLACEHOLDER: '21',
  CUSTOM_FREQUENCY_DESCRIPTION: 'Number of days between releases',
  ESTIMATED_DAYS: 'Estimated Days',
  
  // Dates & Times
  FIRST_KICKOFF_TITLE: 'First Release Kickoff Date',
  FIRST_KICKOFF_DESCRIPTION: 'The date when the first release cycle will start',
  KICKOFF_DATE_LABEL: 'Kickoff Date',
  KICKOFF_DATE_PLACEHOLDER: 'Select date',
  FIRST_KICKOFF_DATE_DISABLED_DESCRIPTION: 'First release kickoff date cannot be changed after the release train is created. The first release has already been initialized with this date.',
  
  // Initial Versions
  INITIAL_VERSIONS_TITLE: 'Initial Release Versions',
  INITIAL_VERSIONS_DESCRIPTION: 'Starting version numbers for configured platforms (e.g., 1.0.0)',
  INITIAL_VERSION_LABEL: 'Initial Version',
  INITIAL_VERSION_PLACEHOLDER: '1.0.0',
  INITIAL_VERSION_HINT: 'These versions will be used as the starting point for auto-incrementing release versions. Use semantic versioning format (MAJOR.MINOR.PATCH).',
  SEMANTIC_VERSION_DESCRIPTION: 'Semantic version for {platform} (e.g., 1.0.0)',
  
  // Kickoff Settings
  KICKOFF_SETTINGS_TITLE: 'Kickoff Settings',
  KICKOFF_SETTINGS_DESCRIPTION: 'When the release cycle begins',
  KICKOFF_TIME_LABEL: 'Kickoff Time',
  KICKOFF_TIME_DESCRIPTION: 'Time when release kickoff happens',
  KICKOFF_REMINDER_DIVIDER: 'Kickoff Reminder',
  ENABLE_REMINDER: 'Enable Kickoff Reminder',
  REMINDER_DESCRIPTION: 'Send a reminder before the kickoff',
  REMINDER_TIME_LABEL: 'Reminder Time',
  REMINDER_TIME_DESCRIPTION: 'Must be before or equal to kickoff time',
  REMINDER_TIME_ERROR: 'Must be before or equal to kickoff time',
  
  // Target Release
  TARGET_RELEASE_TITLE: 'Target Release Settings',
  TARGET_RELEASE_DESCRIPTION: 'When the release is scheduled to go live',
  DAYS_FROM_KICKOFF_LABEL: 'Days from Kickoff',
  DAYS_FROM_KICKOFF_PLACEHOLDER: '5',
  DAYS_FROM_KICKOFF_DESCRIPTION: 'Days between kickoff and release',
  DAYS_FROM_KICKOFF_ERROR: 'Must be 0 or greater',
  TARGET_RELEASE_TIME_LABEL: 'Target Release Time',
  TARGET_RELEASE_TIME_DESCRIPTION: 'Time for the release',
  
  // Regression Slots
  REGRESSION_SLOTS_TITLE: 'Regression Slots',
  REGRESSION_SLOTS_DESCRIPTION: 'Scheduled regression testing windows',
  ADD_SLOT: 'Add Slot',
  NO_SLOTS_MESSAGE: 'No regression slots configured yet. Click "Add Slot" to create one.',
  SLOT_NAME_LABEL: 'Slot Name (Optional)',
  SLOT_NAME_PLACEHOLDER: 'e.g., Morning Regression',
  SLOT_OFFSET_LABEL: 'Days from Kickoff',
  SLOT_TIME_LABEL: 'Time',
  SLOT_TIME_DESCRIPTION: 'Must be chronologically between kickoff and release',
  SLOT_CONFIG_DIVIDER: 'Slot Configuration',
  ENABLE_REGRESSION_BUILDS: 'Enable Regression Builds',
  REGRESSION_BUILDS_DESCRIPTION: 'Trigger regression builds in this slot',
  EDIT_SLOT: 'Edit Slot',
  COLLAPSE: 'Collapse',
  SLOT_INDEX: 'Slot',
  DAY_PREFIX: 'Day',
  AT: 'at',
  REGRESSION_BUILDS_ENABLED: 'Regression Builds Enabled',
  OFFSET_ERROR_NEGATIVE: 'Cannot be negative',
  OFFSET_ERROR_TOO_LARGE: 'Must be ≤',
  SLOT_BEFORE_KICKOFF: 'Slot is before kickoff (Day 0 at {time})',
  SLOT_AFTER_RELEASE: 'Slot is after release (Day {day} at {time})',
} as const;

// ============================================================================
// Configuration List Labels
// ============================================================================

export const CONFIG_LIST_LABELS = {
  // Page Header
  PAGE_TITLE: 'Release Configurations',
  PAGE_DESCRIPTION: 'Manage your release management configurations',
  
  // Actions
  NEW_CONFIGURATION: 'New Configuration',
  
  // Search & Filters
  SEARCH_PLACEHOLDER: 'Search configurations...',
  STATUS_FILTER_PLACEHOLDER: 'Status',
  TYPE_FILTER_PLACEHOLDER: 'Type',
  
  // Status Options
  STATUS_ACTIVE: 'Active',
  STATUS_DRAFT: 'Draft',
  STATUS_ARCHIVED: 'Archived',
  
  // Release Type Options
  TYPE_MINOR: 'Minor',
  TYPE_HOTFIX: 'Hotfix',
  TYPE_MAJOR: 'Major',
  
  // Empty States
  NO_CONFIGS_MESSAGE: 'No configurations created yet',
  NO_MATCHES_MESSAGE: 'No configurations match your filters',
  
  // Export
  EXPORT_FILE_SUFFIX: '-config.json',
} as const;

// ============================================================================
// Configuration Status Values (for filtering/comparison)
// ============================================================================

export const CONFIG_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

// ============================================================================
// Release Type Values (for filtering/comparison)
// ============================================================================

export const RELEASE_TYPE = {
  MINOR: 'MINOR',
  HOTFIX: 'HOTFIX',
  MAJOR: 'MAJOR',
} as const;

// ============================================================================
// Wizard Navigation Labels
// ============================================================================

export const WIZARD_NAV_LABELS = {
  // Actions
  CANCEL: 'Cancel',
  PREVIOUS: 'Previous',
  NEXT_STEP: 'Next Step',
  SAVE_CONFIGURATION: 'Save Configuration',
  UPDATE_CONFIGURATION: 'Update Configuration',
  
  // Step Indicator
  STEP_INDICATOR: (current: number, total: number) => `Step ${current} of ${total}`,
} as const;

// ============================================================================
// Default Configuration Values
// ============================================================================

export const DEFAULT_SCHEDULING_CONFIG = {
  // Version
  INITIAL_VERSION: '1.0.0',
  
  // Frequency
  RELEASE_FREQUENCY: 'WEEKLY' as const,
  
  // Times
  KICKOFF_TIME: '10:00',
  KICKOFF_REMINDER_TIME: '09:00',
  TARGET_RELEASE_TIME: '18:00',
  
  // Dates & Offsets
  TARGET_RELEASE_OFFSET_DAYS: 5,
  
  // Working Days (Monday to Friday)
  WORKING_DAYS: [1, 2, 3, 4, 5] as const,
  
  // Timezone
  DEFAULT_TIMEZONE: 'Asia/Kolkata',
  
  // Flags
  KICKOFF_REMINDER_ENABLED: true,
} as const;

