/**
 * Release Configuration Types
 * Complete type definitions for the release configuration system
 */

// ============================================================================
// Workflow Configuration (CI/CD Pipelines)
// ============================================================================

export type BuildUploadStep = 'MANUAL' | 'CI_CD';

export type BuildProvider = 'JENKINS' | 'GITHUB_ACTIONS' | 'MANUAL_UPLOAD';

export type BuildEnvironment = 'PRE_REGRESSION' | 'REGRESSION' | 'TESTFLIGHT' | 'PRODUCTION';

export type Platform = 'ANDROID' | 'IOS';

export type TargetPlatform = 'WEB' | 'PLAY_STORE' | 'APP_STORE';

// Workflow (CI/CD Pipeline Job)
export interface Workflow {
  id: string;
  name: string;
  platform: Platform;
  environment: BuildEnvironment;
  provider: BuildProvider;
  
  // Provider-specific configuration
  providerConfig: JenkinsConfig | GitHubActionsConfig | ManualUploadConfig;
  
  // Job execution settings
  enabled: boolean;
  timeout?: number; // seconds
  retryAttempts?: number;
}

// Backward compatibility alias
export type BuildPipelineJob = Workflow;

export interface JenkinsConfig {
  type: 'JENKINS';
  integrationId: string; // Reference to connected Jenkins integration
  jobUrl: string;
  parameters: Record<string, string>; // Key-value pairs for job parameters
}

export interface GitHubActionsConfig {
  type: 'GITHUB_ACTIONS';
  integrationId: string; // Reference to connected GitHub integration
  workflowUrl: string; // Full GitHub URL to workflow file (e.g., "https://github.com/owner/repo/blob/branch/.github/workflows/build.yml")
  // Legacy fields (optional, for backward compatibility)
  workflowId?: string; // Optional - not required by backend
  workflowPath?: string; // Optional - kept for backward compatibility
  branch?: string; // Optional - extracted from workflowUrl if not provided
  inputs: Record<string, string>; // Workflow inputs
}

export interface ManualUploadConfig {
  type: 'MANUAL_UPLOAD';
  instructions?: string; // Optional instructions for manual upload
}

// ============================================================================
// Test Management Configuration
// ============================================================================

export type TestManagementProvider = 'checkmate' | 'testrail' | 'zephyr' | 'none';

export interface TestManagementConfig {
  enabled: boolean;
  provider: TestManagementProvider;
  integrationId?: string; // Reference to connected integration
  projectId?: string;
  
  // Provider-specific configuration
  providerConfig?: CheckmateSettings | TestRailSettings;
}

export interface CheckmatePlatformConfiguration {
  // Platform is a global system constant (not distribution-specific)
  platform: 'ANDROID' | 'IOS';
  projectId?: number; // Platform-specific project ID
  sectionIds?: number[];
  labelIds?: number[];
  squadIds?: number[];
}

export interface CheckmateSettings {
  type: 'checkmate';
  integrationId: string; // ID of the connected integration
  projectId: number; // Checkmate project ID
  
  // Platform-specific configurations
  platformConfigurations: CheckmatePlatformConfiguration[];
  
  // Test run settings
  autoCreateRuns: boolean;
  runNameTemplate?: string; // e.g., "v{{version}} - {{platform}} - {{date}}"
  passThresholdPercent: number; // 0-100
  filterType: 'AND' | 'OR'; // Default: 'AND'
}

export interface TestRailSettings {
  type: 'testrail';
  projectId: string;
  suiteId: string;
  autoCreateRuns: boolean;
}

// ============================================================================
// Scheduling Configuration
// ============================================================================

export type ReleaseFrequency = 'WEEKLY' | 'BIWEEKLY' | 'TRIWEEKLY' | 'MONTHLY' | 'CUSTOM';

export interface SchedulingConfig {
  // Release frequency
  releaseFrequency: ReleaseFrequency;
  customFrequencyDays?: number; // For CUSTOM frequency
  
  // First release date (kickoff date)
  firstReleaseKickoffDate: string; // ISO date string
  
  // Platform-specific initial release versions (only for configured platforms)
  initialVersions: Partial<Record<Platform, string>>; // e.g., { ANDROID: "1.0.0", IOS: "1.0.0" }
  
  // Kickoff settings
  kickoffTime: string; // HH:MM format (24-hour)
  kickoffReminderEnabled: boolean;
  kickoffReminderTime: string; // HH:MM format (must be <= kickoffTime)
  
  // Target release settings
  targetReleaseTime: string; // HH:MM format (24-hour)
  targetReleaseDateOffsetFromKickoff: number; // Days from kickoff (must be >= 0)
  
  // Working days (1 = Monday, 7 = Sunday)
  workingDays: number[]; // e.g., [1, 2, 3, 4, 5] for Mon-Fri
  timezone: string; // e.g., "Asia/Kolkata", "America/New_York"
  
  // Regression slots
  regressionSlots: RegressionSlot[];
}

export interface RegressionSlot {
  id: string;
  name?: string; // Optional custom name
  regressionSlotOffsetFromKickoff: number; // Days from kickoff (must be <= targetReleaseDateOffsetFromKickoff)
  time: string; // HH:MM format (must be <= targetReleaseTime if offsets match)
  
  // What happens in this slot (per backend API contract)
  config: {
    regressionBuilds: boolean;
    postReleaseNotes: boolean;
    automationBuilds: boolean;
    automationRuns: boolean;
  };
}

