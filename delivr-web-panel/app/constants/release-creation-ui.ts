/**
 * Release Creation UI Constants
 * All display strings, labels, messages, and UI-related constants for release creation
 * 
 * NO HARDCODED STRINGS IN COMPONENTS - USE THIS FILE!
 */

// ============================================================================
// Scheduling Panel
// ============================================================================

export const SCHEDULING_PANEL = {
  // Section Headers
  TITLE: 'Release Scheduling',
  DESCRIPTION_EDIT_MODE: 'Update the target release date and add regression build slots for testing.',
  DESCRIPTION_CREATE_MODE: 'Configure kickoff date and time, and add regression build slots for testing.',
  
  // Kickoff Section
  ENABLE_KICKOFF_DATE_CHANGE: 'Enable Kickoff Date Change',
  ENABLE_KICKOFF_DATE_CHANGE_DESC: 'Enable this toggle to modify the kickoff date and time. Note: Changing the kickoff date will validate all regression slots. Invalid slots will show errors and must be updated.',
  KICKOFF_DATE_CHANGE_WARNING: 'Changing kickoff date will validate all regression slots. Invalid slots will show errors and must be updated to future times.',
  KICKOFF_DATE_LABEL: 'Kickoff Date',
  KICKOFF_TIME_LABEL: 'Kickoff Time',
  KICKOFF_DATE_DESCRIPTION: 'Date when the release branch will be created and release process is initiated.',
  KICKOFF_TIME_DESCRIPTION: 'Use 24-hour format (e.g., 09:00, 14:30).',
  BRANCH_FORK_MESSAGE_PREFIX: 'Branch will fork off on ',
  BRANCH_FORK_MESSAGE_SUFFIX: ' day(s) before release',
  BRANCH_FORK_SAME_DAY: 'same day as release',
  AT: ' at ',
  
  // Kickoff Reminder
  KICKOFF_REMINDER_TITLE: 'Kickoff Reminder',
  KICKOFF_REMINDER_ENABLED_DESC: 'Kickoff reminder is enabled in your release config',
  KICKOFF_REMINDER_DISABLED_DESC: 'Send a reminder before the release kickoff',
  KICKOFF_REMINDER_DATE_LABEL: 'Kickoff Reminder Date',
  KICKOFF_REMINDER_TIME_LABEL: 'Kickoff Reminder Time',
  KICKOFF_REMINDER_DATE_DESCRIPTION: 'Date when to send a reminder notification before the kickoff.',
  KICKOFF_REMINDER_TIME_DESCRIPTION: 'Must be a future time before the kickoff date and time.',
  REMINDER_SENT_MESSAGE_PREFIX: 'Reminder will be sent on',
  REMINDER_SENT_MESSAGE_BEFORE: 'before kickoff on',
  DEFAULT_TIME: 'default time',
  NO_COMMUNICATION_INTEGRATION: 'Connect a communication integration (Slack, Email) in the Integrations page to enable kickoff reminders.',
  COMMUNICATION_NOT_ENABLED: 'Enable communication notifications in your release config to use kickoff reminders.',
  
  // Release Date/Time
  RELEASE_DATE_LABEL: 'Release Date',
  RELEASE_TIME_LABEL: 'Release Time',
  RELEASE_DATE_DESCRIPTION: 'Release time must be after kickoff time.',
  RELEASE_TIME_DESCRIPTION: 'Use 24-hour format (e.g., 10:00, 15:30).',
  
  // Reason for Change (when target release date is modified)
  DELAY_REASON_LABEL: 'Reason for Change',
  DELAY_REASON_PLACEHOLDER: 'e.g., Additional testing required due to critical bug fixes',
  DELAY_REASON_DESCRIPTION: 'Please provide a reason for changing the target release date.',
  
  // Pre-Regression Builds
  PRE_REGRESSION_BUILDS_TITLE: 'Pre-Regression Builds',
  PRE_REGRESSION_ENABLED_DESC: 'Pre-regression workflows are configured in your release config. Enable this to run pre-regression builds before the release.',
  PRE_REGRESSION_DISABLED_DESC: 'No pre-regression workflows found in your release config. Enable this only if you have pre-regression workflows configured.',
  PRE_REGRESSION_DISABLED_WARNING: '⚠️ Pre-regression builds are disabled for this release. Pre-regression testing will be skipped.',
  
  // Validation Messages
  INVALID_REMINDER_FORMAT: 'Invalid reminder date or time format',
  REMINDER_MUST_BE_BEFORE_KICKOFF: 'Kickoff reminder must be before kickoff time',
} as const;

// ============================================================================
// Regression Slots Manager
// ============================================================================

export const REGRESSION_SLOTS_MANAGER = {
  TITLE: 'Regression Build Slots',
  DESCRIPTION: 'Schedule regression builds between kickoff and release dates for testing.',
  ADD_SLOT_BUTTON: 'Add Slot',
  SET_DATES_FIRST: 'Please set kickoff date and target release date first to configure regression slots.',
  NO_SLOTS_MESSAGE: 'No regression slots configured. Click "Add Slot" to schedule builds between kickoff and release.',
} as const;

