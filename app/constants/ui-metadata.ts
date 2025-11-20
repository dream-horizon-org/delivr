/**
 * UI Metadata Constants
 * All UI-related metadata (icons, colors, descriptions) stored in frontend
 * Backend only returns IDs and functional data
 */

// ============================================================================
// Integration UI Metadata
// ============================================================================

export const INTEGRATION_UI_METADATA: Record<string, {
  description: string;
  icon: string;
  comingSoon?: boolean;
}> = {
  // SOURCE_CONTROL
  github: {
    description: 'Connect your GitHub repository to manage releases, trigger workflows, and automate deployments',
    icon: '🐙',
  },
  gitlab: {
    description: 'Integrate with GitLab for CI/CD pipelines and release management',
    icon: '🦊',
    comingSoon: true,
  },
  bitbucket: {
    description: 'Connect Bitbucket repositories for code management and deployments',
    icon: '🪣',
    comingSoon: true,
  },
  'azure-repos': {
    description: 'Integrate with Azure Repos for version control',
    icon: '☁️',
    comingSoon: true,
  },
  
  // COMMUNICATION
  slack: {
    description: 'Send release notifications and updates to your Slack workspace',
    icon: '💬',
  },
  teams: {
    description: 'Integrate with Microsoft Teams for notifications',
    icon: '💼',
    comingSoon: true,
  },
  discord: {
    description: 'Send notifications to Discord channels',
    icon: '💬',
    comingSoon: true,
  },
  
  // CI_CD
  jenkins: {
    description: 'Trigger Jenkins builds and track deployment pipelines',
    icon: '🔨',
  },
  'github-actions': {
    description: 'Trigger GitHub Actions workflows and automate your CI/CD pipeline',
    icon: '⚡',
  },
  'gitlab-ci': {
    description: 'Integrate with GitLab CI/CD pipelines',
    icon: '🦊',
    comingSoon: true,
  },
  
  // TEST_MANAGEMENT
  checkmate: {
    description: 'Manage test cases, track test runs, and integrate QA workflows',
    icon: '✅',
  },
  testrail: {
    description: 'TestRail test management integration',
    icon: '📊',
    comingSoon: true,
  },
  zephyr: {
    description: 'Zephyr test management integration',
    icon: '⚡',
    comingSoon: true,
  },
  
  // PROJECT_MANAGEMENT
  jira: {
    description: 'Link releases to Jira issues and track project progress',
    icon: '📋',
  },
  linear: {
    description: 'Integrate with Linear for project management',
    icon: '📐',
    comingSoon: true,
  },
  asana: {
    description: 'Integrate with Asana for work management',
    icon: '✓',
    comingSoon: true,
  },
  
  // APP_DISTRIBUTION
  appstore: {
    description: 'Deploy iOS apps to TestFlight and the App Store',
    icon: '🍎',
    comingSoon: true,
  },
  playstore: {
    description: 'Publish Android apps to Google Play Console',
    icon: '🤖',
    comingSoon: true,
  },
  firebase: {
    description: 'Distribute app builds to testers via Firebase App Distribution',
    icon: '🔥',
    comingSoon: true,
  },
};

// ============================================================================
// Platform UI Metadata
// ============================================================================

export const PLATFORM_UI_METADATA: Record<string, {
  description: string;
  icon: string;
  color: string;
}> = {
  ANDROID: {
    description: 'Build and distribute for Android devices',
    icon: '🤖',
    color: '#3DDC84',
  },
  IOS: {
    description: 'Build and distribute for iOS devices',
    icon: '🍎',
    color: '#000000',
  },
  WEB: {
    description: 'Web application platform',
    icon: '🌐',
    color: '#4A90E2',
  },
  FLUTTER: {
    description: 'Flutter cross-platform framework',
    icon: '🦋',
    color: '#02569B',
  },
};

// ============================================================================
// Target UI Metadata
// ============================================================================

export const TARGET_UI_METADATA: Record<string, {
  description: string;
  icon: string;
  requiresCredentials: boolean;
}> = {
  APP_STORE: {
    description: 'Distribute to Apple App Store',
    icon: '🍎',
    requiresCredentials: true,
  },
  PLAY_STORE: {
    description: 'Distribute to Google Play Store',
    icon: '🤖',
    requiresCredentials: true,
  },
  WEB: {
    description: 'Deploy to web hosting',
    icon: '🌐',
    requiresCredentials: false,
  },
  TESTFLIGHT: {
    description: 'Internal testing via TestFlight',
    icon: '✈️',
    requiresCredentials: true,
  },
};

// ============================================================================
// Release Type UI Metadata
// ============================================================================

export const RELEASE_TYPE_UI_METADATA: Record<string, {
  description: string;
  icon: string;
  color: string;
  defaultScheduling: {
    kickoffLeadDays: number;
    releaseFrequency: string;
  };
}> = {
  PLANNED: {
    description: 'Regular scheduled release',
    icon: '📅',
    color: 'blue',
    defaultScheduling: {
      kickoffLeadDays: 2,
      releaseFrequency: 'BIWEEKLY',
    },
  },
  HOTFIX: {
    description: 'Urgent bug fix release',
    icon: '🔥',
    color: 'orange',
    defaultScheduling: {
      kickoffLeadDays: 0,
      releaseFrequency: 'CUSTOM',
    },
  },
  EMERGENCY: {
    description: 'Critical production issue',
    icon: '🚨',
    color: 'red',
    defaultScheduling: {
      kickoffLeadDays: 0,
      releaseFrequency: 'CUSTOM',
    },
  },
  PATCH: {
    description: 'Minor patch release',
    icon: '🩹',
    color: 'green',
    defaultScheduling: {
      kickoffLeadDays: 1,
      releaseFrequency: 'CUSTOM',
    },
  },
};

