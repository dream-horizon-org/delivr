/**
 * TypeScript type definitions for Setup Wizard
 */

export interface GitHubConnection {
  scmType: 'GITHUB' | 'GITLAB' | 'BITBUCKET';
  owner: string;
  repoName: string;
  token: string;
  repoUrl?: string;
  isVerified: boolean;
}

export interface TargetPlatforms {
  ios: boolean;
  android: boolean;
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
  type: 'GITHUB_ACTIONS' | 'JENKINS';
  platform: 'IOS' | 'ANDROID';
  environment: 'REGRESSION' | 'TESTFLIGHT' | 'PRODUCTION';
  name: string;
  isVerified: boolean;
  createdAt: string;
  // GitHub Actions specific
  workflowFile?: string;
  workflowInputs?: Record<string, any>;
  // Jenkins specific
  jobName?: string;
  jobUrl?: string;
  parameters?: Record<string, any>;
}

export interface SetupWizardData {
  github?: GitHubConnection;
  targets?: TargetPlatforms;
  appStoreConnect?: AppStoreCredentials;
  playStoreConnect?: PlayStoreCredentials;
  cicdPipelines?: CICDPipeline[];
}




