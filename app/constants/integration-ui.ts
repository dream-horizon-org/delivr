/**
 * Integration UI Constants
 * Centralized labels, messages, and text for integration components
 */

// ============================================================================
// Integration Card Labels
// ============================================================================

export const INTEGRATION_CARD_LABELS = {
  COMING_SOON: 'Coming Soon',
  CONNECT: 'Connect',
  PREMIUM: 'Premium',
  
  // Config Field Labels
  REPOSITORY: 'Repository',
  WORKSPACE: 'Workspace',
  CONNECTED_CHANNELS: 'Connected Channels',
  URL: 'URL',
  ACCOUNT: 'Account',
  CONFIGURATION: 'Configuration',
  HOST: 'Host',
  APP_ID: 'App ID',
  PLATFORMS: 'Platforms',
  STORE: 'Store',
  TEAM: 'Team',
  TEAM_NAME: 'Team Name',
  DEFAULT_LOCALE: 'Default Locale',
  
  // Store Types
  PLAY_STORE: 'Play Store',
  APP_STORE: 'App Store',
  
  // Pluralization
  CHANNEL: 'channel',
  CHANNELS: 'channels',
} as const;

// ============================================================================
// Integration Modal Labels
// ============================================================================

export const INTEGRATION_MODAL_LABELS = {
  EDIT: 'Edit',
  CONNECT: 'Connect',
  UPDATE: 'Update',
  DISCONNECT: 'Disconnect',
  CANCEL: 'Cancel',
  BACK: 'Back',
  VERIFY: 'Verify',
  SAVE: 'Save',
  CONTINUE: 'Continue',
  CLOSE: 'Close',
  
  // Demo Mode
  DEMO_MODE_TITLE: 'Demo Mode',
  DEMO_MODE_MESSAGE: (integrationName: string) => 
    `This is a placeholder for the ${integrationName} connection flow. The actual implementation will be added soon.`,
  CONNECT_DEMO: 'Connect (Demo)',
  
  // Planned Features
  PLANNED_FEATURES_TITLE: 'Planned Features:',
  PLANNED_FEATURES: [
    'Secure OAuth authentication',
    'Easy configuration setup',
    'Real-time synchronization',
    'Comprehensive integration options',
  ] as const,
} as const;

// ============================================================================
// Slack Connection Flow
// ============================================================================

export const SLACK_LABELS = {
  // Alert Titles
  READY_TO_CONNECT: 'Ready to Connect',
  TOKEN_VERIFIED: '✓ Token Verified Successfully',
  
  // Messages
  CONNECTION_DESCRIPTION: 'Connect your Slack workspace to receive release notifications and updates.',
  
  // Form Labels
  BOT_TOKEN_LABEL: 'Slack Bot Token',
  BOT_TOKEN_PLACEHOLDER: 'xoxb-...',
  BOT_TOKEN_DESCRIPTION: "Enter your Slack bot token (starts with 'xoxb-')",
  
  // Instructions
  HOW_TO_GET_TOKEN: 'How to get your Bot Token:',
  INSTRUCTIONS: [
    { text: 'Go to ', link: 'https://api.slack.com/apps', linkText: 'api.slack.com/apps' },
    'Create or select your app',
    'Go to "OAuth & Permissions"',
    'Add scopes: channels:read, chat:write',
    'Install app to workspace',
    'Copy the "Bot User OAuth Token"',
  ] as const,
  
  // Success Info
  WORKSPACE_LABEL: 'Workspace:',
  BOT_ID_LABEL: 'Bot ID:',
  TOKEN_VERIFIED_MESSAGE: 'Your Slack bot token has been verified. Click "Connect" below to save the integration.',
  
  // Channel Config
  CHANNEL_CONFIG_TITLE: '📢 Channel Configuration',
  CHANNEL_CONFIG_MESSAGE: 'Channel selection will be done later in Release Configuration when you set up your release workflow.',
  
  // Buttons
  VERIFY_TOKEN: 'Verify Token',
  CONNECT_SLACK: 'Connect Slack',
} as const;

// ============================================================================
// Integration ID Constants (for UI routing/matching)
// ============================================================================

