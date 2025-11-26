/**
 * Message templates enum mapping tasks to template keys
 * Maps to templates defined in templates/templates.json
 */
export enum Task {
  PRE_KICKOFF_REMINDER = 'pre-kickoff-reminder',
  KICKOFF_DETAILS = 'kickoff-details',
  PREREGRESSION_BUILDS = 'preregression-builds',
  REGRESSION_KICKOFF_REMINDER = 'regression-kickoff-reminder',
  REGRESSION_BUILD_TRIGGERED = 'regression-build-triggered',
  REGRESSION_BUILDS = 'regression-builds',
  RELEASE_NOTES = 'release-notes',
  WHATS_NEW = 'whats-new',
  NEW_SLOT_ADDED = 'new-slot-added',
  IOS_TEST_FLIGHT_BUILD = 'ios-test-flight-build'
}

/**
 * Platform enum for platform-specific templates
 */
export enum Platform {
  IOS = 'ios',
  ANDROID_PLAYSTORE = 'android-playstore',
  ANDROID_WEB = 'android-web'
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
  [ChannelBucket.CRITICAL]: [
    Task.KICKOFF_DETAILS,
    Task.WHATS_NEW
  ],
  [ChannelBucket.RELEASE]: [
    Task.PRE_KICKOFF_REMINDER,
    Task.RELEASE_NOTES
  ],
  [ChannelBucket.BUILD]: [
    Task.NEW_SLOT_ADDED,
    Task.IOS_TEST_FLIGHT_BUILD
  ],
  [ChannelBucket.REGRESSION]: [
    Task.REGRESSION_KICKOFF_REMINDER,
    Task.PREREGRESSION_BUILDS,
    Task.REGRESSION_BUILDS,
    Task.REGRESSION_BUILD_TRIGGERED
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


