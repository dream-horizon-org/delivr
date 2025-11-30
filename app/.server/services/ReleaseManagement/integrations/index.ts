// SCM Integrations
export { SCMIntegrationService } from './scm-integration';

// Communication Integrations
export { SlackIntegrationService } from './slack-integration';

// CI/CD Integrations
export { JenkinsIntegrationService } from './jenkins-integration';
export { githubActionsIntegrationService as GitHubActionsIntegrationService } from './github-actions-integration';
export { CICDIntegrationService } from './cicd-integration';
export type {
  CICDProviderType,
  WorkflowType,
  PlatformType,
  JobParameter,
  CICDWorkflow,
  WorkflowFilters,
  CreateWorkflowRequest,
  WorkflowListResponse,
  JobParametersResponse,
  WorkflowResponse
} from './cicd-integration';

// Test Management Integrations
export { CheckmateIntegrationService } from './checkmate-integration';
export type { 
  CheckmateIntegration, 
  CheckmateConfig, 
  CheckmateIntegrationResponse,
  CheckmateVerifyResponse,
  VerifyCheckmateCredentialsRequest
} from './checkmate-integration';

// Project Management Integrations
export { ProjectManagementIntegrationService } from './project-management-integration-service';
export type {
  ProjectManagementProviderType,
  PMIntegration,
  PMIntegrationConfig,
  CreatePMIntegrationRequest,
  UpdatePMIntegrationRequest,
  VerifyPMRequest,
  PMIntegrationResponse,
  PMVerifyResponse,
  PMListResponse,
} from './project-management-integration-service';
export { ProjectManagementConfigService } from './project-management-config-service';

// App Distribution Integrations
export { AppDistributionService } from './app-distribution-integration';