export const INTEGRATION_IDS = {
  SLACK: 'slack',
  JENKINS: 'jenkins',
  GITHUB_ACTIONS: 'github_actions',
  CHECKMATE: 'checkmate',
  JIRA: 'jira',
  GITHUB: 'github',
  PLAY_STORE: 'play_store',
  APP_STORE: 'app_store',
  PLAYSTORE: 'playstore', // Alias
  APPSTORE: 'appstore', // Alias
  TESTFLIGHT: 'testflight',
} as const;

// ============================================================================
// Connection Flow Steps
// ============================================================================

export const CONNECTION_STEPS = {
  // Slack
  SLACK_TOKEN: 'token',
  SLACK_CHANNELS: 'channels',
  
  // Generic
  CREDENTIALS: 'credentials',
  VERIFICATION: 'verification',
  CONFIGURATION: 'configuration',
} as const;

// ============================================================================
// Slack Required Scopes
// ============================================================================

export const SLACK_REQUIRED_SCOPES = [
  'channels:read',
  'chat:write',
] as const;

// ============================================================================
// GitHub Connection Flow
// ============================================================================

export const GITHUB_LABELS = {
  READY_TO_CONNECT: 'Ready to Connect',
  CONNECTION_DESCRIPTION: 'Connect your GitHub repository to manage releases, trigger workflows, and automate deployments.',
  
  // Form Labels
  REPO_URL_LABEL: 'Repository URL',
  REPO_URL_PLACEHOLDER: 'https://github.com/owner/repo',
  REPO_URL_DESCRIPTION: 'Enter your GitHub repository URL',
  ACCESS_TOKEN_LABEL: 'Personal Access Token',
  ACCESS_TOKEN_PLACEHOLDER: 'ghp_...',
  ACCESS_TOKEN_DESCRIPTION: 'Enter your GitHub personal access token',
  
  // Instructions
  HOW_TO_GET_TOKEN: 'How to create a Personal Access Token:',
  INSTRUCTIONS: [
    'Go to GitHub Settings → Developer Settings → Personal Access Tokens',
    'Click "Generate new token (classic)"',
    'Select scopes: repo, workflow, read:org',
    'Generate and copy the token',
  ] as const,
  
  // Success
  REPO_VERIFIED: '✓ Repository Verified',
  VERIFY_BUTTON: 'Verify Repository',
  CONNECT_BUTTON: 'Connect GitHub',
} as const;

// ============================================================================
// Jenkins Connection Flow
// ============================================================================

export const JENKINS_LABELS = {
  JENKINS_DETAILS: 'Jenkins Details',
  SERVER_URL_LABEL: 'Jenkins Server URL',
  SERVER_URL_PLACEHOLDER: 'https://jenkins.example.com',
  USERNAME_LABEL: 'Username',
  USERNAME_PLACEHOLDER: 'jenkins-user',
  API_TOKEN_LABEL: 'API Token',
  API_TOKEN_PLACEHOLDER: 'Enter your Jenkins API token',
  
  HOW_TO_GET_TOKEN: 'How to get your API Token:',
  INSTRUCTIONS: [
    'Log in to Jenkins',
    'Click your name (top right) → Configure',
    'API Token section → Add new Token',
    'Copy the generated token',
  ] as const,
  
  VERIFY_CONNECTION: 'Verify Connection',
  CONNECT_JENKINS: 'Connect Jenkins',
} as const;

// ============================================================================
// JIRA Connection Flow
// ============================================================================

