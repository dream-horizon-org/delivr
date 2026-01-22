/**
 * Generate Test Releases Script V2 - Data-Driven Approach
 * Generates all 52 test cases using compact configuration format
 * 
 * Usage: node scripts/generate-test-releases-v2.js
 * Output: Updates mock-server/data/db.json with all test releases
 * 
 * This version uses a data-driven approach with compact configs instead of
 * verbose function definitions, making it much more maintainable.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const TENANT_ID = 'Vy3mYbVgmx';
const ACCOUNT_ID = '4JCGF-VeXg';
const RELEASE_CONFIG_ID = 'NklcgYBbmx';
const BASE_DATE = new Date('2024-12-20T10:00:00.000Z');

// Distribution data counters
let distributionCounter = 1;
let androidSubmissionCounter = 1;
let iosSubmissionCounter = 1;

// Helper functions
function generateUUID() {
  return crypto.randomUUID();
}

function generateReleaseId(index) {
  return `REL-TEST-${String(index).padStart(4, '0')}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

function addHours(date, hours) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result.toISOString();
}

// Enums
const TaskType = {
  FORK_BRANCH: 'FORK_BRANCH',
  CREATE_PROJECT_MANAGEMENT_TICKET: 'CREATE_PROJECT_MANAGEMENT_TICKET',
  CREATE_TEST_SUITE: 'CREATE_TEST_SUITE',
  TRIGGER_PRE_REGRESSION_BUILDS: 'TRIGGER_PRE_REGRESSION_BUILDS',
  RESET_TEST_SUITE: 'RESET_TEST_SUITE',
  CREATE_RC_TAG: 'CREATE_RC_TAG',
  CREATE_RELEASE_NOTES: 'CREATE_RELEASE_NOTES',
  TRIGGER_REGRESSION_BUILDS: 'TRIGGER_REGRESSION_BUILDS',
  TRIGGER_TEST_FLIGHT_BUILD: 'TRIGGER_TEST_FLIGHT_BUILD',
  CREATE_AAB_BUILD: 'CREATE_AAB_BUILD',
  CREATE_RELEASE_TAG: 'CREATE_RELEASE_TAG',
  CREATE_FINAL_RELEASE_NOTES: 'CREATE_FINAL_RELEASE_NOTES',
};

const TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  AWAITING_CALLBACK: 'AWAITING_CALLBACK',
  AWAITING_MANUAL_BUILD: 'AWAITING_MANUAL_BUILD',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
};

const TaskStage = {
  KICKOFF: 'KICKOFF',
  REGRESSION: 'REGRESSION',
  PRE_RELEASE: 'PRE_RELEASE',
};

const Phase = {
  NOT_STARTED: 'NOT_STARTED',
  KICKOFF: 'KICKOFF',
  REGRESSION: 'REGRESSION',
  PRE_RELEASE: 'PRE_RELEASE',
  AWAITING_SUBMISSION: 'AWAITING_SUBMISSION',
  SUBMISSION: 'SUBMISSION',
  SUBMITTED_PENDING_APPROVAL: 'SUBMITTED_PENDING_APPROVAL',
};

const ReleaseStatus = {
  UPCOMING: 'UPCOMING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

const RegressionCycleStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  ABANDONED: 'ABANDONED',
};

const Platform = {
  ANDROID: 'ANDROID',
  IOS: 'IOS',
};

// Helper function to generate task-specific output based on taskType
function generateTaskOutput(taskType, status, options = {}) {
  if (status !== TaskStatus.COMPLETED && status !== TaskStatus.IN_PROGRESS && status !== TaskStatus.AWAITING_CALLBACK) {
    return status === TaskStatus.FAILED ? { error: `Failed ${taskType}` } : null;
  }

  const branch = options.branch || `release/v1.0.0`;
  const releaseId = options.releaseId || 'release-123';
  const cycleIndex = options.cycleIndex || 1;
  const platforms = options.platforms || ['ANDROID', 'IOS'];

  switch (taskType) {
    case TaskType.FORK_BRANCH:
      if (status === TaskStatus.COMPLETED) {
        return {
          branchName: branch,
          branchUrl: `https://github.com/org/repo/tree/${branch}`,
        };
      }
      return null;

    case TaskType.CREATE_PROJECT_MANAGEMENT_TICKET:
      if (status === TaskStatus.COMPLETED) {
        return {
          platforms: platforms.map(platform => ({
            platform: platform,
            ticketUrl: `https://company.atlassian.net/browse/JIRA-${releaseId.slice(0, 8).toUpperCase()}-${platform}`,
          })),
        };
      }
      return null;

    case TaskType.CREATE_TEST_SUITE:
      if (status === TaskStatus.COMPLETED) {
        return {
          platforms: platforms.map(platform => ({
            platform: platform,
            runId: `RUN-${platform}-001`,
            runUrl: `https://testmanagement.company.com/runs/RUN-${platform}-001`,
          })),
        };
      }
      return null;

    case TaskType.RESET_TEST_SUITE:
      if (status === TaskStatus.COMPLETED) {
        return {
          platforms: platforms.map(platform => ({
            platform: platform,
            runId: `RUN-${platform}-00${cycleIndex + 1}`,
            runUrl: `https://testmanagement.company.com/runs/RUN-${platform}-00${cycleIndex + 1}`,
          })),
        };
      }
      return null;

    case TaskType.CREATE_RC_TAG:
      if (status === TaskStatus.COMPLETED) {
        return {
          tagName: `v1.0.0-RC${cycleIndex}`,
          tagUrl: `https://github.com/org/repo/releases/tag/v1.0.0-RC${cycleIndex}`,
        };
      }
      return null;

    case TaskType.CREATE_RELEASE_NOTES:
      if (status === TaskStatus.COMPLETED) {
        return {
          tagUrl: `https://github.com/org/repo/releases/tag/v1.0.0-rc${cycleIndex}`,
        };
      }
      return null;

    case TaskType.CREATE_RELEASE_TAG:
      if (status === TaskStatus.COMPLETED) {
        return {
          tagName: `v1.0.0`,
          tagUrl: `https://github.com/org/repo/releases/tag/v1.0.0`,
        };
      }
      return null;

    case TaskType.CREATE_FINAL_RELEASE_NOTES:
      if (status === TaskStatus.COMPLETED) {
        return {
          tagUrl: `https://github.com/org/repo/releases/tag/v1.0.0`,
        };
      }
      return null;

    case TaskType.TRIGGER_PRE_REGRESSION_BUILDS:
    case TaskType.TRIGGER_REGRESSION_BUILDS:
    case TaskType.TRIGGER_TEST_FLIGHT_BUILD:
    case TaskType.CREATE_AAB_BUILD:
      // Build tasks now use platforms array for jobUrls
      if (status === TaskStatus.IN_PROGRESS || status === TaskStatus.AWAITING_CALLBACK) {
        // Determine expected platforms based on task type
        let expectedPlatforms = [];
        if (taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS) {
          // Pre-Regression: All platforms (typically ANDROID, IOS)
          expectedPlatforms = ['ANDROID', 'IOS'];
        } else if (taskType === TaskType.TRIGGER_REGRESSION_BUILDS) {
          // Regression: Android and iOS
          expectedPlatforms = ['ANDROID', 'IOS'];
        } else if (taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD) {
          // TestFlight: iOS only
          expectedPlatforms = ['IOS'];
        } else if (taskType === TaskType.CREATE_AAB_BUILD) {
          // AAB: Android only
          expectedPlatforms = ['ANDROID'];
        }
        
        return {
          platforms: expectedPlatforms.map(platform => ({
            platform: platform,
            jobUrl: `https://ci.company.com/job/${taskType}-${Date.now()}-${platform}`,
          })),
        };
      }
      return null;

    default:
      return null;
  }
}

// Helper functions for creating entities
function createTask(releaseId, taskType, stage, status, options = {}) {
  const taskId = `task_${releaseId.slice(0, 8)}_${taskType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const createdAt = options.createdAt || now;
  const updatedAt = options.updatedAt || now;
  
  // Generate output based on task type and status
  const output = generateTaskOutput(taskType, status, {
    ...options,
    releaseId: releaseId,
  });
  
  return {
    id: taskId,
    taskId: taskId,
    releaseId: releaseId,
    taskType: taskType,
    taskStage: stage,
    stage: stage,
    taskStatus: status,
    status: status,
    taskConclusion: status === TaskStatus.COMPLETED ? 'success' : status === TaskStatus.FAILED ? 'failure' : 'pending',
    accountId: ACCOUNT_ID,
    regressionId: options.regressionId || null,
    isReleaseKickOffTask: stage === TaskStage.KICKOFF,
    isRegressionSubTasks: stage === TaskStage.REGRESSION,
    identifier: null,
    externalId: options.externalId || (taskType === TaskType.CREATE_PROJECT_MANAGEMENT_TICKET ? `JIRA-${releaseId.slice(0, 8).toUpperCase()}` : taskType === TaskType.CREATE_TEST_SUITE ? `TEST-SUITE-${releaseId.slice(0, 8).toUpperCase()}` : null),
    output: output,
    builds: [], // Always present, empty array if no builds (API contract requirement)
    branch: options.branch || (taskType === TaskType.FORK_BRANCH && status === TaskStatus.COMPLETED ? `release/v1.0.0` : null),
    createdAt: createdAt,
    updatedAt: updatedAt,
  };
}

function createCycle(releaseId, status, cycleTag, options = {}) {
  const cycleId = `cycle_${releaseId.slice(0, 8)}_${cycleTag || 'default'}_${Date.now()}`;
  const now = options.createdAt || new Date().toISOString();
  
  return {
    id: cycleId,
    releaseId: releaseId,
    slotIndex: options.slotIndex || 1,
    slotDateTime: options.slotDateTime || now,
    status: status,
    cycleTag: cycleTag,
    tag: cycleTag,
    commitId: options.commitId || null,
    createdAt: now,
    updatedAt: options.updatedAt || now,
    completedAt: status === RegressionCycleStatus.DONE ? (options.completedAt || now) : null,
  };
}

function createStagingBuild(releaseId, platform, stage, options = {}) {
  const buildId = `staging_${releaseId.slice(0, 8)}_${platform}_${Date.now()}`;
  
  return {
    id: buildId,
    tenantId: TENANT_ID,
    releaseId: releaseId,
    platform: platform,
    stage: stage,
    artifactPath: options.artifactPath || (platform === Platform.IOS && options.testflightNumber ? null : `s3://bucket/releases/${releaseId}/${platform}/build.apk`),
    versionName: options.versionName || null,
    testflightNumber: options.testflightNumber || null,
    buildUploadStatus: options.buildUploadStatus || 'UPLOADED',
    buildType: 'MANUAL',
    isUsed: options.isUsed || false,
    usedByTaskId: options.usedByTaskId || null,
    usedByCycleId: options.usedByCycleId || null,
    regressionId: options.regressionId || null,
    taskId: options.taskId || null,
    createdAt: options.createdAt || new Date().toISOString(),
    updatedAt: options.updatedAt || new Date().toISOString(),
  };
}

function createBuild(releaseId, platform, options = {}) {
  const buildId = `build_${releaseId.slice(0, 8)}_${platform}_${Date.now()}`;
  
  return {
    id: buildId,
    tenantId: TENANT_ID,
    releaseId: releaseId,
    platform: platform,
    storeType: platform === Platform.ANDROID ? 'PLAY_STORE' : 'APP_STORE',
    buildNumber: options.buildNumber || null,
    artifactVersionName: options.versionName || null,
    artifactPath: options.artifactPath || `s3://bucket/releases/${releaseId}/${platform}/build`,
    regressionId: options.regressionId || null,
    ciRunId: options.ciRunId || null,
    buildUploadStatus: options.buildUploadStatus || 'PENDING',
    buildType: options.buildType || 'CI_CD',
    buildStage: options.buildStage || 'KICKOFF',
    queueLocation: options.queueLocation || null,
    workflowStatus: options.workflowStatus || 'PENDING',
    ciRunType: options.ciRunType || 'JENKINS',
    taskId: options.taskId || null,
    internalTrackLink: options.internalTrackLink || null,
    testflightNumber: options.testflightNumber || null,
    createdAt: options.createdAt || new Date().toISOString(),
    updatedAt: options.updatedAt || new Date().toISOString(),
  };
}

function createPlatformMappings(releaseId, platforms) {
  return platforms.map((platform, index) => ({
    id: generateUUID(),
    releaseId: releaseId,
    platform: platform,
    target: platform === Platform.ANDROID ? 'PLAY_STORE' : 'APP_STORE',
    version: 'v1.0.0',
    projectManagementRunId: null,
    testManagementRunId: null,
    createdAt: BASE_DATE.toISOString(),
    updatedAt: BASE_DATE.toISOString(),
  }));
}

function validateStageStatus(status) {
  const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
  if (!validStatuses.includes(status)) {
    console.warn(`Invalid stage status: ${status}, defaulting to PENDING`);
    return 'PENDING';
  }
  return status;
}

function createCronJob(releaseId, phase, stageStatuses = {}) {
  const stage1 = validateStageStatus(stageStatuses.stage1 || (phase === Phase.KICKOFF ? 'IN_PROGRESS' : 'COMPLETED'));
  const stage2 = validateStageStatus(stageStatuses.stage2 || (phase === Phase.REGRESSION ? 'IN_PROGRESS' : phase === Phase.PRE_RELEASE ? 'COMPLETED' : 'PENDING'));
  const stage3 = validateStageStatus(stageStatuses.stage3 || (phase === Phase.PRE_RELEASE ? 'IN_PROGRESS' : 'PENDING'));
  const stage4 = validateStageStatus(stageStatuses.stage4 || 'PENDING');
  
  return {
    id: generateUUID(),
    stage1Status: stage1,
    stage2Status: stage2,
    stage3Status: stage3,
    stage4Status: stage4,
    cronStatus: 'RUNNING',
    pauseType: 'NONE',
    cronConfig: {
      automationRuns: true,
      kickOffReminder: true,
      automationBuilds: true,
      preRegressionBuilds: false,
    },
    upcomingRegressions: null,
    cronCreatedAt: BASE_DATE.toISOString(),
    cronStoppedAt: null,
    cronCreatedByAccountId: ACCOUNT_ID,
    autoTransitionToStage2: false,
    stageData: {},
  };
}

// ============================================================================
// TEST CASE CONFIGURATIONS (Compact Data-Driven Format)
// ============================================================================

const TEST_CASE_CONFIGS = {
  // Pre-Kickoff (3)
  'PRE-1': {
    stage: 'NOT_STARTED',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    status: 'UPCOMING',
    dateOffset: -5,
    kickoffDate: null,
    tasks: {},
    cycles: [],
    stagingBuilds: [],
    builds: [],
    branch: 'test-pre-1-release-just-created',
  },
  
  'PRE-2': {
    stage: 'NOT_STARTED',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    status: 'UPCOMING',
    dateOffset: -3,
    kickoffDate: 7, // days from base date
    tasks: {},
    cycles: [],
    stagingBuilds: [],
    builds: [],
    branch: 'test-pre-2-future-kickoff-date',
  },
  
  'PRE-3': {
    stage: 'NOT_STARTED',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    status: 'UPCOMING',
    dateOffset: -2,
    kickoffDate: null,
    tasks: {},
    cycles: [],
    stagingBuilds: [],
    builds: [],
    branch: 'test-pre-3-ready-not-started',
  },
  
  // Kickoff Manual (6)
  'KO-M-1': {
    stage: 'KICKOFF',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'PENDING',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'PENDING',
      CREATE_TEST_SUITE: 'PENDING',
      TRIGGER_PRE_REGRESSION_BUILDS: 'PENDING',
    },
    cycles: [],
    stagingBuilds: [],
    builds: [],
    branch: 'test-ko-m-1-all-tasks-pending',
  },
  
  'KO-M-2': {
    stage: 'KICKOFF',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'COMPLETED',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'COMPLETED',
      CREATE_TEST_SUITE: 'COMPLETED',
      TRIGGER_PRE_REGRESSION_BUILDS: 'AWAITING_MANUAL_BUILD',
    },
    cycles: [],
    stagingBuilds: [],
    builds: [],
    branch: 'test-ko-m-2-build-task-awaiting-upload',
  },
  
  'KO-M-3': {
    stage: 'KICKOFF',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'COMPLETED',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'COMPLETED',
      CREATE_TEST_SUITE: 'COMPLETED',
      TRIGGER_PRE_REGRESSION_BUILDS: 'AWAITING_MANUAL_BUILD',
    },
    cycles: [],
    stagingBuilds: [
      { platform: 'ANDROID', stage: 'PRE_REGRESSION', isUsed: false, hoursOffset: 3 },
    ],
    builds: [],
    branch: 'test-ko-m-3-partial-builds-uploaded',
  },
  
  'KO-M-4': {
    stage: 'KICKOFF',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'COMPLETED',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'COMPLETED',
      CREATE_TEST_SUITE: 'COMPLETED',
      TRIGGER_PRE_REGRESSION_BUILDS: 'COMPLETED',
    },
    cycles: [],
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'KICKOFF', hoursOffset: 3 },
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'KICKOFF', hoursOffset: 3 },
    ],
    branch: 'test-ko-m-4-all-builds-uploaded',
  },
  
  'KO-M-5': {
    stage: 'KICKOFF',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'FAILED',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'COMPLETED',
      CREATE_TEST_SUITE: 'COMPLETED',
      TRIGGER_PRE_REGRESSION_BUILDS: 'PENDING',
    },
    cycles: [],
    stagingBuilds: [],
    builds: [],
    branch: 'test-ko-m-5-one-task-failed',
  },
  
  'KO-M-6': {
    stage: 'KICKOFF',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'COMPLETED',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'COMPLETED',
      CREATE_TEST_SUITE: 'COMPLETED',
      TRIGGER_PRE_REGRESSION_BUILDS: 'COMPLETED',
    },
    cycles: [],
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'KICKOFF', hoursOffset: 3 },
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'KICKOFF', hoursOffset: 3 },
    ],
    branch: 'test-ko-m-6-all-tasks-completed',
  },
  
  // Kickoff CI/CD (4)
  'KO-C-1': {
    stage: 'KICKOFF',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'PENDING',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'PENDING',
      CREATE_TEST_SUITE: 'PENDING',
      TRIGGER_PRE_REGRESSION_BUILDS: 'PENDING',
    },
    cycles: [],
    stagingBuilds: [],
    builds: [],
    branch: 'test-ko-c-1-all-tasks-pending',
  },
  
  'KO-C-2': {
    stage: 'KICKOFF',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'COMPLETED',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'COMPLETED',
      CREATE_TEST_SUITE: 'COMPLETED',
      TRIGGER_PRE_REGRESSION_BUILDS: 'AWAITING_CALLBACK',
    },
    cycles: [],
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'KICKOFF', workflowStatus: 'RUNNING', hoursOffset: 2 },
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'KICKOFF', workflowStatus: 'RUNNING', hoursOffset: 2 },
    ],
    branch: 'test-ko-c-2-build-task-in-progress',
  },
  
  'KO-C-3': {
    stage: 'KICKOFF',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'COMPLETED',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'COMPLETED',
      CREATE_TEST_SUITE: 'COMPLETED',
      TRIGGER_PRE_REGRESSION_BUILDS: 'FAILED',
    },
    cycles: [],
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'KICKOFF', workflowStatus: 'FAILED', hoursOffset: 2 },
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'KICKOFF', workflowStatus: 'FAILED', hoursOffset: 2 },
    ],
    branch: 'test-ko-c-3-build-task-failed',
  },
  
  'KO-C-4': {
    stage: 'KICKOFF',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'COMPLETED',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'COMPLETED',
      CREATE_TEST_SUITE: 'COMPLETED',
      TRIGGER_PRE_REGRESSION_BUILDS: 'COMPLETED',
    },
    cycles: [],
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'KICKOFF', workflowStatus: 'COMPLETED', hoursOffset: 2 },
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'KICKOFF', workflowStatus: 'COMPLETED', hoursOffset: 2 },
    ],
    branch: 'test-ko-c-4-all-tasks-completed',
  },
  
  // Kickoff Platform (3)
  'KO-P-1': {
    stage: 'KICKOFF',
    mode: 'MANUAL',
    platforms: ['ANDROID'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'PENDING',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'PENDING',
      CREATE_TEST_SUITE: 'PENDING',
      TRIGGER_PRE_REGRESSION_BUILDS: 'PENDING',
    },
    cycles: [],
    stagingBuilds: [],
    builds: [],
    branch: 'test-ko-p-1-android-only',
  },
  
  'KO-P-2': {
    stage: 'KICKOFF',
    mode: 'MANUAL',
    platforms: ['IOS'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'PENDING',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'PENDING',
      CREATE_TEST_SUITE: 'PENDING',
      TRIGGER_PRE_REGRESSION_BUILDS: 'PENDING',
    },
    cycles: [],
    stagingBuilds: [],
    builds: [],
    branch: 'test-ko-p-2-ios-only',
  },
  
  'KO-P-3': {
    stage: 'KICKOFF',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -1,
    kickoffDate: -1,
    tasks: {
      FORK_BRANCH: 'PENDING',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'PENDING',
      CREATE_TEST_SUITE: 'PENDING',
      TRIGGER_PRE_REGRESSION_BUILDS: 'PENDING',
    },
    cycles: [],
    stagingBuilds: [],
    builds: [],
    branch: 'test-ko-p-3-both-platforms',
  },
  
  // ============================================================================
  // REGRESSION STAGE - MANUAL MODE (15 test cases)
  // ============================================================================
  
  'REG-M-1': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [],
    upcomingSlot: { dateOffset: 2 },
    regressionTasks: {},
    stagingBuilds: [],
    builds: [],
    branch: 'test-reg-m-1-first-slot-upcoming',
  },
  
  'REG-M-2': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [
      { status: 'IN_PROGRESS', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: 1, builds: ['ANDROID', 'IOS'] },
    ],
    upcomingSlot: null,
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'REGRESSION', hoursOffset: 1, cycleIndex: 0 },
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'REGRESSION', hoursOffset: 1, cycleIndex: 0 },
    ],
    branch: 'test-reg-m-2-first-slot-active',
  },
  
  'REG-M-3': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -2, completedHoursOffset: 4 },
    ],
    upcomingSlot: { dateOffset: 2 },
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-reg-m-3-first-completed-second-upcoming',
  },
  
  'REG-M-4': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -3, completedHoursOffset: 4 },
      { status: 'IN_PROGRESS', tag: 'rc-1.0.0-cycle2', slotIndex: 2, dateOffset: 1, builds: ['ANDROID', 'IOS'] },
    ],
    upcomingSlot: null,
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'REGRESSION', hoursOffset: 1, cycleIndex: 1 },
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'REGRESSION', hoursOffset: 1, cycleIndex: 1 },
    ],
    branch: 'test-reg-m-4-first-completed-second-active',
  },
  
  'REG-M-5': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -3, completedHoursOffset: 4 },
    ],
    upcomingSlot: { dateOffset: 2 },
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-reg-m-5-second-upcoming-first-completed',
  },
  
  'REG-M-6': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -3, completedHoursOffset: 4 },
    ],
    upcomingSlot: { dateOffset: -1 }, // Past date
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-reg-m-6-slot-time-passed-builds-not-uploaded',
  },
  
  'REG-M-7': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
      { status: 'DONE', tag: 'rc-1.0.0-cycle2', slotIndex: 2, dateOffset: -2, completedHoursOffset: 4 },
    ],
    upcomingSlot: null,
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-reg-m-7-all-cycles-completed',
  },
  
  'REG-M-8': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -2, completedHoursOffset: 4 },
    ],
    upcomingSlot: { dateOffset: 2 },
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [
      { platform: 'ANDROID', stage: 'REGRESSION', isUsed: false, hoursOffset: -1 },
    ],
    builds: [],
    branch: 'test-reg-m-8-partial-builds-uploaded-next-cycle',
  },
  
  'REG-M-9': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -2, completedHoursOffset: 4 },
    ],
    upcomingSlot: { dateOffset: 2 },
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [
      { platform: 'ANDROID', stage: 'REGRESSION', isUsed: false, hoursOffset: -1 },
      { platform: 'IOS', stage: 'REGRESSION', isUsed: false, hoursOffset: -1 },
    ],
    builds: [],
    branch: 'test-reg-m-9-all-builds-uploaded-next-cycle',
  },
  
  'REG-M-10': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [
      { status: 'ABANDONED', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -2 },
    ],
    upcomingSlot: { dateOffset: 2 },
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-reg-m-10-cycle-abandoned',
  },
  
  'REG-M-11': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [
      { status: 'IN_PROGRESS', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: 1 },
    ],
    upcomingSlot: null,
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'FAILED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'REGRESSION', buildUploadStatus: 'FAILED', hoursOffset: 1, cycleIndex: 0 },
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'REGRESSION', buildUploadStatus: 'UPLOADED', hoursOffset: 1, cycleIndex: 0 },
    ],
    branch: 'test-reg-m-11-android-build-failed',
  },
  
  'REG-M-12': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [
      { status: 'IN_PROGRESS', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: 1 },
    ],
    upcomingSlot: null,
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'FAILED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'REGRESSION', buildUploadStatus: 'FAILED', hoursOffset: 1, cycleIndex: 0 },
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'REGRESSION', buildUploadStatus: 'FAILED', hoursOffset: 1, cycleIndex: 0 },
    ],
    branch: 'test-reg-m-12-both-builds-failed',
  },
  
  'REG-M-14': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
      { status: 'IN_PROGRESS', tag: 'rc-1.0.0-cycle2', slotIndex: 2, dateOffset: -1, builds: ['ANDROID', 'IOS'] },
    ],
    upcomingSlot: { dateOffset: 3 },
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'REGRESSION', hoursOffset: 1, cycleIndex: 1 },
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'REGRESSION', hoursOffset: 1, cycleIndex: 1 },
    ],
    branch: 'test-reg-m-14-three-cycles-states',
  },
  
  'REG-M-15': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -20,
    kickoffDate: -20,
    kickoffCompleted: true,
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -15, completedHoursOffset: 4 },
      { status: 'DONE', tag: 'rc-1.0.0-cycle2', slotIndex: 2, dateOffset: -12, completedHoursOffset: 4 },
      { status: 'DONE', tag: 'rc-1.0.0-cycle3', slotIndex: 3, dateOffset: -9, completedHoursOffset: 4 },
      { status: 'DONE', tag: 'rc-1.0.0-cycle4', slotIndex: 4, dateOffset: -6, completedHoursOffset: 4 },
      { status: 'DONE', tag: 'rc-1.0.0-cycle5', slotIndex: 5, dateOffset: -3, completedHoursOffset: 4 },
      { status: 'IN_PROGRESS', tag: 'rc-1.0.0-cycle6', slotIndex: 6, dateOffset: -1, builds: ['ANDROID', 'IOS'] },
    ],
    upcomingSlot: null,
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'REGRESSION', hoursOffset: 1, cycleIndex: 5 },
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'REGRESSION', hoursOffset: 1, cycleIndex: 5 },
    ],
    branch: 'test-reg-m-15-many-past-cycles',
  },
  
  'REG-M-16': {
    stage: 'REGRESSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
      { status: 'DONE', tag: 'rc-1.0.0-cycle2', slotIndex: 2, dateOffset: -3, completedHoursOffset: 4 },
      { status: 'DONE', tag: 'rc-1.0.0-cycle3', slotIndex: 3, dateOffset: -1, completedHoursOffset: 4 },
    ],
    upcomingSlot: null,
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-reg-m-16-all-cycles-completed-three',
  },
  
  // ============================================================================
  // REGRESSION STAGE - CI/CD MODE (4 test cases)
  // ============================================================================
  
  'REG-C-1': {
    stage: 'REGRESSION',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [
      { status: 'IN_PROGRESS', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: 1 },
    ],
    upcomingSlot: null,
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'AWAITING_CALLBACK',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'REGRESSION', workflowStatus: 'RUNNING', hoursOffset: 1, cycleIndex: 0 },
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'REGRESSION', workflowStatus: 'RUNNING', hoursOffset: 1, cycleIndex: 0 },
    ],
    branch: 'test-reg-c-1-first-cycle-active',
  },
  
  'REG-C-2': {
    stage: 'REGRESSION',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -5,
    kickoffDate: -5,
    kickoffCompleted: true,
    cycles: [
      { status: 'IN_PROGRESS', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: 1 },
    ],
    upcomingSlot: null,
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'FAILED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'REGRESSION', workflowStatus: 'FAILED', buildUploadStatus: 'FAILED', hoursOffset: 1, cycleIndex: 0 },
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'REGRESSION', workflowStatus: 'RUNNING', hoursOffset: 1, cycleIndex: 0 },
    ],
    branch: 'test-reg-c-2-build-failed',
  },
  
  'REG-C-3': {
    stage: 'REGRESSION',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
      { status: 'DONE', tag: 'rc-1.0.0-cycle2', slotIndex: 2, dateOffset: -2, completedHoursOffset: 4 },
    ],
    upcomingSlot: null,
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'REGRESSION', workflowStatus: 'COMPLETED', hoursOffset: 1, cycleIndex: 0 },
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'REGRESSION', workflowStatus: 'COMPLETED', hoursOffset: 1, cycleIndex: 0 },
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'REGRESSION', workflowStatus: 'COMPLETED', hoursOffset: 1, cycleIndex: 1 },
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'REGRESSION', workflowStatus: 'COMPLETED', hoursOffset: 1, cycleIndex: 1 },
    ],
    branch: 'test-reg-c-3-all-cycles-completed',
  },
  
  'REG-C-4': {
    stage: 'REGRESSION',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
      { status: 'IN_PROGRESS', tag: 'rc-1.0.0-cycle2', slotIndex: 2, dateOffset: -1 },
    ],
    upcomingSlot: null,
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'AWAITING_CALLBACK',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'REGRESSION', workflowStatus: 'COMPLETED', hoursOffset: 1, cycleIndex: 0 },
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'REGRESSION', workflowStatus: 'COMPLETED', hoursOffset: 1, cycleIndex: 0 },
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'REGRESSION', workflowStatus: 'RUNNING', hoursOffset: 1, cycleIndex: 1 },
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'REGRESSION', workflowStatus: 'RUNNING', hoursOffset: 1, cycleIndex: 1 },
    ],
    branch: 'test-reg-c-4-multiple-cycles-mixed',
  },
  
  // ============================================================================
  // PRE-RELEASE STAGE - MANUAL MODE (10 test cases)
  // ============================================================================
  
  'POST-M-1': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'PENDING',
      CREATE_AAB_BUILD: 'PENDING',
      CREATE_RELEASE_TAG: 'PENDING',
      CREATE_FINAL_RELEASE_NOTES: 'PENDING',
    },
    cycles: [
      // Add completed regression cycles so regression tasks are generated
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-post-m-1-all-tasks-pending',
  },
  
  'POST-M-2': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'AWAITING_MANUAL_BUILD',
      CREATE_AAB_BUILD: 'PENDING',
      CREATE_RELEASE_TAG: 'PENDING',
      CREATE_FINAL_RELEASE_NOTES: 'PENDING',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-post-m-2-testflight-awaiting-upload',
  },
  
  'POST-M-3': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'PENDING',
      CREATE_AAB_BUILD: 'AWAITING_MANUAL_BUILD',
      CREATE_RELEASE_TAG: 'PENDING',
      CREATE_FINAL_RELEASE_NOTES: 'PENDING',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-post-m-3-aab-awaiting-upload',
  },
  
  'POST-M-4': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'AWAITING_MANUAL_BUILD',
      CREATE_AAB_BUILD: 'AWAITING_MANUAL_BUILD',
      CREATE_RELEASE_TAG: 'PENDING',
      CREATE_FINAL_RELEASE_NOTES: 'PENDING',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-post-m-4-both-build-tasks-awaiting',
  },
  
  'POST-M-5': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'IN_PROGRESS',
      CREATE_AAB_BUILD: 'AWAITING_MANUAL_BUILD',
      CREATE_RELEASE_TAG: 'PENDING',
      CREATE_FINAL_RELEASE_NOTES: 'PENDING',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [
      { platform: 'IOS', stage: 'PRE_RELEASE', isUsed: false, testflightNumber: '12345', versionName: '1.0.0', hoursOffset: 1 },
    ],
    builds: [],
    branch: 'test-post-m-5-partial-builds-uploaded',
  },
  
  'POST-M-6': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', testflightNumber: '12345', storeType: 'TESTFLIGHT', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', internalTrackLink: 'https://play.google.com/apps/internaltest/...', storeType: 'PLAY_STORE', hoursOffset: 1 },
    ],
    branch: 'test-post-m-6-all-tasks-completed',
  },
  
  'POST-M-7': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', testflightNumber: '12345', storeType: 'TESTFLIGHT', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', internalTrackLink: 'https://play.google.com/apps/internaltest/...', storeType: 'PLAY_STORE', hoursOffset: 1 },
    ],
    branch: 'test-post-m-7-pm-approval-pending',
  },
  
  'POST-M-8': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', testflightNumber: '12345', storeType: 'TESTFLIGHT', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', internalTrackLink: 'https://play.google.com/apps/internaltest/...', storeType: 'PLAY_STORE', hoursOffset: 1 },
    ],
    branch: 'test-post-m-8-pm-approval-granted',
  },
  
  'POST-M-9': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'FAILED',
      CREATE_FINAL_RELEASE_NOTES: 'PENDING',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', testflightNumber: '12345', storeType: 'TESTFLIGHT', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', internalTrackLink: 'https://play.google.com/apps/internaltest/...', storeType: 'PLAY_STORE', hoursOffset: 1 },
    ],
    branch: 'test-post-m-9-one-task-failed',
  },
  
  'POST-M-10': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', testflightNumber: '12345', storeType: 'TESTFLIGHT', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', internalTrackLink: 'https://play.google.com/apps/internaltest/...', storeType: 'PLAY_STORE', hoursOffset: 1 },
    ],
    branch: 'test-post-m-10-extra-commits-warning',
  },
  
  // ============================================================================
  // PRE-RELEASE STAGE - CI/CD MODE (4 test cases)
  // ============================================================================
  
  'POST-C-1': {
    stage: 'PRE_RELEASE',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'PENDING',
      CREATE_AAB_BUILD: 'PENDING',
      CREATE_RELEASE_TAG: 'PENDING',
      CREATE_FINAL_RELEASE_NOTES: 'PENDING',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-post-c-1-all-tasks-pending',
  },
  
  'POST-C-2': {
    stage: 'PRE_RELEASE',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'AWAITING_CALLBACK',
      CREATE_AAB_BUILD: 'AWAITING_CALLBACK',
      CREATE_RELEASE_TAG: 'PENDING',
      CREATE_FINAL_RELEASE_NOTES: 'PENDING',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'RUNNING', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'RUNNING', hoursOffset: 1 },
    ],
    branch: 'test-post-c-2-build-tasks-in-progress',
  },
  
  'POST-C-3': {
    stage: 'PRE_RELEASE',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'FAILED',
      CREATE_AAB_BUILD: 'FAILED',
      CREATE_RELEASE_TAG: 'PENDING',
      CREATE_FINAL_RELEASE_NOTES: 'PENDING',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'FAILED', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'FAILED', hoursOffset: 1 },
    ],
    branch: 'test-post-c-3-build-tasks-failed',
  },
  
  'POST-C-4': {
    stage: 'PRE_RELEASE',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'COMPLETED', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'COMPLETED', hoursOffset: 1 },
    ],
    branch: 'test-post-c-4-all-tasks-completed',
  },
  
  // ============================================================================
  // PRE-RELEASE STAGE - PLATFORM VARIATIONS (3 test cases)
  // ============================================================================
  
  'POST-P-1': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['ANDROID'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      CREATE_AAB_BUILD: 'PENDING',
      CREATE_RELEASE_TAG: 'PENDING',
      CREATE_FINAL_RELEASE_NOTES: 'PENDING',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-post-p-1-android-only',
  },
  
  'POST-P-2': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'PENDING',
      CREATE_RELEASE_TAG: 'PENDING',
      CREATE_FINAL_RELEASE_NOTES: 'PENDING',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-post-p-2-ios-only',
  },
  
  'POST-P-3': {
    stage: 'PRE_RELEASE',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -10,
    kickoffDate: -10,
    kickoffCompleted: true,
    regressionCompleted: true,
    postRegressionDateOffset: -2,
    tasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'PENDING',
      CREATE_AAB_BUILD: 'PENDING',
      CREATE_RELEASE_TAG: 'PENDING',
      CREATE_FINAL_RELEASE_NOTES: 'PENDING',
    },
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [],
    branch: 'test-post-p-3-both-platforms',
  },
  
  // ============================================================================
  // DISTRIBUTION/SUBMISSION STAGE - MANUAL MODE (6 test cases)
  // ============================================================================
  
  'SUB-M-1': {
    stage: 'AWAITING_SUBMISSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -12,
    kickoffDate: -12,
    kickoffCompleted: true,
    regressionCompleted: true,
    preReleaseCompleted: true,
    postRegressionDateOffset: -4,
    submissionDateOffset: -1,
    tasks: {}, // No submission tasks yet (awaiting)
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -7, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    preReleaseTasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', testflightNumber: '12345', storeType: 'TESTFLIGHT', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', internalTrackLink: 'https://play.google.com/apps/internaltest/...', storeType: 'PLAY_STORE', hoursOffset: 1 },
    ],
    branch: 'test-sub-m-1-awaiting-submission',
  },
  
  'SUB-M-2': {
    stage: 'SUBMISSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -12,
    kickoffDate: -12,
    kickoffCompleted: true,
    regressionCompleted: true,
    preReleaseCompleted: true,
    postRegressionDateOffset: -4,
    submissionDateOffset: -1,
    status: 'IN_PROGRESS',
    tasks: {}, // Submission tasks handled by backend
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -7, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    preReleaseTasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', testflightNumber: '12345', storeType: 'TESTFLIGHT', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', internalTrackLink: 'https://play.google.com/apps/internaltest/...', storeType: 'PLAY_STORE', hoursOffset: 1 },
    ],
    branch: 'test-sub-m-2-submission-in-progress',
  },
  
  'SUB-M-3': {
    stage: 'SUBMITTED_PENDING_APPROVAL',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -12,
    kickoffDate: -12,
    kickoffCompleted: true,
    regressionCompleted: true,
    preReleaseCompleted: true,
    postRegressionDateOffset: -4,
    submissionDateOffset: -1,
    status: 'SUBMITTED',
    tasks: {},
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -7, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    preReleaseTasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', testflightNumber: '12345', storeType: 'TESTFLIGHT', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', internalTrackLink: 'https://play.google.com/apps/internaltest/...', storeType: 'PLAY_STORE', hoursOffset: 1 },
    ],
    branch: 'test-sub-m-3-submitted-pending-approval',
  },
  
  'SUB-M-4': {
    stage: 'SUBMISSION',
    mode: 'MANUAL',
    platforms: ['ANDROID'],
    dateOffset: -12,
    kickoffDate: -12,
    kickoffCompleted: true,
    regressionCompleted: true,
    preReleaseCompleted: true,
    postRegressionDateOffset: -4,
    submissionDateOffset: -1,
    status: 'IN_PROGRESS',
    tasks: {},
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -7, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    preReleaseTasks: {
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', internalTrackLink: 'https://play.google.com/apps/internaltest/...', storeType: 'PLAY_STORE', hoursOffset: 1 },
    ],
    branch: 'test-sub-m-4-android-only-submission',
  },
  
  'SUB-M-5': {
    stage: 'SUBMISSION',
    mode: 'MANUAL',
    platforms: ['IOS'],
    dateOffset: -12,
    kickoffDate: -12,
    kickoffCompleted: true,
    regressionCompleted: true,
    preReleaseCompleted: true,
    postRegressionDateOffset: -4,
    submissionDateOffset: -1,
    status: 'IN_PROGRESS',
    tasks: {},
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -7, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    preReleaseTasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', testflightNumber: '12345', storeType: 'TESTFLIGHT', hoursOffset: 1 },
    ],
    branch: 'test-sub-m-5-ios-only-submission',
  },
  
  'SUB-M-6': {
    stage: 'SUBMISSION',
    mode: 'MANUAL',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -12,
    kickoffDate: -12,
    kickoffCompleted: true,
    regressionCompleted: true,
    preReleaseCompleted: true,
    postRegressionDateOffset: -4,
    submissionDateOffset: -1,
    status: 'IN_PROGRESS',
    tasks: {},
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -7, completedHoursOffset: 4 },
      { status: 'DONE', tag: 'rc-1.0.0-cycle2', slotIndex: 2, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    preReleaseTasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', testflightNumber: '12345', storeType: 'TESTFLIGHT', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'PRE_RELEASE', internalTrackLink: 'https://play.google.com/apps/internaltest/...', storeType: 'PLAY_STORE', hoursOffset: 1 },
    ],
    branch: 'test-sub-m-6-multiple-cycles-submission',
  },
  
  // ============================================================================
  // DISTRIBUTION/SUBMISSION STAGE - CI/CD MODE (4 test cases)
  // ============================================================================
  
  'SUB-C-1': {
    stage: 'AWAITING_SUBMISSION',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -12,
    kickoffDate: -12,
    kickoffCompleted: true,
    regressionCompleted: true,
    preReleaseCompleted: true,
    postRegressionDateOffset: -4,
    submissionDateOffset: -1,
    tasks: {},
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -7, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    preReleaseTasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'COMPLETED', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'COMPLETED', hoursOffset: 1 },
    ],
    branch: 'test-sub-c-1-awaiting-submission-cicd',
  },
  
  'SUB-C-2': {
    stage: 'SUBMISSION',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -12,
    kickoffDate: -12,
    kickoffCompleted: true,
    regressionCompleted: true,
    preReleaseCompleted: true,
    postRegressionDateOffset: -4,
    submissionDateOffset: -1,
    status: 'IN_PROGRESS',
    tasks: {},
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -7, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    preReleaseTasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'COMPLETED', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'COMPLETED', hoursOffset: 1 },
    ],
    branch: 'test-sub-c-2-submission-in-progress-cicd',
  },
  
  'SUB-C-3': {
    stage: 'SUBMITTED_PENDING_APPROVAL',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -12,
    kickoffDate: -12,
    kickoffCompleted: true,
    regressionCompleted: true,
    preReleaseCompleted: true,
    postRegressionDateOffset: -4,
    submissionDateOffset: -1,
    status: 'SUBMITTED',
    tasks: {},
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -7, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    preReleaseTasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'COMPLETED', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'COMPLETED', hoursOffset: 1 },
    ],
    branch: 'test-sub-c-3-submitted-pending-approval-cicd',
  },
  
  'SUB-C-4': {
    stage: 'SUBMISSION',
    mode: 'CI_CD',
    platforms: ['ANDROID', 'IOS'],
    dateOffset: -12,
    kickoffDate: -12,
    kickoffCompleted: true,
    regressionCompleted: true,
    preReleaseCompleted: true,
    postRegressionDateOffset: -4,
    submissionDateOffset: -1,
    status: 'IN_PROGRESS',
    tasks: {},
    cycles: [
      { status: 'DONE', tag: 'rc-1.0.0-cycle1', slotIndex: 1, dateOffset: -7, completedHoursOffset: 4 },
      { status: 'DONE', tag: 'rc-1.0.0-cycle2', slotIndex: 2, dateOffset: -5, completedHoursOffset: 4 },
    ],
    regressionTasks: {
      RESET_TEST_SUITE: 'COMPLETED',
      CREATE_RC_TAG: 'COMPLETED',
      CREATE_RELEASE_NOTES: 'COMPLETED',
      TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
    },
    preReleaseTasks: {
      TRIGGER_TEST_FLIGHT_BUILD: 'COMPLETED',
      CREATE_AAB_BUILD: 'COMPLETED',
      CREATE_RELEASE_TAG: 'COMPLETED',
      CREATE_FINAL_RELEASE_NOTES: 'COMPLETED',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'COMPLETED', hoursOffset: 1 },
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'PRE_RELEASE', workflowStatus: 'COMPLETED', hoursOffset: 1 },
    ],
    branch: 'test-sub-c-4-multiple-cycles-submission-cicd',
  },
};

// ============================================================================
// GENERATOR FUNCTIONS
// ============================================================================

function generateTestCase(testId, config, index) {
  const releaseId = generateUUID();
  const baseDate = addDays(BASE_DATE, config.dateOffset || 0);
  const kickoffDate = config.kickoffDate !== undefined 
    ? (config.kickoffDate === null ? null : addDays(baseDate, config.kickoffDate))
    : addDays(baseDate, -1);
  
  // Generate cycles first (needed for tasks and builds)
  const cycles = generateCycles(releaseId, config, baseDate);
  
  // Generate release
  const release = generateRelease(releaseId, config, baseDate, kickoffDate, index);
  
  // Generate tasks (needs cycles for regression tasks)
  const tasks = generateTasks(releaseId, config, baseDate, kickoffDate, cycles);
  
  // Generate builds (needs tasks and cycles)
  const { stagingBuilds, builds } = generateBuilds(releaseId, config, baseDate, kickoffDate, tasks, cycles);
  
  // Generate distribution data for distribution stage releases (SUB-* test cases)
  let distributionData = null;
  if (testId.startsWith('SUB-')) {
    distributionData = createDistributionData(releaseId, config, baseDate, builds);
  }
  
  return {
    release: {
      ...release,
      tasks: tasks, // Tasks are also stored in release.tasks
    },
    cycles,
    stagingBuilds,
    builds,
    tasks, // Also return separately for the tasks array
    distribution: distributionData?.distribution || null,
    androidSubmissions: distributionData?.androidSubmissions || [],
    iosSubmissions: distributionData?.iosSubmissions || [],
  };
}

function generateRelease(releaseId, config, baseDate, kickoffDate, index) {
  const cronJob = config.stage === 'NOT_STARTED' ? null : (() => {
    const stageStatuses = {};
    if (config.stage === 'REGRESSION') {
      stageStatuses.stage1 = config.kickoffCompleted ? 'COMPLETED' : 'PENDING';
      stageStatuses.stage2 = 'IN_PROGRESS';
    } else if (config.stage === 'PRE_RELEASE') {
      stageStatuses.stage1 = 'COMPLETED';
      stageStatuses.stage2 = config.regressionCompleted ? 'COMPLETED' : 'PENDING';
      stageStatuses.stage3 = 'IN_PROGRESS';
    } else if (config.stage === 'AWAITING_SUBMISSION' || config.stage === 'SUBMISSION' || config.stage === 'SUBMITTED_PENDING_APPROVAL') {
      stageStatuses.stage1 = 'COMPLETED';
      stageStatuses.stage2 = 'COMPLETED';
      stageStatuses.stage3 = config.preReleaseCompleted ? 'COMPLETED' : 'PENDING';
      stageStatuses.stage4 = config.stage === 'SUBMISSION' || config.stage === 'SUBMITTED_PENDING_APPROVAL' ? 'IN_PROGRESS' : 'PENDING';
    }
    const cron = createCronJob(releaseId, Phase[config.stage] || Phase.KICKOFF, stageStatuses);
    
    // Handle upcomingRegressions for regression stage
    if (config.stage === 'REGRESSION' && config.upcomingSlot) {
      const upcomingDate = addDays(baseDate, config.upcomingSlot.dateOffset);
      cron.upcomingRegressions = [{ date: upcomingDate, config: {} }];
    } else if (config.stage === 'REGRESSION' && !config.upcomingSlot) {
      cron.upcomingRegressions = null;
    }
    
    return cron;
  })();
  
  let updatedAt = kickoffDate || baseDate;
  if (config.stage === 'REGRESSION' && config.cycles && config.cycles.length > 0) {
    const lastCycle = config.cycles[config.cycles.length - 1];
    if (lastCycle.completedHoursOffset) {
      updatedAt = addHours(addDays(baseDate, lastCycle.dateOffset), lastCycle.completedHoursOffset);
    }
  } else if (config.stage === 'PRE_RELEASE' && config.postRegressionDateOffset) {
    updatedAt = addDays(baseDate, config.postRegressionDateOffset);
  } else if ((config.stage === 'AWAITING_SUBMISSION' || config.stage === 'SUBMISSION' || config.stage === 'SUBMITTED_PENDING_APPROVAL') && config.submissionDateOffset) {
    updatedAt = addDays(baseDate, config.submissionDateOffset);
  }
  
  return {
    id: releaseId,
    releaseId: generateReleaseId(index + 1),
    releaseConfigId: RELEASE_CONFIG_ID,
    tenantId: TENANT_ID,
    type: 'PLANNED',
    status: config.status || ReleaseStatus.IN_PROGRESS,
    releasePhase: Phase[config.stage] || Phase.KICKOFF,
    branch: config.branch,
    baseBranch: 'main',
    baseReleaseId: null,
    platformTargetMappings: createPlatformMappings(releaseId, config.platforms),
    kickOffReminderDate: kickoffDate ? addDays(kickoffDate, -1) : null,
    kickOffDate: kickoffDate,
    targetReleaseDate: kickoffDate ? addDays(kickoffDate, 20) : null,
    releaseDate: null,
    hasManualBuildUpload: config.mode === 'MANUAL',
    customIntegrationConfigs: null,
    preCreatedBuilds: null,
    createdByAccountId: ACCOUNT_ID,
    releasePilotAccountId: ACCOUNT_ID,
    lastUpdatedByAccountId: ACCOUNT_ID,
    createdAt: addDays(baseDate, -5),
    updatedAt: updatedAt,
    cronJob: cronJob,
    tasks: [], // Will be populated
  };
}

function generateTasks(releaseId, config, baseDate, kickoffDate, cycles = []) {
  const tasks = [];
  const stage = config.stage;
  const taskDate = kickoffDate || baseDate;
  
  // Generate kickoff tasks for REGRESSION, PRE_RELEASE, and SUBMISSION stages (they always include completed kickoff tasks)
  if ((stage === 'REGRESSION' || stage === 'PRE_RELEASE' || stage === 'AWAITING_SUBMISSION' || stage === 'SUBMISSION' || stage === 'SUBMITTED_PENDING_APPROVAL') && config.kickoffCompleted !== false && kickoffDate) {
    const kickoffCompletedDate = addHours(kickoffDate, 5);
    const kickoffTaskConfigs = {
      FORK_BRANCH: 'COMPLETED',
      CREATE_PROJECT_MANAGEMENT_TICKET: 'COMPLETED',
      CREATE_TEST_SUITE: 'COMPLETED',
      TRIGGER_PRE_REGRESSION_BUILDS: 'COMPLETED',
    };
    
    Object.entries(kickoffTaskConfigs).forEach(([taskType, status], idx) => {
      const createdAt = kickoffDate;
      const updatedAt = taskType === 'TRIGGER_PRE_REGRESSION_BUILDS' 
        ? kickoffCompletedDate 
        : addHours(createdAt, idx + 1);
      tasks.push(createTask(releaseId, TaskType[taskType], TaskStage.KICKOFF, TaskStatus[status], {
        createdAt,
        updatedAt,
        branch: config.branch || null,
        platforms: config.platforms || ['ANDROID', 'IOS'],
      }));
    });
  }
  
  // Generate kickoff tasks for KICKOFF stage
  if (stage === 'KICKOFF' && config.tasks) {
    const taskConfigs = {
      FORK_BRANCH: config.tasks.FORK_BRANCH || 'PENDING',
      CREATE_PROJECT_MANAGEMENT_TICKET: config.tasks.CREATE_PROJECT_MANAGEMENT_TICKET || 'PENDING',
      CREATE_TEST_SUITE: config.tasks.CREATE_TEST_SUITE || 'PENDING',
      TRIGGER_PRE_REGRESSION_BUILDS: config.tasks.TRIGGER_PRE_REGRESSION_BUILDS || 'PENDING',
    };
    
    Object.entries(taskConfigs).forEach(([taskType, status], idx) => {
      const createdAt = taskDate;
      const updatedAt = (status === 'COMPLETED' || status === 'FAILED') 
        ? addHours(createdAt, idx + 1) 
        : createdAt;
      
      const taskOptions = {
        createdAt,
        updatedAt,
        branch: config.branch || null,
        platforms: config.platforms || ['ANDROID', 'IOS'],
      };
      
      tasks.push(createTask(releaseId, TaskType[taskType], TaskStage.KICKOFF, TaskStatus[status], taskOptions));
    });
  }
  
  // Generate regression tasks for each cycle (for REGRESSION stage)
  if (stage === 'REGRESSION' && config.regressionTasks && cycles.length > 0) {
    cycles.forEach((cycle, cycleIdx) => {
      const cycleDate = new Date(cycle.slotDateTime);
      const taskConfigs = {
        RESET_TEST_SUITE: config.regressionTasks.RESET_TEST_SUITE || 'COMPLETED',
        CREATE_RC_TAG: config.regressionTasks.CREATE_RC_TAG || 'COMPLETED',
        CREATE_RELEASE_NOTES: config.regressionTasks.CREATE_RELEASE_NOTES || 'COMPLETED',
        TRIGGER_REGRESSION_BUILDS: config.regressionTasks.TRIGGER_REGRESSION_BUILDS || 'COMPLETED',
      };
      
      Object.entries(taskConfigs).forEach(([taskType, status], idx) => {
        const createdAt = cycleDate.toISOString();
        let updatedAt;
        if (taskType === 'TRIGGER_REGRESSION_BUILDS' && status === 'COMPLETED') {
          // TRIGGER_REGRESSION_BUILDS takes 2 hours to complete
          updatedAt = addHours(createdAt, 2);
        } else {
          updatedAt = (status === 'COMPLETED' || status === 'FAILED') 
            ? addHours(createdAt, idx + 1) 
            : createdAt;
        }
        
        const taskOptions = {
          createdAt,
          updatedAt,
          regressionId: cycle.id,
          cycleIndex: cycleIdx + 1,
          platforms: config.platforms || ['ANDROID', 'IOS'],
        };
        
        tasks.push(createTask(releaseId, TaskType[taskType], TaskStage.REGRESSION, TaskStatus[status], taskOptions));
      });
    });
  }
  
  // Generate regression tasks for completed cycles (for PRE_RELEASE and SUBMISSION stages)
  // PRE_RELEASE and SUBMISSION stages should include regression tasks from all completed cycles
  // Note: V1 doesn't include regression tasks in PRE_RELEASE, only kickoff + pre-release tasks
  // But if cycles exist, we should include their regression tasks
  if ((stage === 'PRE_RELEASE' || stage === 'AWAITING_SUBMISSION' || stage === 'SUBMISSION' || stage === 'SUBMITTED_PENDING_APPROVAL') && config.regressionCompleted && cycles.length > 0) {
    cycles.forEach((cycle) => {
      const cycleDate = new Date(cycle.slotDateTime);
      const taskConfigs = {
        RESET_TEST_SUITE: 'COMPLETED',
        CREATE_RC_TAG: 'COMPLETED',
        CREATE_RELEASE_NOTES: 'COMPLETED',
        TRIGGER_REGRESSION_BUILDS: 'COMPLETED',
      };
      
      Object.entries(taskConfigs).forEach(([taskType, status], idx) => {
        const createdAt = cycleDate.toISOString();
        const updatedAt = taskType === 'TRIGGER_REGRESSION_BUILDS' 
          ? addHours(createdAt, 2)
          : addHours(createdAt, idx + 1);
        
        tasks.push(createTask(releaseId, TaskType[taskType], TaskStage.REGRESSION, TaskStatus[status], {
          createdAt,
          updatedAt,
          regressionId: cycle.id,
          cycleIndex: cycles.indexOf(cycle) + 1,
          platforms: config.platforms || ['ANDROID', 'IOS'],
        }));
      });
    });
  }
  
  // Generate pre-release tasks (for PRE_RELEASE stage)
  if (stage === 'PRE_RELEASE' && config.tasks) {
    const postRegressionDate = config.postRegressionDateOffset 
      ? addDays(baseDate, config.postRegressionDateOffset)
      : addDays(baseDate, -2);
    
    const taskConfigs = {};
    
    // Only include tasks for configured platforms
    if (config.platforms.includes('IOS')) {
      taskConfigs.TRIGGER_TEST_FLIGHT_BUILD = config.tasks.TRIGGER_TEST_FLIGHT_BUILD || 'PENDING';
    }
    if (config.platforms.includes('ANDROID')) {
      taskConfigs.CREATE_AAB_BUILD = config.tasks.CREATE_AAB_BUILD || 'PENDING';
    }
    taskConfigs.CREATE_RELEASE_TAG = config.tasks.CREATE_RELEASE_TAG || 'PENDING';
    taskConfigs.CREATE_FINAL_RELEASE_NOTES = config.tasks.CREATE_FINAL_RELEASE_NOTES || 'PENDING';
    
    Object.entries(taskConfigs).forEach(([taskType, status], idx) => {
      const createdAt = postRegressionDate;
      const updatedAt = (status === 'COMPLETED' || status === 'FAILED' || status === 'IN_PROGRESS') 
        ? addHours(createdAt, idx + 1) 
        : createdAt;
      
      const taskOptions = {
        createdAt,
        updatedAt,
        branch: config.branch || null,
      };
      
      tasks.push(createTask(releaseId, TaskType[taskType], TaskStage.PRE_RELEASE, TaskStatus[status], taskOptions));
    });
  }
  
  // Generate pre-release tasks (for SUBMISSION stages - all completed)
  if ((stage === 'AWAITING_SUBMISSION' || stage === 'SUBMISSION' || stage === 'SUBMITTED_PENDING_APPROVAL') && config.preReleaseCompleted && config.preReleaseTasks) {
    const postRegressionDate = config.postRegressionDateOffset 
      ? addDays(baseDate, config.postRegressionDateOffset)
      : addDays(baseDate, -4);
    
    const taskConfigs = {};
    
    // Only include tasks for configured platforms
    if (config.platforms.includes('IOS')) {
      taskConfigs.TRIGGER_TEST_FLIGHT_BUILD = config.preReleaseTasks.TRIGGER_TEST_FLIGHT_BUILD || 'COMPLETED';
    }
    if (config.platforms.includes('ANDROID')) {
      taskConfigs.CREATE_AAB_BUILD = config.preReleaseTasks.CREATE_AAB_BUILD || 'COMPLETED';
    }
    taskConfigs.CREATE_RELEASE_TAG = config.preReleaseTasks.CREATE_RELEASE_TAG || 'COMPLETED';
    taskConfigs.CREATE_FINAL_RELEASE_NOTES = config.preReleaseTasks.CREATE_FINAL_RELEASE_NOTES || 'COMPLETED';
    
    Object.entries(taskConfigs).forEach(([taskType, status], idx) => {
      const createdAt = postRegressionDate;
      const updatedAt = (status === 'COMPLETED' || status === 'FAILED' || status === 'IN_PROGRESS') 
        ? addHours(createdAt, idx + 1) 
        : createdAt;
      
      const taskOptions = {
        createdAt,
        updatedAt,
        branch: config.branch || null,
      };
      
      tasks.push(createTask(releaseId, TaskType[taskType], TaskStage.PRE_RELEASE, TaskStatus[status], taskOptions));
    });
  }
  
  return tasks;
}

function generateCycles(releaseId, config, baseDate) {
  const cycles = [];
  
  if (config.cycles && Array.isArray(config.cycles)) {
    config.cycles.forEach((cycleConfig, idx) => {
      const cycleDate = cycleConfig.dateOffset !== undefined
        ? addDays(baseDate, cycleConfig.dateOffset)
        : addDays(baseDate, idx + 1);
      
      const completedAt = cycleConfig.status === 'DONE' && cycleConfig.completedHoursOffset
        ? addHours(cycleDate, cycleConfig.completedHoursOffset)
        : (cycleConfig.status === 'DONE' ? cycleDate : null);
      
      cycles.push(createCycle(
        releaseId,
        RegressionCycleStatus[cycleConfig.status] || RegressionCycleStatus.NOT_STARTED,
        cycleConfig.tag || `rc-1.0.0-cycle${idx + 1}`,
        {
          slotIndex: cycleConfig.slotIndex || idx + 1,
          slotDateTime: cycleDate,
          createdAt: cycleDate,
          completedAt: completedAt,
          updatedAt: completedAt || cycleDate,
        }
      ));
    });
  }
  
  return cycles;
}

function generateBuilds(releaseId, config, baseDate, kickoffDate, tasks, cycles) {
  const stagingBuilds = [];
  const builds = [];
  const taskDate = kickoffDate || baseDate;
  
  // Generate staging builds
  if (config.stagingBuilds && Array.isArray(config.stagingBuilds)) {
    config.stagingBuilds.forEach((buildConfig) => {
      let buildDate;
      if (buildConfig.hoursOffset !== undefined) {
        const refDate = config.stage === 'REGRESSION' && config.upcomingSlot
          ? addDays(baseDate, config.upcomingSlot.dateOffset)
          : taskDate;
        buildDate = addHours(refDate, buildConfig.hoursOffset);
      } else {
        buildDate = taskDate;
      }
      
      stagingBuilds.push(createStagingBuild(
        releaseId,
        Platform[buildConfig.platform],
        buildConfig.stage,
        {
          createdAt: buildDate,
          isUsed: buildConfig.isUsed || false,
          usedByTaskId: buildConfig.isUsed ? (tasks.find(t => 
            t.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS || 
            t.taskType === TaskType.TRIGGER_REGRESSION_BUILDS
          )?.id || null) : null,
          testflightNumber: buildConfig.testflightNumber || null,
          versionName: buildConfig.versionName || null,
        }
      ));
    });
  }
  
  // Generate consumed builds
  if (config.builds && Array.isArray(config.builds)) {
    config.builds.forEach((buildConfig) => {
      let buildDate;
      let cycle = null;
      
      if (buildConfig.cycleIndex !== undefined && cycles[buildConfig.cycleIndex]) {
        cycle = cycles[buildConfig.cycleIndex];
        const cycleDate = new Date(cycle.slotDateTime);
        buildDate = buildConfig.hoursOffset 
          ? addHours(cycleDate.toISOString(), buildConfig.hoursOffset)
          : cycleDate.toISOString();
      } else {
        const refDate = (config.stage === 'PRE_RELEASE' || config.stage === 'AWAITING_SUBMISSION' || config.stage === 'SUBMISSION' || config.stage === 'SUBMITTED_PENDING_APPROVAL') && config.postRegressionDateOffset
          ? addDays(baseDate, config.postRegressionDateOffset)
          : taskDate;
        buildDate = buildConfig.hoursOffset 
          ? addHours(refDate, buildConfig.hoursOffset)
          : refDate;
      }
      
      const buildTask = tasks.find(t => {
        if (buildConfig.cycleIndex !== undefined && cycle) {
          return (t.taskType === TaskType.TRIGGER_REGRESSION_BUILDS && t.regressionId === cycle.id);
        }
        return (
          t.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS || 
          t.taskType === TaskType.TRIGGER_REGRESSION_BUILDS ||
          t.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD ||
          t.taskType === TaskType.CREATE_AAB_BUILD
        );
      });
      
      const buildOptions = {
        taskId: buildTask ? buildTask.id : null,
        buildType: buildConfig.buildType || 'MANUAL',
        buildStage: buildConfig.buildStage || 'KICKOFF',
        buildUploadStatus: buildConfig.buildUploadStatus || 'UPLOADED',
        workflowStatus: buildConfig.workflowStatus || null,
        regressionId: cycle ? cycle.id : null,
        createdAt: buildDate,
        updatedAt: buildDate,
      };
      
      if (buildConfig.testflightNumber) {
        buildOptions.testflightNumber = buildConfig.testflightNumber;
        buildOptions.storeType = 'TESTFLIGHT';
      }
      
      if (buildConfig.internalTrackLink) {
        buildOptions.internalTrackLink = buildConfig.internalTrackLink;
        buildOptions.storeType = buildOptions.storeType || 'PLAY_STORE';
      }
      
      if (buildConfig.storeType) {
        buildOptions.storeType = buildConfig.storeType;
      }
      
      if (buildConfig.artifactPath) {
        buildOptions.artifactPath = buildConfig.artifactPath;
      }
      
      builds.push(createBuild(releaseId, Platform[buildConfig.platform], buildOptions));
    });
  }
  
  return { stagingBuilds, builds };
}

/**
 * Create distribution data for a release (store_distribution + submission builds)
 * Only called for distribution stage releases (SUB-* test cases)
 */
