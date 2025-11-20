/**
 * Release Configuration Types
 * Complete type definitions for the release configuration system
 */

// ============================================================================
// Build Pipeline Configuration
// ============================================================================

export type BuildProvider = 'JENKINS' | 'GITHUB_ACTIONS' | 'MANUAL_UPLOAD';

export type BuildEnvironment = 'PRE_REGRESSION' | 'REGRESSION' | 'TESTFLIGHT' | 'PRODUCTION';

export type Platform = 'ANDROID' | 'IOS';

export type TargetPlatform = 'WEB' | 'PLAY_STORE' | 'APP_STORE';

export interface BuildPipelineJob {
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

export interface JenkinsConfig {
  type: 'JENKINS';
  integrationId: string; // Reference to connected Jenkins integration
  jobUrl: string;
  jobName: string;
  parameters: Record<string, string>; // Key-value pairs for job parameters
}

export interface GitHubActionsConfig {
  type: 'GITHUB_ACTIONS';
  integrationId: string; // Reference to connected GitHub integration
  workflowId: string;
  workflowPath: string; // e.g., ".github/workflows/build.yml"
  branch: string;
  inputs: Record<string, string>; // Workflow inputs
}

export interface ManualUploadConfig {
  type: 'MANUAL_UPLOAD';
  instructions?: string; // Optional instructions for manual upload
}

// ============================================================================
// Test Management Configuration
// ============================================================================

export type TestManagementProvider = 'CHECKMATE' | 'TESTRAIL' | 'ZEPHYR' | 'NONE';

export interface TestManagementConfig {
  enabled: boolean;
  provider: TestManagementProvider;
  integrationId?: string; // Reference to connected integration
  projectId?: string;
  
  // Provider-specific settings
  providerSettings?: CheckmateSettings | TestRailSettings;
}

export interface CheckmateRules {
  maxFailedTests: number; // e.g., 0 means no failed tests allowed
  maxUntestedCases: number; // e.g., 0 means all cases must be tested
  requireAllPlatforms: boolean; // All selected platforms must pass
  allowOverride: boolean; // Can users override and proceed despite failed rules
}

export interface CheckmateSettings {
  type: 'CHECKMATE';
  workspaceId: string;
  projectId: string;
  autoCreateRuns: boolean;
  runNameTemplate?: string; // e.g., "v{{version}} - {{platform}} - {{date}}"
  rules: CheckmateRules; // Validation rules for test runs
}

export interface TestRailSettings {
  type: 'TESTRAIL';
  projectId: string;
  suiteId: string;
  autoCreateRuns: boolean;
}

// ============================================================================
// Scheduling Configuration
// ============================================================================

export interface SchedulingConfig {
  // Release frequency
  releaseFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  customFrequencyDays?: number; // For CUSTOM frequency
  
  // Default timings
  defaultReleaseTime: string; // HH:MM format (24-hour)
  defaultKickoffTime: string; // HH:MM format
  kickoffLeadDays: number; // Days before release
  
  // Kickoff reminder
  kickoffReminderEnabled: boolean;
  kickoffReminderTime: string; // HH:MM format
  kickoffReminderLeadDays: number;
  
  // Working days (0 = Sunday, 6 = Saturday)
  workingDays: number[]; // e.g., [1, 2, 3, 4, 5] for Mon-Fri
  timezone: string; // e.g., "Asia/Kolkata", "America/New_York"
  
  // Regression slots
  regressionSlots: RegressionSlot[];
}

export interface RegressionSlot {
  id: string;
  name: string; // e.g., "Slot 1", "Evening Regression"
  offsetDays: number; // Days offset from kickoff
  time: string; // HH:MM format
  
  // What happens in this slot
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

export interface JiraProjectConfig {
  enabled: boolean;
  integrationId: string;
  projectKey: string; // e.g., "PROJ", "APP" 
  projectId?: string;
  issueTypeForRelease?: string; // Issue type ID for release tickets
  createReleaseTicket?: boolean; // Auto-create release tickets
  linkBuildsToIssues?: boolean; // Link build info to Jira issues
}

// ============================================================================
// Communication Configuration
// ============================================================================

export interface CommunicationConfig {
  slack?: {
    enabled: boolean;
    integrationId: string;
    channels: {
      releases: string; // Channel ID
      builds: string;
      regression: string;
      critical: string;
    };
  };
  
  email?: {
    enabled: boolean;
    notificationEmails: string[];
  };
}

// ============================================================================
// Complete Release Configuration
// ============================================================================

export interface ReleaseConfiguration {
  id: string; // Config ID
  organizationId: string;
  
  // Configuration metadata
  name: string; // e.g., "Standard Release Configuration", "Hotfix Configuration"
  description?: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'EMERGENCY';
  isDefault: boolean;
  
  // Default base branch (from SCM integration)
  baseBranch?: string; // e.g., 'main', 'develop', 'master'
  
  // Default target platforms
  defaultTargets: TargetPlatform[];
  
  // Build pipelines
  buildPipelines: BuildPipelineJob[];
  
  // Test management
  testManagement: TestManagementConfig;
  
  // Jira project management
  jiraProject: JiraProjectConfig;
  
  // Scheduling
  scheduling: SchedulingConfig;
  
  // Communication
  communication: CommunicationConfig;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
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

