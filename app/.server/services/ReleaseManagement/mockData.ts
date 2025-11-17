// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Mock Data for Release Management
 * Simulates backend API responses
 */

import {
  Release,
  ReleaseType,
  ReleaseStatus,
  UpdateType,
  PlatformName,
  TargetName,
  Build,
  BuildStatus,
  ReleaseTask,
  TaskType,
  TaskStatus,
  CherryPick,
  CherryPickStatus,
  ReleaseAnalytics,
  TenantIntegration,
  IntegrationType,
  ReleaseCycle,
  ReleasePhase
} from './integrations/types';

// ============================================================================
// SAMPLE RELEASES
// ============================================================================

export const mockReleases: Release[] = [
  // Upcoming Releases
  {
    id: 'rel_001',
    tenantId: 'NJEG6wOk7e',
    releaseKey: 'R-2025-03',
    version: '2.1.0',
    type: ReleaseType.PLANNED,
    status: ReleaseStatus.KICKOFF_PENDING,
    updateType: UpdateType.OPTIONAL,
    baseVersion: '1.4.0',
    baseBranch: 'main',
    branchRelease: 'release/1.5.0',
    branchCodepush: 'codepush/1.5.0',
    plannedDate: '2025-02-15T00:00:00Z',
    targetReleaseDate: '2025-02-25T00:00:00Z',
    kickOffReminderDate: '2025-02-10T09:00:00Z',
    isDelayed: false,
    releasePilot: {
      id: 'user_001',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    createdBy: {
      id: 'user_001',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    lastUpdatedBy: {
      id: 'user_002',
      name: 'Jane Smith',
      email: 'jane.smith@example.com'
    },
    releaseTag: 'v1.5.0',
    userAdoption: {
      ios: 45,
      android: 60,
      web: 80
    },
    finalBuildNumbers: {
      ios: '1.5.0.100',
      android: '1.5.0.200',
      web: '1.5.0.300'
    },
    epicIds: {
      ios: 'EPIC-123',
      android: 'EPIC-124',
      web: 'EPIC-125'
    },
    autoPilot: 'RUNNING',
    createdAt: '2025-01-05T10:00:00Z',
    updatedAt: '2025-01-09T14:30:00Z'
  },
  // Active Releases
  {
    id: 'rel_002',
    tenantId: 'NJEG6wOk7e',
    releaseKey: 'R-2025-02',
    version: '2.0.0',
    type: ReleaseType.MAJOR,
    status: ReleaseStatus.REGRESSION_IN_PROGRESS,
    updateType: UpdateType.OPTIONAL,
    baseVersion: '1.9.0',
    baseBranch: 'main',
    branchRelease: 'release/2.0.0',
    plannedDate: '2025-01-15T00:00:00Z',
    targetReleaseDate: '2025-01-30T00:00:00Z',
    isDelayed: false,
    releasePilot: {
      id: 'user_002',
      name: 'Jane Smith',
      email: 'jane.smith@example.com'
    },
    createdBy: {
      id: 'user_001',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    lastUpdatedBy: {
      id: 'user_002',
      name: 'Jane Smith',
      email: 'jane.smith@example.com'
    },
    userAdoption: {
      ios: 0,
      android: 0,
      web: 0
    },
    autoPilot: 'RUNNING',
    createdAt: '2025-01-05T10:00:00Z',
    updatedAt: '2025-01-20T15:00:00Z'
  },
  {
    id: 'rel_003',
    tenantId: 'NJEG6wOk7e',
    releaseKey: 'R-2025-01',
    version: '1.9.0',
    type: ReleaseType.PLANNED,
    status: ReleaseStatus.BUILD_SUBMITTED,
    updateType: UpdateType.OPTIONAL,
    baseVersion: '1.8.0',
    baseBranch: 'main',
    branchRelease: 'release/1.9.0',
    plannedDate: '2025-01-20T00:00:00Z',
    targetReleaseDate: '2025-01-25T00:00:00Z',
    isDelayed: false,
    releasePilot: {
      id: 'user_003',
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com'
    },
    createdBy: {
      id: 'user_003',
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com'
    },
    lastUpdatedBy: {
      id: 'user_003',
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com'
    },
    userAdoption: {
      ios: 0,
      android: 0,
      web: 0
    },
    autoPilot: 'RUNNING',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-21T10:00:00Z'
  },
  // Completed Releases
  {
    id: 'rel_004',
    tenantId: 'NJEG6wOk7e',
    releaseKey: 'R-2024-12',
    version: '1.8.0',
    type: ReleaseType.PLANNED,
    status: ReleaseStatus.RELEASED,
    updateType: UpdateType.OPTIONAL,
    baseVersion: '1.7.0',
    baseBranch: 'main',
    branchRelease: 'release/1.8.0',
    plannedDate: '2024-12-01T00:00:00Z',
    targetReleaseDate: '2024-12-15T00:00:00Z',
    releaseDate: '2024-12-14T15:00:00Z',
    isDelayed: false,
    releasePilot: {
      id: 'user_001',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    createdBy: {
      id: 'user_001',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    lastUpdatedBy: {
      id: 'user_001',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    releaseTag: 'v1.8.0',
    userAdoption: {
      ios: 95,
      android: 92,
      web: 98
    },
    finalBuildNumbers: {
      ios: '1.8.0.100',
      android: '1.8.0.200',
      web: '1.8.0.300'
    },
    autoPilot: 'COMPLETED',
    createdAt: '2024-11-20T10:00:00Z',
    updatedAt: '2024-12-14T15:00:00Z'
  },
  {
    id: 'rel_005',
    tenantId: 'NJEG6wOk7e',
    releaseKey: 'R-2024-11',
    version: '1.7.0',
    type: ReleaseType.PLANNED,
    status: ReleaseStatus.RELEASED,
    updateType: UpdateType.OPTIONAL,
    baseVersion: '1.6.0',
    baseBranch: 'main',
    branchRelease: 'release/1.7.0',
    plannedDate: '2024-11-01T00:00:00Z',
    targetReleaseDate: '2024-11-15T00:00:00Z',
    releaseDate: '2024-11-15T12:00:00Z',
    isDelayed: false,
    releasePilot: {
      id: 'user_002',
      name: 'Jane Smith',
      email: 'jane.smith@example.com'
    },
    createdBy: {
      id: 'user_002',
      name: 'Jane Smith',
      email: 'jane.smith@example.com'
    },
    lastUpdatedBy: {
      id: 'user_002',
      name: 'Jane Smith',
      email: 'jane.smith@example.com'
    },
    releaseTag: 'v1.7.0',
    userAdoption: {
      ios: 88,
      android: 85,
      web: 90
    },
    finalBuildNumbers: {
      ios: '1.7.0.100',
      android: '1.7.0.200',
      web: '1.7.0.300'
    },
    autoPilot: 'COMPLETED',
    createdAt: '2024-10-20T10:00:00Z',
    updatedAt: '2024-11-15T12:00:00Z'
  },
  {
    id: 'rel_006',
    tenantId: 'NJEG6wOk7e',
    releaseKey: 'R-2024-11-H1',
    version: '1.7.1',
    type: ReleaseType.HOTFIX,
    status: ReleaseStatus.RELEASED,
    updateType: UpdateType.FORCE,
    baseVersion: '1.7.0',
    baseBranch: 'release/1.7.0',
    branchRelease: 'hotfix/1.7.1',
    plannedDate: '2024-11-20T00:00:00Z',
    targetReleaseDate: '2024-11-21T00:00:00Z',
    releaseDate: '2024-11-21T10:00:00Z',
    isDelayed: false,
    parentId: 'rel_005',
    releasePilot: {
      id: 'user_003',
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com'
    },
    createdBy: {
      id: 'user_003',
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com'
    },
    lastUpdatedBy: {
      id: 'user_003',
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com'
    },
    releaseTag: 'v1.7.1',
    userAdoption: {
      ios: 75,
      android: 70,
      web: 80
    },
    finalBuildNumbers: {
      ios: '1.7.1.100',
      android: '1.7.1.200',
      web: '1.7.1.300'
    },
    autoPilot: 'COMPLETED',
    createdAt: '2024-11-19T10:00:00Z',
    updatedAt: '2024-11-21T10:00:00Z'
  }
];

// ============================================================================
// SAMPLE BUILDS
// ============================================================================

export const mockBuilds: Build[] = [
  {
    id: 'build_001',
    releaseId: 'rel_001',
    platform: PlatformName.IOS,
    target: TargetName.APP_STORE,
    buildNumber: '1.5.0.100',
    buildLink: 'https://testflight.apple.com/build/12345',
    status: BuildStatus.SUCCESS,
    startedAt: '2025-01-09T10:00:00Z',
    completedAt: '2025-01-09T10:45:00Z',
    createdAt: '2025-01-09T10:00:00Z'
  },
  {
    id: 'build_002',
    releaseId: 'rel_001',
    platform: PlatformName.ANDROID,
    target: TargetName.PLAY_STORE,
    buildNumber: '1.5.0.200',
    buildLink: 'https://play.google.com/console/build/67890',
    status: BuildStatus.IN_PROGRESS,
    startedAt: '2025-01-09T11:00:00Z',
    createdAt: '2025-01-09T11:00:00Z'
  },
  {
    id: 'build_003',
    releaseId: 'rel_001',
    platform: PlatformName.ANDROID,
    target: TargetName.WEB,
    buildNumber: '1.5.0.300',
    status: BuildStatus.SUCCESS,
    startedAt: '2025-01-09T09:00:00Z',
    completedAt: '2025-01-09T09:20:00Z',
    createdAt: '2025-01-09T09:00:00Z'
  }
];

// ============================================================================
// SAMPLE TASKS
// ============================================================================

export const mockTasks: ReleaseTask[] = [
  {
    id: 'task_001',
    releaseId: 'rel_001',
    taskType: TaskType.FORK_BRANCH,
    status: TaskStatus.COMPLETED,
    branch: 'release/1.5.0',
    workflowId: 'wf_123',
    runId: 'run_456',
    conclusion: 'success',
    createdAt: '2025-01-05T10:00:00Z',
    updatedAt: '2025-01-05T10:05:00Z'
  },
  {
    id: 'task_002',
    releaseId: 'rel_001',
    taskType: TaskType.TRIGGER_REGRESSION_BUILDS,
    status: TaskStatus.IN_PROGRESS,
    workflowId: 'wf_124',
    runId: 'run_457',
    assignedTo: {
      id: 'user_002',
      name: 'Jane Smith',
      email: 'jane.smith@example.com'
    },
    createdAt: '2025-01-09T10:00:00Z',
    updatedAt: '2025-01-09T11:00:00Z'
  },
  {
    id: 'task_003',
    releaseId: 'rel_001',
    taskType: TaskType.CREATE_RELEASE_NOTES,
    status: TaskStatus.PENDING,
    assignedTo: {
      id: 'user_001',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    createdAt: '2025-01-09T12:00:00Z',
    updatedAt: '2025-01-09T12:00:00Z'
  }
];

// ============================================================================
// SAMPLE CHERRY PICKS
// ============================================================================

export const mockCherryPicks: CherryPick[] = [
  {
    id: 'cp_001',
    releaseId: 'rel_001',
    commitId: 'abc123def456',
    prLink: 'https://github.com/org/repo/pull/123',
    jiraLink: 'https://jira.example.com/browse/PROJ-456',
    status: CherryPickStatus.APPROVED,
    isApprovalRequired: true,
    author: {
      id: 'user_004',
      name: 'Alice Johnson',
      email: 'alice.johnson@example.com'
    },
    approver: {
      id: 'user_001',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    approvalStatus: 'APPROVED',
    createdAt: '2025-01-07T14:00:00Z',
    updatedAt: '2025-01-07T15:00:00Z'
  },
  {
    id: 'cp_002',
    releaseId: 'rel_001',
    commitId: 'def456ghi789',
    prLink: 'https://github.com/org/repo/pull/124',
    status: CherryPickStatus.PENDING,
    isApprovalRequired: true,
    author: {
      id: 'user_005',
      name: 'Charlie Brown',
      email: 'charlie.brown@example.com'
    },
    approvalStatus: 'REQUESTED',
    createdAt: '2025-01-08T10:00:00Z',
    updatedAt: '2025-01-08T10:00:00Z'
  }
];

// ============================================================================
// SAMPLE ANALYTICS
// ============================================================================

export const mockAnalytics: ReleaseAnalytics = {
  releaseId: 'rel_001',
  totalDuration: 168, // 7 days in hours
  buildTime: 12,
  testTime: 48,
  deploymentTime: 4,
  cherryPickCount: 5,
  tasksCompleted: 8,
  tasksTotal: 12,
  bugCount: 3,
  userAdoptionRate: {
    ios: 45,
    android: 60,
    web: 80
  },
  timeline: {
    kickOff: '2025-01-05T10:00:00Z',
    regressionStart: '2025-01-08T09:00:00Z',
    buildsSubmitted: '2025-01-09T14:00:00Z',
    released: ''
  }
};

// ============================================================================
// SAMPLE INTEGRATIONS
// ============================================================================

export const mockIntegrations: TenantIntegration[] = [
  {
    id: 'int_001',
    tenantId: 'tenant_001',
    integrationType: IntegrationType.GITHUB,
    isEnabled: true,
    isRequired: true,
    config: {
      owner: 'my-org',
      repo: 'mobile-app',
      baseBranch: 'main',
      token: '***encrypted***'
    },
    verificationStatus: 'VALID',
    lastVerifiedAt: '2025-01-09T10:00:00Z',
    configuredBy: {
      id: 'user_001',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-09T10:00:00Z'
  },
  {
    id: 'int_002',
    tenantId: 'tenant_001',
    integrationType: IntegrationType.SLACK,
    isEnabled: true,
    isRequired: true,
    config: {
      botToken: '***encrypted***',
      channels: {
        general: 'C01234567',
        releases: 'C07654321'
      }
    },
    verificationStatus: 'VALID',
    lastVerifiedAt: '2025-01-09T10:00:00Z',
    configuredBy: {
      id: 'user_001',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-09T10:00:00Z'
  },
  {
    id: 'int_003',
    tenantId: 'tenant_001',
    integrationType: IntegrationType.JENKINS,
    isEnabled: true,
    isRequired: false,
    config: {
      url: 'https://jenkins.example.com',
      username: 'api-user',
      apiToken: '***encrypted***',
      jobs: {
        android: 'Mobile-Android-Build',
        ios: 'Mobile-iOS-Build'
      }
    },
    verificationStatus: 'VALID',
    lastVerifiedAt: '2025-01-09T10:00:00Z',
    configuredBy: {
      id: 'user_001',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-09T10:00:00Z'
  },
  {
    id: 'int_004',
    tenantId: 'tenant_001',
    integrationType: IntegrationType.JIRA,
    isEnabled: false,
    isRequired: false,
    config: {},
    verificationStatus: 'NOT_VERIFIED',
    configuredBy: {
      id: 'user_001',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-01T10:00:00Z'
  }
];

// ============================================================================
// SAMPLE RELEASE CYCLES
// ============================================================================

export const mockReleaseCycles: ReleaseCycle[] = [
  {
    id: 'cycle_001',
    tenantId: 'tenant_001',
    name: 'Standard 2-Week Sprint',
    duration: 2,
    phases: [
      {
        name: 'Planning',
        durationDays: 1,
        tasks: [TaskType.PRE_KICK_OFF_REMINDER, TaskType.FORK_BRANCH],
        order: 1
      },
      {
        name: 'Development',
        durationDays: 7,
        tasks: [TaskType.UPDATE_GITHUB_VARIABLES, TaskType.CHERRY_REMINDER],
        order: 2
      },
      {
        name: 'Regression',
        durationDays: 4,
        tasks: [TaskType.TRIGGER_REGRESSION_BUILDS, TaskType.AUTOMATION_RUNS],
        order: 3
      },
      {
        name: 'Release',
        durationDays: 2,
        tasks: [TaskType.CREATE_RELEASE_NOTES, TaskType.TEST_FLIGHT_BUILD, TaskType.CREATE_RELEASE_TAG],
        order: 4
      }
    ],
    isActive: true,
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-01T10:00:00Z'
  },
  {
    id: 'cycle_002',
    tenantId: 'tenant_001',
    name: 'Hotfix Cycle',
    duration: 1,
    phases: [
      {
        name: 'Fix',
        durationDays: 1,
        tasks: [TaskType.FORK_BRANCH, TaskType.UPDATE_GITHUB_VARIABLES],
        order: 1
      },
      {
        name: 'Test & Deploy',
        durationDays: 1,
        tasks: [TaskType.TRIGGER_REGRESSION_BUILDS, TaskType.TEST_FLIGHT_BUILD, TaskType.CREATE_RELEASE_TAG],
        order: 2
      }
    ],
    isActive: true,
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-01T10:00:00Z'
  }
];

