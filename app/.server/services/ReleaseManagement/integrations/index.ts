// SCM Integrations
export { SCMIntegrationService } from './scm-integration';

// Communication Integrations
export { SlackIntegrationService } from './slack-integration';

// CI/CD Integrations
export { JenkinsIntegrationService } from './jenkins-integration';
export { GitHubActionsIntegrationService } from './github-actions-integration';

// Test Management Integrations
export { CheckmateIntegrationService } from './checkmate-integration';
export type { CheckmateIntegration, CheckmateConfig, CheckmateIntegrationResponse } from './checkmate-integration';

// Project Management Integrations
export { JiraIntegrationService } from './jira-integration';

// App Distribution Integrations
export { AppStoreIntegrationService } from './appstore-integration';
export { PlayStoreIntegrationService } from './playstore-integration';