/**
 * Types for Setup Wizard components
 */

/**
 * Top-level setup buckets
 * Each bucket represents a major category of setup
 */
export type SetupBucket = 
  | 'scm'              // Source Control Management (GitHub, GitLab, etc.)
  | 'distribution'     // Distribution Platforms (App Store, Play Store)
  | 'cicd'             // CI/CD Pipelines (GitHub Actions, Jenkins)
  | 'communication'    // Communication Channels (Slack, Discord, etc.)
  | 'review';          // Final review step

/**
 * Bucket configuration
 * Defines the structure and state of each setup bucket
 */
export interface SetupBucketConfig {
  id: SetupBucket;
  title: string;
  description: string;
  isRequired: boolean;
  isComplete: boolean;
  canSkip: boolean;
  /** Optional icon or visual identifier */
  icon?: string;
  /** Integration type this bucket manages (if applicable) */
  integrationType?: 'scm' | 'targetPlatform' | 'pipeline' | 'communication';
}

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use SetupBucket instead
 */
export type SetupStep = SetupBucket;

/**
 * Legacy interface for backward compatibility
 * @deprecated Use SetupBucketConfig instead
 */
export interface WizardStepConfig extends SetupBucketConfig {}

export interface GitHubConnection {
  scmType?: 'GITHUB' | 'GITLAB' | 'BITBUCKET';
  owner: string;
  repoName: string;
  token: string;
  repoUrl?: string; // Constructed from owner/repoName
  isVerified: boolean;
}

export interface TargetPlatforms {
  appStore: boolean;
  playStore: boolean;
}

export interface AppStoreCredentials {
  keyId: string;
  issuerId: string;
  privateKey: string;
  isVerified: boolean;
}

export interface PlayStoreCredentials {
  projectId: string;
  serviceAccountEmail: string;
  serviceAccountKey: string;
  isVerified: boolean;
}

export interface CICDPipeline {
  id: string;
  name: string;
  type: 'GITHUB_ACTIONS' | 'JENKINS';
  platform: 'IOS' | 'ANDROID';
  environment: 'STAGING' | 'PRODUCTION' | 'AUTOMATION' | 'CUSTOM';
  
  // GitHub Actions
  workflowId?: string;
  workflowPath?: string;
  branch?: string;
  
  // Jenkins
  jenkinsUrl?: string;
  jenkinsToken?: string;
  jenkinsJob?: string;
  
  isVerified: boolean;
  createdAt: string;
}

export interface SlackIntegration {
  botToken: string;
  channels: Array<{
    id: string;
    name: string;
    purpose: 'GENERAL' | 'BUILDS' | 'RELEASES' | 'CRITICAL';
  }>;
  isVerified: boolean;
}

export interface SetupWizardData {
  github?: GitHubConnection;
  targets?: TargetPlatforms;
  appStoreConnect?: AppStoreCredentials;
  playStoreConnect?: PlayStoreCredentials;
  cicdPipelines?: CICDPipeline[];
  slack?: SlackIntegration;
}

