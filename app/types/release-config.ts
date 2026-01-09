/**
 * Release Configuration Types
 * Complete type definitions for the release configuration system
 */

// ============================================================================
// Workflow Configuration (CI/CD Pipelines)
// ============================================================================

export type BuildUploadStep = 'MANUAL' | 'CI_CD';

export type BuildProvider = 'JENKINS' | 'GITHUB_ACTIONS' | 'MANUAL_UPLOAD';

export type BuildEnvironment = 'PRE_REGRESSION' | 'REGRESSION' | 'TESTFLIGHT' | 'AAB_BUILD';

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

/**
 * Test Management Config (matches backend format)
 * Flattened structure aligns with backend API contract and eliminates transformation overhead.
 */
export interface TestManagementConfig {
  enabled: boolean;
  provider: TestManagementProvider;
  integrationId: string; // Required (matches backend)
  id?: string; // For updates
  platformConfigurations: CheckmatePlatformConfiguration[];
  passThresholdPercent: number;
  autoCreateRuns: boolean;
  filterType: 'AND' | 'OR';
}

export interface CheckmatePlatformConfiguration {
  // Platform is a global system constant (not distribution-specific)
  platform: Platform;
  projectId?: number; // Platform-specific project ID
  sectionIds?: number[];
  labelIds?: number[];
  squadIds?: number[];
}

// CheckmateSettings removed - use TestManagementConfig with platformConfigurations instead

export interface TestRailSettings {
  type: 'testrail';
  projectId: string;
  suiteId: string;
  autoCreateRuns: boolean;
}

// ============================================================================
// Scheduling Configuration
// ============================================================================

export type ReleaseFrequency = 'WEEKLY' | 'BIWEEKLY' | 'TRIWEEKLY' | 'MONTHLY';

export interface SchedulingConfig {
  // Runtime fields (from backend - present when schedule exists)
  id?: string; // Schedule ID (present when schedule exists)
  isEnabled?: boolean; // Whether schedule is active (present when schedule exists)
  
  // Release frequency
  releaseFrequency: ReleaseFrequency;
  
  // First release date (kickoff date)
  firstReleaseKickoffDate: string; // ISO date string
  
  // Platform-specific initial release versions (only for configured platforms)
  // Array format supports multiple targets per platform (e.g., ANDROID + PLAY_STORE and ANDROID + WEB)
  initialVersions: InitialVersion[]; // [{ platform, target, version }]
  
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

/**
 * Initial Version format (matches backend API contract)
 * Array format supports multiple targets per platform (e.g., ANDROID + PLAY_STORE and ANDROID + WEB)
 */
export interface InitialVersion {
  platform: Platform;
  target: TargetPlatform;
  version: string;
}

// ============================================================================
// Jira Project Configuration
// ============================================================================

/**
 * Platform-specific JIRA configuration (matches backend API contract)
 * Parameters are nested to match backend structure
 */
export interface ProjectManagementPlatformConfig {
  platform: Platform; // Platform identifier (ANDROID | IOS | WEB)
  parameters: Record<string, unknown>; // Matches backend format - nested parameters object
}

/**
 * Project Management Configuration (matches backend API contract)
 * Flattened structure aligns with backend API contract and eliminates transformation overhead.
 */
export interface ProjectManagementConfig {
  enabled: boolean;
  integrationId: string; // Required (matches backend)
  id?: string; // For updates
  
  // Platform-specific configurations
  platformConfigurations: ProjectManagementPlatformConfig[]; // One config per platform
  
  // Global settings (UI-only, not sent to backend)
  createReleaseTicket?: boolean; // Auto-create release tickets
  linkBuildsToIssues?: boolean; // Link build info to Jira issues
}

// Type aliases for convenience (used throughout codebase)
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
 * Communication Config (matches backend format)
 * Flattened structure aligns with backend API contract and eliminates transformation overhead.
 */
export interface CommunicationConfig {
  id?: string; // For updates
  integrationId: string; // Required (matches backend)
  channelData: SlackChannelConfig; // Keep type for safety
  enabled?: boolean; // UI-only flag for toggle
  // Future: Add email, teams, etc. as separate optional fields
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
  releaseType: 'MINOR' | 'HOTFIX' | 'MAJOR'; // Match backend enum
  isDefault: boolean;
  
  // Default base branch (from SCM integration)
  baseBranch?: string; // e.g., 'main', 'develop', 'master'
  
  // Platform-target combinations (matches backend contract)
  platformTargets: Array<{ platform: Platform; target: TargetPlatform }>;
  
  // Build upload method
  hasManualBuildUpload: boolean; // true = manual upload, false = CI/CD
  
  // CI/CD Configuration (matches backend contract: ciConfig: { id?, workflowIds?: [...], workflows: [...] })
  ciConfig?: {
    id?: string; // CI config ID (for updates)
    workflowIds?: string[]; // Workflow IDs from backend GET response
    workflows: Workflow[]; // CI/CD pipelines (populated from workflowIds, optional, only used when hasManualBuildUpload = false)
  };
  
  // Test management (field name matches backend POST/GET - with Config suffix)
  testManagementConfig: TestManagementConfig;
  
  // Project management / JIRA (field name matches backend POST/GET - with Config suffix)
  projectManagementConfig: ProjectManagementConfig;

  // Scheduling (Optional - for release train automation)
  releaseSchedule?: SchedulingConfig;

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

