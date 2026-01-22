/**
 * Message templates enum mapping tasks to template keys
 * Maps to templates defined in templates/templates.json
 * 
 * NOTE: Each Task value must match a key in templates.json exactly
 */
export enum Task {
  // Kickoff Stage
  PRE_KICKOFF_REMINDER = 'pre-kickoff-reminder',
  BRANCH_FORKOUT = 'branch-forkout',
  PROJECT_MANAGEMENT_LINKS = 'project-management-links',
  TEST_MANAGEMENT_LINKS = 'test-management-links',
  
  // Pre-Regression Builds
  PREREGRESSION_BUILDS = 'preregression-builds',
  PREREGRESSION_BUILDS_FAILED = 'preregression-builds-failed',
  
  // Regression Stage
  REGRESSION_KICKOFF_REMINDER = 'regression-kickoff-reminder',
  REGRESSION_BUILDS = 'regression-builds',
  REGRESSION_BUILDS_FAILED = 'regression-builds-failed',
  RELEASE_NOTES = 'release-notes',
  FINAL_RELEASE_NOTES = 'final-release-notes',
  TEST_RESULTS_SUMMARY = 'test-results-summary',
  NEW_SLOT_ADDED = 'new-slot-added',
  
  // Post-Regression / Distribution
  IOS_TEST_FLIGHT_BUILD = 'ios-test-flight-build',
  ANDROID_AAB_BUILD = 'android-aab-build',
  WHATS_NEW = 'whats-new',
  
  // Approvals
  REGRESSION_STAGE_APPROVAL_REQUEST = 'regression-stage-approval-request',
  PRE_RELEASE_STAGE_APPROVAL_REQUEST = 'pre-release-stage-approval-request',
  PROJECT_MANAGEMENT_APPROVAL = 'project-management-approval',
  
  // Release Updates
  TARGET_DATE_CHANGED = 'target-date-changed',
  // Generic Distribution Notifications
  BUILD_SUBMITTED = 'build-submitted',
  BUILD_RESUBMITTED = 'build-resubmitted',
  BUILD_LIVE = 'build-live',
  BUILD_REJECTED = 'build-rejected',
  BUILD_CANCELLED = 'build-cancelled',
  BUILD_USER_ACTION_PENDING = 'build-user-action-pending',
  BUILD_SUSPENDED = 'build-suspended',
  
  // Failures & Reminders
  TASK_FAILED = 'task-failed',
  MANUAL_BUILD_UPLOAD_REMINDER = 'manual-build-upload-reminder'
}

/**
 * Platform enum for platform-specific templates
 * Values must match the platform keys in templates.json
 */
export enum Platform {
  IOS_APP_STORE = 'ios_app_store',
  ANDROID_PLAY_STORE = 'android_play_store',
  ANDROID_WEB = 'android_web'
}

/**
 * Template metadata structure
 */
export type TemplateMetadata = {
  name: string;
  emoji: string;
  color: string;
  category: string;
  showTitle?: boolean;
};

/**
 * Simple template structure (non-platform-specific)
 */
export type SimpleTemplate = {
  metadata: TemplateMetadata;
  fields: string[];
  description: string;
  usage?: {
    parameters: string[];
    example: string;
  };
};

/**
 * Platform-specific template structure
 */
export type PlatformTemplate = {
  platforms: Record<Platform, SimpleTemplate>;
};

/**
 * Template can be either simple or platform-specific
 */
export type Template = SimpleTemplate | PlatformTemplate;

/**
 * Templates collection structure
 */
export type TemplatesCollection = {
  templates: Record<string, Template>;
};

/**
 * Type guard to check if a template is platform-specific
 */
export const isPlatformTemplate = (template: Template): template is PlatformTemplate => {
  return 'platforms' in template;
};

/**
 * Channel Bucket - Named group of channels associated with specific tasks
 * Provides more flexible channel organization than stage-based approach
 */
export enum ChannelBucket {
  RELEASE = 'releases',
  BUILD = 'builds',
  REGRESSION = 'regression',
  CRITICAL = 'critical'
}

/**
 * Mapping of channel buckets to their associated tasks
 * One bucket can handle multiple tasks
 */
export const BUCKET_TASK_MAPPING: Record<ChannelBucket, Task[]> = {
  [ChannelBucket.RELEASE]: [
    Task.PRE_KICKOFF_REMINDER,
    Task.PROJECT_MANAGEMENT_APPROVAL,
    Task.BRANCH_FORKOUT,
    Task.FINAL_RELEASE_NOTES,
    Task.WHATS_NEW,
    Task.REGRESSION_STAGE_APPROVAL_REQUEST,
    Task.PRE_RELEASE_STAGE_APPROVAL_REQUEST,
    Task.TARGET_DATE_CHANGED,
    Task.BUILD_SUBMITTED,  // New generic
    Task.BUILD_RESUBMITTED,  // New generic
    Task.BUILD_LIVE,  // New generic
    Task.BUILD_REJECTED,  // New generic
    Task.BUILD_CANCELLED,  // New generic
    Task.BUILD_USER_ACTION_PENDING,  // New generic
    Task.BUILD_SUSPENDED  // New generic
  ],
  [ChannelBucket.BUILD]: [
    Task.PREREGRESSION_BUILDS,
    Task.REGRESSION_BUILDS,
    Task.IOS_TEST_FLIGHT_BUILD,
    Task.ANDROID_AAB_BUILD,
    Task.MANUAL_BUILD_UPLOAD_REMINDER,
  ],
  [ChannelBucket.REGRESSION]: [
    Task.PRE_KICKOFF_REMINDER,
    Task.BRANCH_FORKOUT,
    Task.PROJECT_MANAGEMENT_LINKS,
    Task.TEST_MANAGEMENT_LINKS,
    Task.REGRESSION_KICKOFF_REMINDER,
    Task.TEST_RESULTS_SUMMARY,
    Task.NEW_SLOT_ADDED,
    Task.RELEASE_NOTES
  ],
  [ChannelBucket.CRITICAL]: [
    Task.PREREGRESSION_BUILDS_FAILED,
    Task.REGRESSION_BUILDS_FAILED,
    Task.TASK_FAILED
  ]
};

/**
 * Channel Bucket Configuration
 * Defines which channels belong to which bucket for a specific configuration
 */
export type ChannelBucketConfig = {
  bucketName: ChannelBucket;
  channels: Array<{
    id: string;
    name: string;
  }>;
  tasks: Task[];
};