export const JIRA_LABELS = {
  JIRA_DETAILS: 'JIRA Details',
  DISPLAY_NAME_LABEL: 'Display Name (Optional)',
  DISPLAY_NAME_PLACEHOLDER: 'My Jira Workspace',
  JIRA_TYPE_LABEL: 'Jira Type',
  JIRA_TYPE_DESCRIPTION: 'Select your Jira deployment type',
  BASE_URL_LABEL: 'Jira Base URL',
  BASE_URL_PLACEHOLDER_CLOUD: 'https://yourcompany.atlassian.net',
  BASE_URL_PLACEHOLDER_SERVER: 'https://jira.yourcompany.com',
  CLOUD_URL_DESCRIPTION: 'Your Atlassian Cloud URL',
  SERVER_URL_DESCRIPTION: 'Your self-hosted Jira URL',
  EMAIL_LABEL: 'Email Address',
  EMAIL_PLACEHOLDER: 'your-email@company.com',
  EMAIL_DESCRIPTION: 'Your Jira account email address',
  API_TOKEN_LABEL: 'API Token',
  API_TOKEN_PLACEHOLDER: 'Your Jira API token',
  API_TOKEN_DESCRIPTION: 'Generate from Jira → Account Settings → Security → API Tokens',
  
  VERIFIED_MESSAGE: 'Credentials verified successfully! Click "Connect" to save.',
  VERIFY_CREDENTIALS: 'Verify Credentials',
  CONNECT_JIRA: 'Connect',
  FOR_CLOUD: 'For Jira Cloud:',
  ATLASSIAN_SETTINGS: 'Atlassian Account Settings',
  
  // Legacy (kept for backward compatibility)
  SITE_URL_LABEL: 'JIRA Site URL',
  SITE_URL_PLACEHOLDER: 'https://your-domain.atlassian.net',
  
  HOW_TO_GET_TOKEN: 'How to create an API Token:',
  INSTRUCTIONS: [
    'Go to Atlassian Account Settings',
    'Security → Create and manage API tokens',
    'Create API token',
    'Copy the token (shown only once)',
  ] as const,
  
  VERIFY_CONNECTION: 'Verify Connection',
} as const;

// ============================================================================
// GitHub Actions Connection Flow
// ============================================================================

export const GITHUB_ACTIONS_LABELS = {
  GITHUB_ACTIONS_DETAILS: 'GitHub Actions Details',
  DISPLAY_NAME_LABEL: 'Display Name (Optional)',
  DISPLAY_NAME_PLACEHOLDER: 'GitHub Actions',
  DISPLAY_NAME_DESCRIPTION: 'A friendly name for this integration',
  API_URL_LABEL: 'GitHub API URL (Optional)',
  API_URL_PLACEHOLDER: 'https://api.github.com',
  API_URL_DESCRIPTION: 'For GitHub Enterprise, use your custom API endpoint (e.g., https://github.company.com/api/v3)',
  PAT_LABEL: 'Personal Access Token (Optional)',
  PAT_LABEL_EDIT: 'Personal Access Token (leave blank to keep existing)',
  PAT_PLACEHOLDER: 'ghp_xxxxxxxxxxxxxxxxxxxx',
  PAT_PLACEHOLDER_EDIT: 'Leave blank to keep existing token',
  PAT_DESCRIPTION: 'Leave empty to use your connected GitHub SCM token',
  PAT_DESCRIPTION_EDIT: 'Only provide if you want to update the token',
  
  TIP_TITLE: 'Tip:',
  TIP_MESSAGE: 'If you have GitHub SCM integration connected, you can leave the token field empty and we\'ll use your existing GitHub token.',
  VERIFIED_MESSAGE: 'Credentials verified successfully! Click "Connect" to save.',
  VERIFY_CONNECTION: 'Verify Connection',
  CONNECT_GITHUB_ACTIONS: 'Connect',
  
  REQUIRED_SCOPES_TITLE: 'Required token scopes:',
  REQUIRED_SCOPES: ['repo', 'workflow', 'read:org'] as const,
  GENERATE_TOKEN_LINK: 'Generate a new Personal Access Token',
  GENERATE_TOKEN_URL: 'https://github.com/settings/tokens/new',
} as const;

// ============================================================================
// Checkmate Connection Flow
// ============================================================================

