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
  
  // Release Updates
  TARGET_DATE_CHANGED = 'target-date-changed',
  IOS_APPSTORE_BUILD_SUBMITTED = 'ios-appstore-build-submitted',
  ANDROID_PLAYSTORE_BUILD_SUBMITTED = 'android-playstore-build-submitted',
  IOS_APPSTORE_BUILD_RESUBMITTED = 'ios-appstore-build-resubmitted',
  ANDROID_PLAYSTORE_BUILD_RESUBMITTED = 'android-playstore-build-resubmitted',
  
  // Release Live
  IOS_APPSTORE_LIVE = 'ios-appstore-live',
  ANDROID_PLAYSTORE_LIVE = 'android-playstore-live',
  ANDROID_WEB_LIVE = 'android-web-live',
  
  // Release Status Alerts
  IOS_APPSTORE_BUILD_REJECTED = 'ios-appstore-build-rejected',
  IOS_APPSTORE_BUILD_CANCELLED = 'ios-appstore-build-cancelled',
  ANDROID_PLAYSTORE_USER_ACTION_PENDING = 'android-playstore-user-action-pending',
  ANDROID_PLAYSTORE_SUSPENDED = 'android-playstore-suspended',
  
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
  RELEASE = 'release',
  BUILD = 'build',
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
    Task.RELEASE_NOTES,
    Task.FINAL_RELEASE_NOTES,
    Task.REGRESSION_STAGE_APPROVAL_REQUEST,
    Task.PRE_RELEASE_STAGE_APPROVAL_REQUEST,
    Task.TARGET_DATE_CHANGED,
    Task.IOS_APPSTORE_BUILD_SUBMITTED,
    Task.ANDROID_PLAYSTORE_BUILD_SUBMITTED
  ],
  [ChannelBucket.BUILD]: [
    Task.PREREGRESSION_BUILDS,
    Task.REGRESSION_BUILDS,
    Task.IOS_TEST_FLIGHT_BUILD,
    Task.ANDROID_AAB_BUILD,
    Task.NEW_SLOT_ADDED,
    Task.MANUAL_BUILD_UPLOAD_REMINDER
  ],
  [ChannelBucket.REGRESSION]: [
    Task.REGRESSION_KICKOFF_REMINDER,
    Task.TEST_RESULTS_SUMMARY
  ],
  [ChannelBucket.CRITICAL]: [
    Task.BRANCH_FORKOUT,
    Task.PROJECT_MANAGEMENT_LINKS,
    Task.TEST_MANAGEMENT_LINKS,
    Task.WHATS_NEW,
    Task.PREREGRESSION_BUILDS_FAILED,
    Task.REGRESSION_BUILDS_FAILED,
    Task.TASK_FAILED,
    Task.IOS_APPSTORE_LIVE,
    Task.ANDROID_PLAYSTORE_LIVE,
    Task.ANDROID_WEB_LIVE,
    Task.IOS_APPSTORE_BUILD_REJECTED,
    Task.IOS_APPSTORE_BUILD_CANCELLED,
    Task.ANDROID_PLAYSTORE_USER_ACTION_PENDING,
    Task.ANDROID_PLAYSTORE_SUSPENDED,
    Task.IOS_APPSTORE_BUILD_RESUBMITTED,
    Task.ANDROID_PLAYSTORE_BUILD_RESUBMITTED
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