// ============================================================================
// Jira Project Configuration
// ============================================================================

/**
 * Platform-specific JIRA configuration
 * Each platform can have different project settings
 */
export interface ProjectManagementPlatformConfig {
  platform: Platform; // Platform identifier (ANDROID | IOS)
  projectKey: string; // JIRA project key (e.g., "FE", "APP", "MOBILE")
  issueType?: string; // Issue type (e.g., "Epic", "Story", "Task", "Bug")
  completedStatus: string; // Status indicating completion (e.g., "Done", "Released", "Closed")
  priority?: string; // Default priority (e.g., "High", "Medium", "Low")
  labels?: string[]; // JIRA labels
  assignee?: string; // Default assignee
  customFields?: Record<string, any>; // Custom JIRA fields
}

/**
 * Project Management Configuration (JIRA)
 * Flexible structure with enabled flag and platform configurations
 */
export interface ProjectManagementConfig {
  enabled: boolean;
  integrationId: string; // Reference to connected JIRA integration
  
  // Platform-specific configurations
  platformConfigurations: ProjectManagementPlatformConfig[]; // One config per platform
  
  // Global settings
  createReleaseTicket?: boolean; // Auto-create release tickets
  linkBuildsToIssues?: boolean; // Link build info to Jira issues
}

// Legacy type aliases for backward compatibility
export type JiraProjectConfig = ProjectManagementConfig;
export type JiraPlatformConfig = ProjectManagementPlatformConfig;

// ============================================================================
// Communication Configuration
// ============================================================================

export type SlackChannelConfigMode = 'GLOBAL' | 'STAGE_WISE';

export interface SlackChannel {
  id: string;
  name: string;
}

export interface SlackChannelConfig {
  releases: SlackChannel[]; // Array of channel objects with id and name
  builds: SlackChannel[];
  regression: SlackChannel[];
  critical: SlackChannel[];
}

export interface StageWiseSlackChannels {
  preRegression?: SlackChannelConfig;
  regression?: SlackChannelConfig;
  testflight?: SlackChannelConfig;
  production?: SlackChannelConfig;
}

/**
 * Communication Configuration
 * Flexible structure supporting multiple channels (Slack, Email, MS Teams, etc.)
 */
export interface CommunicationConfig {
  slack?: {
    enabled: boolean;
    integrationId: string;
    channelData: SlackChannelConfig; // Channel data with id and name for different notification types
  };
  
  email?: {
    enabled: boolean;
    notificationEmails: string[];
  };
  
  // Future: msTeams, discord, etc.
}

// ============================================================================
// Complete Release Configuration
// ============================================================================

export interface ReleaseConfiguration {
  id: string; // Config ID
  tenantId: string; // Match backend schema (was: organizationId)
  
  // Configuration metadata
  name: string; // e.g., "Standard Release Configuration", "Hotfix Configuration"
  description?: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR'; // Match backend enum
  isDefault: boolean;
  
  // Default base branch (from SCM integration)
  baseBranch?: string; // e.g., 'main', 'develop', 'master'
  
  // Platforms configured in this release
  platforms: Platform[]; // e.g., ['ANDROID', 'IOS']
  
  // Target platforms (match backend: defaultTargets → targets)
  targets: TargetPlatform[];
  
  // Build upload method
  hasManualBuildUpload: boolean; // true = manual upload, false = CI/CD
  
  // Workflows (CI/CD pipelines - optional, only used when hasManualBuildUpload = false)
  workflows: Workflow[];
  
  // Test management (field name matches backend POST/GET - with Config suffix)
  testManagementConfig: TestManagementConfig;
  
  // Project management / JIRA (field name matches backend POST/GET - with Config suffix)
  projectManagementConfig: ProjectManagementConfig;

  // Scheduling (Optional - for release train automation)
  scheduling?: SchedulingConfig;

  // Communication / Slack (field name matches backend POST/GET - with Config suffix)
  communicationConfig: CommunicationConfig;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

// ============================================================================
// Configuration Wizard State
// ============================================================================

export interface ConfigWizardState {
  currentStep: number;
  totalSteps: number;
  config: Partial<ReleaseConfiguration>;
  errors: Record<string, string[]>;
  isValid: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SaveConfigRequest {
  organizationId: string;
  config: ReleaseConfiguration;
}

export interface SaveConfigResponse {
  success: boolean;
  configId: string;
  message?: string;
}

export interface GetConfigRequest {
  organizationId: string;
  configId?: string; // If not provided, returns default config
}

export interface GetConfigResponse {
  success: boolean;
  config?: ReleaseConfiguration;
  message?: string;
}

// ============================================================================
// Integration References (from existing integrations)
// ============================================================================

export interface IntegrationReference {
  id: string;
  type: 'JENKINS' | 'GITHUB' | 'SLACK' | 'CHECKMATE' | 'JIRA';
  name: string; // Display name
  isActive: boolean;
  verificationStatus: 'VALID' | 'INVALID' | 'PENDING';
}

// ============================================================================
// Helper Types
// ============================================================================

export type ConfigStep = 
  | 'build-pipelines'
  | 'target-platforms'
  | 'test-management'
  | 'scheduling'
  | 'communication'
  | 'review';

export interface StepConfig {
  id: ConfigStep;
  title: string;
  description: string;
  isComplete: boolean;
  isRequired: boolean;
}