export const CHECKMATE_LABELS = {
  CHECKMATE_CONNECTION: 'Connect Checkmate',
  CHECKMATE_DETAILS: 'Checkmate Details',
  DISPLAY_NAME_LABEL: 'Display Name',
  DISPLAY_NAME_PLACEHOLDER: 'My Checkmate Instance',
  BASE_URL_LABEL: 'Base URL',
  BASE_URL_PLACEHOLDER: 'https://checkmate.example.com',
  BASE_URL_DESCRIPTION: 'Your Checkmate base URL (e.g., https://checkmate.yourcompany.com)',
  ORG_ID_LABEL: 'Organization ID',
  ORG_ID_PLACEHOLDER: '123',
  ORG_ID_DESCRIPTION: 'Your Checkmate organization/workspace ID (numeric)',
  AUTH_TOKEN_LABEL: 'Auth Token',
  AUTH_TOKEN_PLACEHOLDER: 'Your Checkmate auth token',
  AUTH_TOKEN_DESCRIPTION: 'Generate this from your Checkmate account settings',
  
  EDIT_DESCRIPTION: 'Update your Checkmate test management connection details.',
  CONNECT_DESCRIPTION: 'Connect your Checkmate test management system to track test runs and regression status.',
  VERIFY_SUCCESS_MESSAGE: 'Checkmate connection verified successfully!',
  VERIFY_CONNECTION: 'Verify Connection',
  CONNECT_CHECKMATE: 'Connect',
  
  NOTE_TITLE: 'Note:',
  NOTE_MESSAGE: 'Checkmate integration enables test run tracking, squad-based regression status, and automated testing workflows.',
  
  // Legacy
  API_URL_LABEL: 'API Base URL',
  API_URL_PLACEHOLDER: 'https://api.checkmate.io',
  API_KEY_LABEL: 'API Key',
  API_KEY_PLACEHOLDER: 'Enter your Checkmate API key',
  WORKSPACE_LABEL: 'Workspace ID',
  WORKSPACE_PLACEHOLDER: 'Enter workspace ID',
} as const;

// ============================================================================
// App Distribution Connection Flow
// ============================================================================

export const APP_DISTRIBUTION_LABELS = {
  // Play Store
  PLAY_STORE_TITLE: 'Google Play Store Configuration',
  PLAY_STORE_DESCRIPTION: 'Connect your Google Play Console to automate app distribution',
  SERVICE_ACCOUNT_LABEL: 'Service Account JSON',
  SERVICE_ACCOUNT_DESCRIPTION: 'Upload your Google Cloud service account JSON key',
  PACKAGE_NAME_LABEL: 'Package Name',
  PACKAGE_NAME_PLACEHOLDER: 'com.example.app',
  
  // App Store
  APP_STORE_TITLE: 'Apple App Store Configuration',
  APP_STORE_DESCRIPTION: 'Connect your App Store Connect account to automate app distribution',
  ISSUER_ID_LABEL: 'Issuer ID',
  ISSUER_ID_PLACEHOLDER: 'Enter your App Store Connect Issuer ID',
  KEY_ID_LABEL: 'Key ID',
  KEY_ID_PLACEHOLDER: 'Enter your API Key ID',
  PRIVATE_KEY_LABEL: 'Private Key',
  PRIVATE_KEY_PLACEHOLDER: 'Enter your .p8 private key',
  BUNDLE_ID_LABEL: 'Bundle ID',
  BUNDLE_ID_PLACEHOLDER: 'com.example.app',
  
  // Common
  VERIFY_CREDENTIALS: 'Verify Credentials',
  CONNECT: 'Connect',
} as const;

// ============================================================================
// Common Alert Messages
// ============================================================================

export const ALERT_MESSAGES = {
  VERIFICATION_SUCCESS: '✓ Verification Successful',
  VERIFICATION_FAILED: '✗ Verification Failed',
  CONNECTION_FAILED: '✗ Connection Failed',
  CONNECTING: 'Connecting...',
  VERIFYING: 'Verifying...',
} as const;

// ============================================================================
// Icon Sizes
// ============================================================================

export const INTEGRATION_ICON_SIZES = {
  SMALL: 24,
  MEDIUM: 32,
  LARGE: 40,
  EXTRA_LARGE: 48,
} as const;

// ============================================================================
// Debug/Console Labels
// ============================================================================

export const DEBUG_LABELS = {
  // Integration Modal
  MODAL_PREFIX: '[IntegrationConnectModal]',
  MODAL_INTEGRATION_DETAILS: 'Integration:',
  MODAL_MATCHING_ID: 'Matching against integration.id:',
  MODAL_FALLBACK: 'FALLBACK: Rendering demo mode for:',
  MODAL_NORMALIZED: '(normalized:',
  
  // App Distribution
  APP_DIST_PREFIX: '[AppDistribution]',
  APP_DIST_NO_PLATFORMS: 'No platforms provided from system metadata',
  
  // Integration Card
  CARD_PREFIX: '[IntegrationCard]',
  
  // Connection Flows
  CONNECTION_PREFIX: '[Connection]',
  
  // Generic
  FAILED_TO_FETCH: 'Failed to fetch data:',
  VERIFICATION_ERROR: 'Verification failed:',
  CONNECTION_ERROR: 'Connection error:',
} as const;