function createDistributionData(releaseId, config, baseDate, builds = []) {
  const distributionId = `dist_${releaseId.slice(0, 8)}_${String(distributionCounter++).padStart(3, '0')}`;
  const submissionDate = config.submissionDateOffset !== undefined
    ? addDays(baseDate, config.submissionDateOffset)
    : addDays(baseDate, -1);
  
  // Determine distribution status based on stage
  let distributionStatus = 'PENDING';
  if (config.stage === 'SUBMISSION' || config.stage === 'SUBMITTED_PENDING_APPROVAL') {
    distributionStatus = 'SUBMITTED';
  } else if (config.stage === 'AWAITING_SUBMISSION') {
    distributionStatus = 'PENDING';
  }
  
  const distribution = {
    id: distributionId,
    tenantId: TENANT_ID,
    releaseId: releaseId,
    status: distributionStatus,
    createdAt: submissionDate,
    updatedAt: submissionDate,
  };
  
  const androidSubmissions = [];
  const iosSubmissions = [];
  
  // Get version from platform target mappings (default to v1.0.0)
  const version = 'v1.0.0';
  const versionCode = 10000;
  
  // Generate Android submission if Android platform
  if (config.platforms.includes('ANDROID')) {
    const androidBuild = builds.find(b => b.platform === 'ANDROID');
    const androidSub = {
      id: `asb_${releaseId.slice(0, 8)}_${String(androidSubmissionCounter++).padStart(3, '0')}`,
      distributionId: distributionId,
      version: version,
      storeType: 'PLAY_STORE',
      versionCode: versionCode,
      rolloutPercentage: 0,
      inAppUpdatePriority: 3,
      releaseNotes: `Android ${version} release`,
      submittedAt: submissionDate,
      submittedBy: ACCOUNT_ID,
      statusUpdatedAt: submissionDate,
      createdAt: submissionDate,
      updatedAt: submissionDate,
      artifact: {
        artifactPath: androidBuild?.artifactPath || `s3://bucket/releases/${releaseId}/android/build.aab`,
        internalTrackLink: androidBuild?.internalTrackLink || 'https://play.google.com/apps/testing/com.dream11.fantasy',
      },
      actionHistory: [],
      isCurrent: true,
      status: config.stage === 'AWAITING_SUBMISSION' ? 'PENDING' : 
              config.stage === 'SUBMISSION' ? 'IN_REVIEW' : 
              config.stage === 'SUBMITTED_PENDING_APPROVAL' ? 'APPROVED' : 'PENDING',
    };
    androidSubmissions.push(androidSub);
  }
  
  // Generate iOS submission if iOS platform
  if (config.platforms.includes('IOS')) {
    const iosBuild = builds.find(b => b.platform === 'IOS');
    const iosSub = {
      id: `isb_${releaseId.slice(0, 8)}_${String(iosSubmissionCounter++).padStart(3, '0')}`,
      distributionId: distributionId,
      version: version,
      storeType: 'APP_STORE',
      releaseType: 'AFTER_APPROVAL',
      phasedRelease: true,
      resetRating: false,
      rolloutPercentage: 0,
      releaseNotes: `iOS ${version} release`,
      submittedAt: submissionDate,
      submittedBy: ACCOUNT_ID,
      statusUpdatedAt: submissionDate,
      createdAt: submissionDate,
      updatedAt: submissionDate,
      artifact: {
        testflightNumber: (iosBuild && iosBuild.testflightNumber) ? String(iosBuild.testflightNumber) : '12345',
        testflightLink: 'https://appstoreconnect.apple.com/apps/123456/testflight',
      },
      actionHistory: [],
      isCurrent: true,
      status: config.stage === 'AWAITING_SUBMISSION' ? 'PENDING' : 
              config.stage === 'SUBMISSION' ? 'IN_REVIEW' : 
              config.stage === 'SUBMITTED_PENDING_APPROVAL' ? 'APPROVED' : 'PENDING',
    };
    iosSubmissions.push(iosSub);
  }
  
  return {
    distribution,
    androidSubmissions,
    iosSubmissions,
  };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Generating test releases (V2 - Data-Driven)...\n');
  
  const dbPath = path.join(__dirname, '../mock-server/data/db-release-process.json');
  let existingData = { 
    releases: [], 
    releaseTasks: [], 
    regressionCycles: [], 
    buildUploadsStaging: [], 
    builds: [],
    store_distribution: [],
    android_submission_builds: [],
    ios_submission_builds: [],
  };
  
  try {
    if (fs.existsSync(dbPath)) {
      existingData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      console.log(`📖 Read existing data: ${existingData.releases?.length || 0} releases`);
    }
  } catch (error) {
    console.log(`⚠️  Could not read existing db.json: ${error.message}`);
  }
  
  const ALL_TEST_CASES = [
    // Pre-Kickoff (3)
    'PRE-1', 'PRE-2', 'PRE-3',
    // Kickoff Manual (6)
    'KO-M-1', 'KO-M-2', 'KO-M-3', 'KO-M-4', 'KO-M-5', 'KO-M-6',
    // Kickoff CI/CD (4)
    'KO-C-1', 'KO-C-2', 'KO-C-3', 'KO-C-4',
    // Kickoff Platform (3)
    'KO-P-1', 'KO-P-2', 'KO-P-3',
    // Regression Manual (15)
    'REG-M-1', 'REG-M-2', 'REG-M-3', 'REG-M-4', 'REG-M-5', 'REG-M-6', 'REG-M-7', 'REG-M-8',
    'REG-M-9', 'REG-M-10', 'REG-M-11', 'REG-M-12', 'REG-M-14', 'REG-M-15', 'REG-M-16',
    // Regression CI/CD (4)
    'REG-C-1', 'REG-C-2', 'REG-C-3', 'REG-C-4',
    // Pre-Release Manual (10)
    'POST-M-1', 'POST-M-2', 'POST-M-3', 'POST-M-4', 'POST-M-5', 'POST-M-6', 'POST-M-7', 'POST-M-8', 'POST-M-9', 'POST-M-10',
    // Pre-Release CI/CD (4)
    'POST-C-1', 'POST-C-2', 'POST-C-3', 'POST-C-4',
    // Pre-Release Platform (3)
    'POST-P-1', 'POST-P-2', 'POST-P-3',
    // Distribution/Submission Manual (6)
    'SUB-M-1', 'SUB-M-2', 'SUB-M-3', 'SUB-M-4', 'SUB-M-5', 'SUB-M-6',
    // Distribution/Submission CI/CD (4)
    'SUB-C-1', 'SUB-C-2', 'SUB-C-3', 'SUB-C-4',
  ];
  
  const testData = {
    releases: [],
    tasks: [],
    regressionCycles: [],
    buildUploadsStaging: [],
    builds: [],
    store_distribution: [],
    android_submission_builds: [],
    ios_submission_builds: [],
  };
  
  const testCaseIds = Object.keys(TEST_CASE_CONFIGS)
    .filter(id => ALL_TEST_CASES.includes(id))
    .sort((a, b) => ALL_TEST_CASES.indexOf(a) - ALL_TEST_CASES.indexOf(b));
  
  console.log(`📋 Generating ${testCaseIds.length} test cases...\n`);
  
  testCaseIds.forEach((testId, index) => {
    try {
      const testCase = generateTestCase(testId, TEST_CASE_CONFIGS[testId], index);
      testData.releases.push(testCase.release);
      
      if (testCase.tasks && Array.isArray(testCase.tasks)) {
        const tasksWithReleaseId = testCase.tasks.map(task => ({
          ...task,
          releaseId: testCase.release.id,
        }));
        testData.tasks.push(...tasksWithReleaseId);
      }
      
      if (testCase.cycles && Array.isArray(testCase.cycles)) {
        testData.regressionCycles.push(...testCase.cycles);
      }
      
      if (testCase.stagingBuilds && Array.isArray(testCase.stagingBuilds)) {
        testData.buildUploadsStaging.push(...testCase.stagingBuilds);
      }
      
      if (testCase.builds && Array.isArray(testCase.builds)) {
        testData.builds.push(...testCase.builds);
      }
      
      // Collect distribution data for distribution stage releases
      if (testCase.distribution) {
        testData.store_distribution.push(testCase.distribution);
      }
      if (testCase.androidSubmissions && Array.isArray(testCase.androidSubmissions)) {
        testData.android_submission_builds.push(...testCase.androidSubmissions);
      }
      if (testCase.iosSubmissions && Array.isArray(testCase.iosSubmissions)) {
        testData.ios_submission_builds.push(...testCase.iosSubmissions);
      }
      
      process.stdout.write(`  ✅ ${testId} (${index + 1}/${testCaseIds.length})\r`);
    } catch (error) {
      console.error(`\n  ❌ Error generating ${testId}: ${error.message}`);
      if (error.stack) {
        console.error(`     Stack: ${error.stack.split('\n')[1]}`);
      }
    }
  });
  
  console.log(`\n\n✅ Generated ${testData.releases.length} test releases`);
  console.log(`✅ Generated ${testData.tasks.length} test tasks`);
  console.log(`✅ Generated ${testData.regressionCycles.length} test cycles`);
  console.log(`✅ Generated ${testData.buildUploadsStaging.length} staging builds`);
  console.log(`✅ Generated ${testData.builds.length} builds`);
  console.log(`✅ Generated ${testData.store_distribution.length} distributions`);
  console.log(`✅ Generated ${testData.android_submission_builds.length} Android submissions`);
  console.log(`✅ Generated ${testData.ios_submission_builds.length} iOS submissions`);
  
  const mergedData = {
    ...existingData,
    releases: testData.releases,
    releaseTasks: testData.tasks,
    regressionCycles: testData.regressionCycles,
    buildUploadsStaging: testData.buildUploadsStaging,
    builds: testData.builds,
    store_distribution: [
      ...(existingData.store_distribution || []),
      ...testData.store_distribution,
    ],
    android_submission_builds: [
      ...(existingData.android_submission_builds || []),
      ...testData.android_submission_builds,
    ],
    ios_submission_builds: [
      ...(existingData.ios_submission_builds || []),
      ...testData.ios_submission_builds,
    ],
  };
  
  try {
    fs.writeFileSync(dbPath, JSON.stringify(mergedData, null, 2));
    console.log(`\n📝 Updated: ${dbPath}`);
    console.log(`\n✨ Total releases in db-release-process.json: ${mergedData.releases.length}`);
  } catch (error) {
    console.error(`\n❌ Error writing to db.json: ${error.message}`);
    process.exit(1);
  }
}

