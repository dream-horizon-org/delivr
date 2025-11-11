/**
 * Types for Setup Wizard components
 */

export type SetupStep = 
  | 'github'
  | 'targets'
  | 'platform-credentials'
  | 'cicd'
  | 'slack'
  | 'review';

export interface WizardStepConfig {
  id: SetupStep;
  title: string;
  description: string;
  isRequired: boolean;
  isComplete: boolean;
  canSkip: boolean;
}

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