// ============================================================================
// Release Stage UI Metadata
// ============================================================================

export const RELEASE_STAGE_UI_METADATA: Record<string, {
  description: string;
  icon: string;
  color: string;
  allowedActions: string[];
}> = {
  PRE_KICKOFF: {
    description: 'Before branch fork-off',
    icon: '📋',
    color: 'gray',
    allowedActions: ['SCHEDULE', 'PLAN'],
  },
  KICKOFF: {
    description: 'Branch fork-off and initial setup',
    icon: '🚀',
    color: 'blue',
    allowedActions: ['FORK_BRANCH', 'SETUP_PIPELINES'],
  },
  REGRESSION: {
    description: 'Build and test phase',
    icon: '🧪',
    color: 'yellow',
    allowedActions: ['TRIGGER_BUILDS', 'RUN_TESTS', 'CHERRY_PICK'],
  },
  READY_FOR_RELEASE: {
    description: 'Builds approved, ready to release',
    icon: '✅',
    color: 'green',
    allowedActions: ['APPROVE', 'SUBMIT_BUILDS'],
  },
  RELEASED: {
    description: 'Live to production',
    icon: '🎉',
    color: 'green',
    allowedActions: ['MONITOR', 'ROLLBACK'],
  },
};

// ============================================================================
// Release Status UI Metadata
// ============================================================================

export const RELEASE_STATUS_UI_METADATA: Record<string, {
  description: string;
  color: string;
  isInitial?: boolean;
  isFinal?: boolean;
}> = {
  KICKOFF_PENDING: {
    description: 'Scheduled, waiting for kickoff time',
    color: 'gray',
    isInitial: true,
  },
  PENDING: {
    description: 'Release pending action',
    color: 'gray',
  },
  STARTED: {
    description: 'Release started, branch forked',
    color: 'blue',
  },
  REGRESSION_IN_PROGRESS: {
    description: 'Building and testing',
    color: 'yellow',
  },
  BUILD_SUBMITTED: {
    description: 'Builds submitted to stores',
    color: 'green',
  },
  RELEASED: {
    description: 'Live to users',
    color: 'green',
    isFinal: true,
  },
  CANCELLED: {
    description: 'Release cancelled',
    color: 'red',
    isFinal: true,
  },
  ARCHIVED: {
    description: 'Historical record',
    color: 'gray',
    isFinal: true,
  },
};

// ============================================================================
// Build Environment UI Metadata
// ============================================================================

export const BUILD_ENVIRONMENT_UI_METADATA: Record<string, {
  description: string;
  icon: string;
  isRequired: boolean;
}> = {
  PRE_REGRESSION: {
    description: 'Optional pre-testing build',
    icon: '🔨',
    isRequired: false,
  },
  REGRESSION: {
    description: 'Main testing build',
    icon: '🧪',
    isRequired: true,
  },
  TESTFLIGHT: {
    description: 'TestFlight distribution build',
    icon: '✈️',
    isRequired: true,
  },
  PRODUCTION: {
    description: 'Production build',
    icon: '🚀',
    isRequired: false,
  },
};

// ============================================================================
// Helper Functions to Merge Backend + Frontend Data
// ============================================================================

export function enrichIntegration(backendData: { id: string; name: string; requiresOAuth?: boolean }) {
  const uiMetadata = INTEGRATION_UI_METADATA[backendData.id] || {
    description: backendData.name,
    icon: '🔌',
  };
  
  return {
    ...backendData,
    ...uiMetadata,
  };
}

export function enrichPlatform(backendData: { id: string; name: string; applicableTargets: string[] }) {
  const uiMetadata = PLATFORM_UI_METADATA[backendData.id] || {
    description: backendData.name,
    icon: '📱',
    color: '#000000',
  };
  
  return {
    ...backendData,
    ...uiMetadata,
  };
}

export function enrichTarget(backendData: { id: string; name: string }) {
  const uiMetadata = TARGET_UI_METADATA[backendData.id] || {
    description: backendData.name,
    icon: '🎯',
    requiresCredentials: false,
  };
  
  return {
    ...backendData,
    ...uiMetadata,
  };
}

export function enrichReleaseType(backendData: { id: string; name: string }) {
  const uiMetadata = RELEASE_TYPE_UI_METADATA[backendData.id] || {
    description: backendData.name,
    icon: '📦',
    color: 'gray',
    defaultScheduling: {
      kickoffLeadDays: 2,
      releaseFrequency: 'CUSTOM',
    },
  };
  
  return {
    ...backendData,
    ...uiMetadata,
  };
}

export function enrichReleaseStage(backendData: { id: string; name: string; order: number }) {
  const uiMetadata = RELEASE_STAGE_UI_METADATA[backendData.id] || {
    description: backendData.name,
    icon: '📍',
    color: 'gray',
    allowedActions: [],
  };
  
  return {
    ...backendData,
    ...uiMetadata,
  };
}

export function enrichReleaseStatus(backendData: { id: string; name: string; stage: string | null }) {
  const uiMetadata = RELEASE_STATUS_UI_METADATA[backendData.id] || {
    description: backendData.name,
    color: 'gray',
  };
  
  return {
    ...backendData,
    ...uiMetadata,
  };
}

export function enrichBuildEnvironment(backendData: { 
  id: string; 
  name: string; 
  order: number; 
  applicablePlatforms: string[];
}) {
  const uiMetadata = BUILD_ENVIRONMENT_UI_METADATA[backendData.id] || {
    description: backendData.name,
    icon: '⚙️',
    isRequired: false,
  };
  
  return {
    ...backendData,
    ...uiMetadata,
  };
}