// ============================================================================
// Regression Slot Card (for Release Creation)
// ============================================================================

export const REGRESSION_SLOT_CARD = {
  // Badges
  NEW_SLOT: 'New Slot',
  SLOT_NUMBER: (index: number) => `Slot ${index + 1}`,
  PAST_SLOT: 'Past Slot',
  REGRESSION_BUILDS_ENABLED: 'Regression Builds Enabled',
  
  // Edit Mode
  EDIT_SLOT_TITLE: (index: number) => `Edit Slot ${index + 1}`,
  NEW_SLOT_TITLE: 'New Slot',
  CANCEL: 'Cancel',
  SAVE: 'Save',
  
  // Validation
  VALIDATION_ERRORS_TITLE: 'Validation Errors:',
  
  // Form Fields
  DATE_LABEL: 'Date',
  TIME_LABEL: 'Time',
  DATE_DESCRIPTION: 'Slot must be between kickoff and target release date',
  TIME_DESCRIPTION: 'Time when this regression build will run',
  
  // Slot Configuration
  SLOT_CONFIGURATION_LABEL: 'Slot Configuration',
  ENABLE_REGRESSION_BUILDS: 'Enable Regression Builds',
  ENABLE_REGRESSION_BUILDS_DESC: 'Trigger regression builds in this slot.',
  
  // Alerts
  PAST_SLOT_MESSAGE: 'This slot is in the past. Update it to a future time to save the release.',
} as const;

// ============================================================================
// Release Details Form
// ============================================================================

export const RELEASE_DETAILS_FORM = {
  TITLE: 'Release Details',
  DESCRIPTION: 'Configure the source branch, release branch name, platform targets with versions, and optional description for this release.',
  
  // Release Type Badges
  MAJOR_RELEASE: 'Major Release',
  MINOR_RELEASE: 'Minor Release',
  HOTFIX: 'Hotfix',
  
  // Base Branch
  BASE_BRANCH_LABEL: 'Base Branch',
  BASE_BRANCH_PLACEHOLDER_LOADING: 'Loading branches...',
  BASE_BRANCH_PLACEHOLDER: 'Select a branch',
  BASE_BRANCH_DESCRIPTION: 'The source branch that will be forked to create the release branch.',
  
  // Release Branch
  RELEASE_BRANCH_LABEL: 'Release Branch Name',
  RELEASE_BRANCH_PLACEHOLDER: 'e.g., release/v1.0.0',
  RELEASE_BRANCH_DESCRIPTION: 'Use semantic versioning (e.g., release/v1.0.0).',
  
  // Description
  DESCRIPTION_LABEL: 'Description',
  DESCRIPTION_PLACEHOLDER: "What's new in this release...",
  DESCRIPTION_DESCRIPTION: "Optional description of what's included in this release. This will be visible to your team.",
  
  // Branch Label Format
  BRANCH_DEFAULT_SUFFIX: ' (default)',
} as const;

// ============================================================================
// Release Review Summary
// ============================================================================

export const RELEASE_REVIEW_SUMMARY = {
  // Section Titles
  RELEASE_INFORMATION: 'Release Information',
  SCHEDULE: 'Schedule',
  CONFIGURATION_APPLIED: 'Configuration Applied',
  AUTOMATION_SETTINGS: 'Automation Settings',
  RELEASE_PREFERENCES: 'Release Preferences',
  
  // Field Labels
  RELEASE_TYPE: 'Release Type',
  BASE_BRANCH: 'Base Branch',
  PLATFORM_TARGETS: 'Platform Targets',
  DESCRIPTION: 'Description',
  TARGET_RELEASE_DATE: 'Target Release Date',
  KICKOFF_DATE: 'Kickoff Date',
  REGRESSION_BUILDS: 'Regression Builds',
  
  // Values
  NOT_SET: 'Not set',
  NONE_SELECTED: 'None selected',
  SCHEDULED: (count: number) => `Scheduled (${count} slot${count !== 1 ? 's' : ''})`,
  MANUAL_UPLOAD: 'Manual Upload',
  SLOT_NUMBER: (index: number) => `Slot ${index + 1}`,
  
  // Configuration Stats
  BUILD_PIPELINES: (count: number) => `${count} build pipelines`,
  TARGET_PLATFORMS: (count: number) => `${count} target platforms`,
  REGRESSION_SLOTS: (count: number) => `${count} regression slots`,
  
  // Automation Settings
  PRE_REGRESSION_BUILDS: 'Pre-Regression Builds:',
  AUTOMATION_RUNS: 'Automation Runs:',
  AUTOMATION_BUILDS: 'Automation Builds:',
  KICKOFF_REMINDER: 'Kickoff Reminder:',
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
  
  // Date Formatting
  INVALID_DATE: 'Invalid date',
} as const;

// ============================================================================
// Date Time Input
// ============================================================================

export const DATE_TIME_INPUT = {
  // This component receives labels as props, so no constants needed here
  // But we can add any shared descriptions or placeholders if needed
} as const;

