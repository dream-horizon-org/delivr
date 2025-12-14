/**
 * Generate Test Releases Script V2 - Data-Driven Approach
 * Generates all 53 test cases using compact configuration format
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
  POST_REGRESSION: 'POST_REGRESSION',
};

const Phase = {
  NOT_STARTED: 'NOT_STARTED',
  KICKOFF: 'KICKOFF',
  REGRESSION: 'REGRESSION',
  POST_REGRESSION: 'POST_REGRESSION',
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

// Helper function to generate task-specific externalData based on taskType
function generateTaskExternalData(taskType, status, options = {}) {
  if (status !== TaskStatus.COMPLETED) {
    return status === TaskStatus.FAILED ? { error: `Failed ${taskType}` } : null;
  }

  const branch = options.branch || `release/v1.0.0`;
  const releaseId = options.releaseId || 'release-123';
  const cycleIndex = options.cycleIndex || 1;
  const platforms = options.platforms || ['ANDROID', 'IOS'];

  switch (taskType) {
    case TaskType.FORK_BRANCH:
      return {
        branchName: branch,
        branchUrl: `https://github.com/org/repo/tree/${branch}`,
      };

    case TaskType.CREATE_PROJECT_MANAGEMENT_TICKET:
      return {
        projectManagement: {
          platforms: platforms.map(platform => ({
            platform: platform,
            ticketUrl: `https://company.atlassian.net/browse/JIRA-${releaseId.slice(0, 8).toUpperCase()}-${platform}`,
          })),
        },
      };

    case TaskType.CREATE_TEST_SUITE:
      return {
        testManagement: {
          platforms: platforms.map(platform => ({
            platform: platform,
            runId: `RUN-${platform}-001`,
            runUrl: `https://testmanagement.company.com/runs/RUN-${platform}-001`,
          })),
        },
      };

    case TaskType.RESET_TEST_SUITE:
      return {
        testManagement: {
          platforms: platforms.map(platform => ({
            platform: platform,
            runId: `RUN-${platform}-00${cycleIndex + 1}`,
            runUrl: `https://testmanagement.company.com/runs/RUN-${platform}-00${cycleIndex + 1}`,
          })),
        },
      };

    case TaskType.CREATE_RC_TAG:
      return {
        tagName: `v1.0.0-RC${cycleIndex}`,
        tagUrl: `https://github.com/org/repo/releases/tag/v1.0.0-RC${cycleIndex}`,
      };

    case TaskType.CREATE_RELEASE_NOTES:
      return {
        notesUrl: `https://docs.company.com/releases/v1.0.0-rc${cycleIndex}`,
      };

    case TaskType.CREATE_RELEASE_TAG:
      return {
        tagName: `v1.0.0`,
        tagUrl: `https://github.com/org/repo/releases/tag/v1.0.0`,
      };

    case TaskType.CREATE_FINAL_RELEASE_NOTES:
      return {
        notesUrl: `https://docs.company.com/releases/v1.0.0`,
      };

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
  
  // Generate externalData based on task type and status
  const externalData = generateTaskExternalData(taskType, status, {
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
    externalData: externalData,
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
    buildStage: options.buildStage || 'KICK_OFF',
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
  const stage2 = validateStageStatus(stageStatuses.stage2 || (phase === Phase.REGRESSION ? 'IN_PROGRESS' : phase === Phase.POST_REGRESSION ? 'COMPLETED' : 'PENDING'));
  const stage3 = validateStageStatus(stageStatuses.stage3 || (phase === Phase.POST_REGRESSION ? 'IN_PROGRESS' : 'PENDING'));
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
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'KICK_OFF', hoursOffset: 3 },
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'KICK_OFF', hoursOffset: 3 },
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
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'KICK_OFF', hoursOffset: 3 },
      { platform: 'IOS', buildType: 'MANUAL', buildStage: 'KICK_OFF', hoursOffset: 3 },
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
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'KICK_OFF', workflowStatus: 'RUNNING', hoursOffset: 2 },
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'KICK_OFF', workflowStatus: 'RUNNING', hoursOffset: 2 },
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
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'KICK_OFF', workflowStatus: 'FAILED', hoursOffset: 2 },
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'KICK_OFF', workflowStatus: 'FAILED', hoursOffset: 2 },
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
      { platform: 'ANDROID', buildType: 'CI_CD', buildStage: 'KICK_OFF', workflowStatus: 'COMPLETED', hoursOffset: 2 },
      { platform: 'IOS', buildType: 'CI_CD', buildStage: 'KICK_OFF', workflowStatus: 'COMPLETED', hoursOffset: 2 },
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
  // REGRESSION STAGE - MANUAL MODE (16 test cases)
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
  
  'REG-M-13': {
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
      TRIGGER_REGRESSION_BUILDS: 'AWAITING_MANUAL_BUILD',
    },
    stagingBuilds: [],
    builds: [
      { platform: 'ANDROID', buildType: 'MANUAL', buildStage: 'REGRESSION', hoursOffset: 1, cycleIndex: 0 },
    ],
    branch: 'test-reg-m-13-one-platform-missing',
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
  // POST-REGRESSION STAGE - MANUAL MODE (10 test cases)
  // ============================================================================
  
  'POST-M-1': {
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
  // POST-REGRESSION STAGE - CI/CD MODE (4 test cases)
  // ============================================================================
  
  'POST-C-1': {
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
  // POST-REGRESSION STAGE - PLATFORM VARIATIONS (3 test cases)
  // ============================================================================
  
  'POST-P-1': {
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
    stage: 'POST_REGRESSION',
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
  
  return {
    release: {
      ...release,
      tasks: tasks, // Tasks are also stored in release.tasks
    },
    cycles,
    stagingBuilds,
    builds,
    tasks, // Also return separately for the tasks array
  };
}

function generateRelease(releaseId, config, baseDate, kickoffDate, index) {
  const cronJob = config.stage === 'NOT_STARTED' ? null : (() => {
    const stageStatuses = {};
    if (config.stage === 'REGRESSION') {
      stageStatuses.stage1 = config.kickoffCompleted ? 'COMPLETED' : 'PENDING';
      stageStatuses.stage2 = 'IN_PROGRESS';
    } else if (config.stage === 'POST_REGRESSION') {
      stageStatuses.stage1 = 'COMPLETED';
      stageStatuses.stage2 = config.regressionCompleted ? 'COMPLETED' : 'PENDING';
      stageStatuses.stage3 = 'IN_PROGRESS';
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
  } else if (config.stage === 'POST_REGRESSION' && config.postRegressionDateOffset) {
    updatedAt = addDays(baseDate, config.postRegressionDateOffset);
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
  
  // Generate kickoff tasks for REGRESSION and POST_REGRESSION stages (they always include completed kickoff tasks)
  if ((stage === 'REGRESSION' || stage === 'POST_REGRESSION') && config.kickoffCompleted !== false && kickoffDate) {
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
  
  // Generate regression tasks for completed cycles (for POST_REGRESSION stage)
  // POST_REGRESSION stages should include regression tasks from all completed cycles
  // Note: V1 doesn't include regression tasks in POST_REGRESSION, only kickoff + post-regression tasks
  // But if cycles exist, we should include their regression tasks
  if (stage === 'POST_REGRESSION' && config.regressionCompleted && cycles.length > 0) {
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
  
  // Generate post-regression tasks
  if (stage === 'POST_REGRESSION' && config.tasks) {
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
      
      tasks.push(createTask(releaseId, TaskType[taskType], TaskStage.POST_REGRESSION, TaskStatus[status], taskOptions));
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
        const refDate = config.stage === 'POST_REGRESSION' && config.postRegressionDateOffset
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
        buildStage: buildConfig.buildStage || 'KICK_OFF',
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

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Generating test releases (V2 - Data-Driven)...\n');
  
  const dbPath = path.join(__dirname, '../mock-server/data/db.json');
  let existingData = { releases: [], releaseTasks: [], regressionCycles: [], buildUploadsStaging: [], builds: [] };
  
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
    // Regression Manual (16)
    'REG-M-1', 'REG-M-2', 'REG-M-3', 'REG-M-4', 'REG-M-5', 'REG-M-6', 'REG-M-7', 'REG-M-8',
    'REG-M-9', 'REG-M-10', 'REG-M-11', 'REG-M-12', 'REG-M-13', 'REG-M-14', 'REG-M-15', 'REG-M-16',
    // Regression CI/CD (4)
    'REG-C-1', 'REG-C-2', 'REG-C-3', 'REG-C-4',
    // Post-Regression Manual (10)
    'POST-M-1', 'POST-M-2', 'POST-M-3', 'POST-M-4', 'POST-M-5', 'POST-M-6', 'POST-M-7', 'POST-M-8', 'POST-M-9', 'POST-M-10',
    // Post-Regression CI/CD (4)
    'POST-C-1', 'POST-C-2', 'POST-C-3', 'POST-C-4',
    // Post-Regression Platform (3)
    'POST-P-1', 'POST-P-2', 'POST-P-3',
  ];
  
  const testData = {
    releases: [],
    tasks: [],
    regressionCycles: [],
    buildUploadsStaging: [],
    builds: [],
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
  
  const mergedData = {
    ...existingData,
    releases: testData.releases,
    releaseTasks: testData.tasks,
    regressionCycles: testData.regressionCycles,
    buildUploadsStaging: testData.buildUploadsStaging,
    builds: testData.builds,
  };
  
  try {
    fs.writeFileSync(dbPath, JSON.stringify(mergedData, null, 2));
    console.log(`\n📝 Updated: ${dbPath}`);
    console.log(`\n✨ Total releases in db.json: ${mergedData.releases.length}`);
  } catch (error) {
    console.error(`\n❌ Error writing to db.json: ${error.message}`);
    process.exit(1);
  }
}

