/**
 * Generate Test Releases Script
 * Generates all 53 test cases as mock releases compatible with API contract
 * 
 * Usage: node scripts/generate-test-releases.js
 * Output: Updates mock-server/data/db.json with all test releases
 * 
 * Note: This script uses crypto.randomUUID() for UUID generation (Node 14.17+)
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

// Task Type constants
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

// Create task helper
function createTask(releaseId, taskType, stage, status, options = {}) {
  const taskId = `task_${releaseId.slice(0, 8)}_${taskType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const createdAt = options.createdAt || now;
  const updatedAt = options.updatedAt || now;
  
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
    externalId: options.externalId || null,
    externalData: options.externalData || {},
    branch: options.branch || null,
    createdAt: createdAt,
    updatedAt: updatedAt,
  };
}

// Create cycle helper
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

// Create build helper (for staging)
function createStagingBuild(releaseId, platform, stage, options = {}) {
  const buildId = `staging_${releaseId.slice(0, 8)}_${platform}_${Date.now()}`;
  
  return {
    id: buildId,
    tenantId: TENANT_ID,
    releaseId: releaseId,
    platform: platform,
    stage: stage,
    artifactPath: options.artifactPath || `s3://bucket/releases/${releaseId}/${platform}/build.apk`,
    versionName: options.versionName || null,
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

// Create build helper (for CI/CD)
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

// Create platform mappings
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

// Validate stage status - only allow PENDING, IN_PROGRESS, COMPLETED
function validateStageStatus(status) {
  const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
  if (!validStatuses.includes(status)) {
    console.warn(`Invalid stage status: ${status}, defaulting to PENDING`);
    return 'PENDING';
  }
  return status;
}

// Create cron job
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
// TEST CASE GENERATORS
// ============================================================================

const testCases = {
  // ============================================================================
  // PRE-KICKOFF STAGE (3 test cases)
  // ============================================================================
  
  'PRE-1': () => {
    const releaseId = generateUUID();
    const releaseDate = addDays(BASE_DATE, -5);
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(1),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.UPCOMING,
        releasePhase: Phase.NOT_STARTED,
        branch: 'test-pre-1-release-just-created',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: null,
        kickOffDate: null,
        targetReleaseDate: addDays(BASE_DATE, 30),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: releaseDate,
        updatedAt: releaseDate,
        cronJob: null,
        tasks: [],
      },
      cycles: [],
      stagingBuilds: [],
      builds: [],
    };
  },
  
  'PRE-2': () => {
    const releaseId = generateUUID();
    const releaseDate = addDays(BASE_DATE, -3);
    const kickoffDate = addDays(BASE_DATE, 7);
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(2),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.UPCOMING,
        releasePhase: Phase.NOT_STARTED,
        branch: 'test-pre-2-future-kickoff-date',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 15),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: releaseDate,
        updatedAt: releaseDate,
        cronJob: null,
        tasks: [],
      },
      cycles: [],
      stagingBuilds: [],
      builds: [],
    };
  },
  
  'PRE-3': () => {
    const releaseId = generateUUID();
    const releaseDate = addDays(BASE_DATE, -2);
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(3),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.UPCOMING,
        releasePhase: Phase.NOT_STARTED,
        branch: 'test-pre-3-ready-not-started',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(BASE_DATE, -1),
        kickOffDate: addDays(BASE_DATE, 1),
        targetReleaseDate: addDays(BASE_DATE, 20),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: releaseDate,
        updatedAt: releaseDate,
        cronJob: null,
        tasks: [],
      },
      cycles: [],
      stagingBuilds: [],
      builds: [],
    };
  },
  
  // ============================================================================
  // KICKOFF STAGE - MANUAL MODE (6 test cases)
  // ============================================================================
  
  'KO-M-1': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -1);
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.PENDING, { createdAt: kickoffDate }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.PENDING, { createdAt: kickoffDate }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.PENDING, { createdAt: kickoffDate }),
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.PENDING, { createdAt: kickoffDate }),
    ];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(4),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.KICKOFF,
        branch: 'test-ko-m-1-all-tasks-pending',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: kickoffDate,
        cronJob: createCronJob(releaseId, Phase.KICKOFF),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: [],
      builds: [],
    };
  },
  
  'KO-M-2': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -1);
    const taskDate = addHours(kickoffDate, 2);
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.AWAITING_MANUAL_BUILD, { createdAt: taskDate }),
    ];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(5),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.KICKOFF,
        branch: 'test-ko-m-2-build-task-awaiting-upload',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: taskDate,
        cronJob: createCronJob(releaseId, Phase.KICKOFF),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: [],
      builds: [],
    };
  },
  
  'KO-M-3': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -1);
    const taskDate = addHours(kickoffDate, 2);
    const buildDate = addHours(kickoffDate, 3);
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.AWAITING_MANUAL_BUILD, { createdAt: taskDate }),
    ];
    
    const stagingBuilds = [
      createStagingBuild(releaseId, Platform.ANDROID, 'PRE_REGRESSION', {
        createdAt: buildDate,
        isUsed: false,
      }),
    ];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(6),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.KICKOFF,
        branch: 'test-ko-m-3-partial-builds-uploaded',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: buildDate,
        cronJob: createCronJob(releaseId, Phase.KICKOFF),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: stagingBuilds,
      builds: [],
    };
  },
  
  'KO-M-4': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -1);
    const taskDate = addHours(kickoffDate, 2);
    const buildDate = addHours(kickoffDate, 3);
    const completedDate = addHours(kickoffDate, 4);
    
    // Create build task first to get taskId for builds
    const buildTask = createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.COMPLETED, { 
      createdAt: taskDate, 
      startedAt: buildDate,
      updatedAt: completedDate,
      completedAt: completedDate,
    });
    
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      buildTask,
    ];
    
    // Builds are consumed (moved from staging to builds table)
    // All builds uploaded and task has consumed them, so task is COMPLETED
    const consumedBuilds = [
      createBuild(releaseId, Platform.ANDROID, {
        taskId: buildTask.id,
        buildType: 'MANUAL',
        buildStage: 'KICK_OFF',
        buildUploadStatus: 'UPLOADED',
        artifactPath: `s3://bucket/releases/${releaseId}/ANDROID/build.apk`,
        createdAt: buildDate,
        updatedAt: completedDate,
      }),
      createBuild(releaseId, Platform.IOS, {
        taskId: buildTask.id,
        buildType: 'MANUAL',
        buildStage: 'KICK_OFF',
        buildUploadStatus: 'UPLOADED',
        artifactPath: `s3://bucket/releases/${releaseId}/IOS/build.ipa`,
        createdAt: buildDate,
        updatedAt: completedDate,
      }),
    ];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(7),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.KICKOFF,
        branch: 'test-ko-m-4-all-builds-uploaded',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: completedDate,
        cronJob: createCronJob(releaseId, Phase.KICKOFF),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: [], // No staging builds - all consumed
      builds: consumedBuilds, // Builds are in builds table (consumed)
    };
  },
  
  'KO-M-5': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -1);
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.FAILED, { 
        createdAt: kickoffDate, 
        updatedAt: addHours(kickoffDate, 1),
        externalData: { error: 'Failed to fork branch' },
      }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.PENDING, { createdAt: kickoffDate }),
    ];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(8),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.KICKOFF,
        branch: 'test-ko-m-5-one-task-failed',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: addHours(kickoffDate, 1),
        cronJob: createCronJob(releaseId, Phase.KICKOFF),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: [],
      builds: [],
    };
  },
  
  'KO-M-6': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -2);
    const completedDate = addHours(kickoffDate, 5);
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 2) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 3) }),
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: completedDate }),
    ];
    
    const stagingBuilds = [
      createStagingBuild(releaseId, Platform.ANDROID, 'PRE_REGRESSION', {
        createdAt: addHours(kickoffDate, 4),
        isUsed: true,
      }),
      createStagingBuild(releaseId, Platform.IOS, 'PRE_REGRESSION', {
        createdAt: addHours(kickoffDate, 4),
        isUsed: true,
      }),
    ];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(9),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.REGRESSION, // Auto-transitioned
        branch: 'test-ko-m-6-all-tasks-completed',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: completedDate,
        cronJob: createCronJob(releaseId, Phase.REGRESSION, { stage1: 'COMPLETED', stage2: 'PENDING' }),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: stagingBuilds,
      builds: [],
    };
  },
  
  // ============================================================================
  // KICKOFF STAGE - CI/CD MODE (4 test cases)
  // ============================================================================
  
  'KO-C-1': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -1);
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.PENDING, { createdAt: kickoffDate }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.PENDING, { createdAt: kickoffDate }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.PENDING, { createdAt: kickoffDate }),
      // All tasks pending - no builds created yet
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.PENDING, { 
        createdAt: kickoffDate,
      }),
    ];
    
    // No builds created yet (all tasks pending)
    const builds = [];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(10),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.KICKOFF,
        branch: 'test-ko-c-1-all-tasks-pending',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: false, // CI/CD mode
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: kickoffDate,
        cronJob: createCronJob(releaseId, Phase.KICKOFF),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: [],
      builds: builds,
    };
  },
  
  'KO-C-2': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -1);
    const buildTaskDate = addHours(kickoffDate, 2);
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      // CI/CD build task: In progress (CI/CD is running)
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.IN_PROGRESS, { 
        createdAt: buildTaskDate,
        startedAt: buildTaskDate,
      }),
    ];
    
    const builds = [
      createBuild(releaseId, Platform.ANDROID, {
        createdAt: buildTaskDate,
        workflowStatus: 'RUNNING',
        buildUploadStatus: 'PENDING',
        buildStage: 'KICK_OFF',
      }),
      createBuild(releaseId, Platform.IOS, {
        createdAt: buildTaskDate,
        workflowStatus: 'RUNNING',
        buildUploadStatus: 'PENDING',
        buildStage: 'KICK_OFF',
      }),
    ];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(11),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.KICKOFF,
        branch: 'test-ko-c-2-build-task-in-progress',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: false,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: buildTaskDate,
        cronJob: createCronJob(releaseId, Phase.KICKOFF),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: [],
      builds: builds,
    };
  },
  
  'KO-C-3': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -1);
    const taskDate = addHours(kickoffDate, 2);
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.FAILED, { 
        createdAt: taskDate,
        updatedAt: addHours(taskDate, 1),
        externalData: { error: 'CI/CD build failed' },
      }),
    ];
    
    const builds = [
      createBuild(releaseId, Platform.ANDROID, {
        createdAt: taskDate,
        workflowStatus: 'FAILED',
        buildUploadStatus: 'FAILED',
        buildStage: 'KICK_OFF',
      }),
    ];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(12),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.KICKOFF,
        branch: 'test-ko-c-3-build-task-failed',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: false,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: addHours(taskDate, 1),
        cronJob: createCronJob(releaseId, Phase.KICKOFF),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: [],
      builds: builds,
    };
  },
  
  'KO-C-4': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -2);
    const completedDate = addHours(kickoffDate, 5);
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 2) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 3) }),
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: completedDate }),
    ];
    
    const builds = [
      createBuild(releaseId, Platform.ANDROID, {
        createdAt: addHours(kickoffDate, 4),
        workflowStatus: 'COMPLETED',
        buildUploadStatus: 'COMPLETED',
        buildStage: 'KICK_OFF',
      }),
      createBuild(releaseId, Platform.IOS, {
        createdAt: addHours(kickoffDate, 4),
        workflowStatus: 'COMPLETED',
        buildUploadStatus: 'COMPLETED',
        buildStage: 'KICK_OFF',
      }),
    ];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(13),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.REGRESSION,
        branch: 'test-ko-c-4-all-tasks-completed',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: false,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: completedDate,
        cronJob: createCronJob(releaseId, Phase.REGRESSION, { stage1: 'COMPLETED', stage2: 'PENDING' }),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: [],
      builds: builds,
    };
  },
  
  // ============================================================================
  // KICKOFF STAGE - PLATFORM VARIATIONS (3 test cases)
  // ============================================================================
  
  'KO-P-1': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -1);
    const taskDate = addHours(kickoffDate, 2);
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.AWAITING_MANUAL_BUILD, { createdAt: taskDate }),
    ];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(14),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.KICKOFF,
        branch: 'test-ko-p-1-android-only',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID]), // Android only
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: taskDate,
        cronJob: createCronJob(releaseId, Phase.KICKOFF),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: [],
      builds: [],
    };
  },
  
  'KO-P-2': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -1);
    const taskDate = addHours(kickoffDate, 2);
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.AWAITING_MANUAL_BUILD, { createdAt: taskDate }),
    ];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(15),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.KICKOFF,
        branch: 'test-ko-p-2-ios-only',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.IOS]), // iOS only
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: taskDate,
        cronJob: createCronJob(releaseId, Phase.KICKOFF),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: [],
      builds: [],
    };
  },
  
  'KO-P-3': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -1);
    const taskDate = addHours(kickoffDate, 2);
    const tasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.AWAITING_MANUAL_BUILD, { createdAt: taskDate }),
    ];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(16),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.KICKOFF,
        branch: 'test-ko-p-3-both-platforms',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]), // Both platforms
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: taskDate,
        cronJob: createCronJob(releaseId, Phase.KICKOFF),
        tasks: tasks,
      },
      cycles: [],
      stagingBuilds: [],
      builds: [],
    };
  },
  
  // ============================================================================
  // REGRESSION STAGE - MANUAL MODE (16 test cases)
  // ============================================================================
  // Note: Regression test cases are complex and require cycles, tasks, and builds.
  // I'll add key representative cases here. For a complete implementation,
  // all 16 REG-M cases should be added following the same pattern.
  
  'REG-M-1': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -5);
    const completedDate = addHours(kickoffDate, 5);
    const upcomingSlotDate = addDays(BASE_DATE, 2);
    
    // Kickoff tasks completed
    const kickoffTasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: completedDate }),
    ];
    
    const cronJob = createCronJob(releaseId, Phase.REGRESSION, { stage1: 'COMPLETED', stage2: 'PENDING' });
    cronJob.upcomingRegressions = [{ date: upcomingSlotDate, config: {} }];
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(17),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.REGRESSION,
        branch: 'test-reg-m-1-first-slot-upcoming',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: completedDate,
        cronJob: cronJob,
        tasks: kickoffTasks,
      },
      cycles: [], // No cycles yet - first slot upcoming
      stagingBuilds: [], // No builds uploaded yet
      builds: [],
    };
  },
  
  'REG-M-2': () => {
    const releaseId = generateUUID();
    const kickoffDate = addDays(BASE_DATE, -5);
    const completedDate = addHours(kickoffDate, 5);
    const cycleDate = addDays(BASE_DATE, 1);
    const buildUploadDate = addHours(cycleDate, 1);
    const buildConsumedDate = addHours(cycleDate, 2);
    
    const kickoffTasks = [
      createTask(releaseId, TaskType.FORK_BRANCH, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.CREATE_TEST_SUITE, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: addHours(kickoffDate, 1) }),
      createTask(releaseId, TaskType.TRIGGER_PRE_REGRESSION_BUILDS, TaskStage.KICKOFF, TaskStatus.COMPLETED, { createdAt: kickoffDate, updatedAt: completedDate }),
    ];
    
    const cycle1 = createCycle(releaseId, RegressionCycleStatus.IN_PROGRESS, 'rc-1.0.0-cycle1', {
      slotIndex: 1,
      slotDateTime: cycleDate,
      createdAt: cycleDate,
    });
    
    // Create regression build task - it should be COMPLETED because builds were uploaded and consumed
    const triggerRegressionBuildsTask = createTask(releaseId, TaskType.TRIGGER_REGRESSION_BUILDS, TaskStage.REGRESSION, TaskStatus.COMPLETED, { 
      createdAt: cycleDate,
      startedAt: buildConsumedDate,
      completedAt: addHours(buildConsumedDate, 1),
      regressionId: cycle1.id,
    });
    
    const regressionTasks = [
      createTask(releaseId, TaskType.RESET_TEST_SUITE, TaskStage.REGRESSION, TaskStatus.COMPLETED, { 
        createdAt: cycleDate, 
        updatedAt: addHours(cycleDate, 1),
        regressionId: cycle1.id,
      }),
      createTask(releaseId, TaskType.CREATE_RC_TAG, TaskStage.REGRESSION, TaskStatus.COMPLETED, { 
        createdAt: cycleDate, 
        updatedAt: addHours(cycleDate, 1),
        regressionId: cycle1.id,
      }),
      createTask(releaseId, TaskType.CREATE_RELEASE_NOTES, TaskStage.REGRESSION, TaskStatus.COMPLETED, { 
        createdAt: cycleDate, 
        updatedAt: addHours(cycleDate, 1),
        regressionId: cycle1.id,
      }),
      triggerRegressionBuildsTask,
    ];
    
    // Builds were uploaded and consumed - they should be in builds table with taskId set
    const regressionBuilds = [
      createBuild(releaseId, Platform.ANDROID, {
        createdAt: buildUploadDate,
        buildType: 'MANUAL',
        buildStage: 'REGRESSION',
        buildUploadStatus: 'UPLOADED',
        taskId: triggerRegressionBuildsTask.id,
        artifactPath: `s3://bucket/releases/${releaseId}/ANDROID/regression-build.apk`,
        regressionId: cycle1.id,
      }),
      createBuild(releaseId, Platform.IOS, {
        createdAt: buildUploadDate,
        buildType: 'MANUAL',
        buildStage: 'REGRESSION',
        buildUploadStatus: 'UPLOADED',
        taskId: triggerRegressionBuildsTask.id,
        artifactPath: `s3://bucket/releases/${releaseId}/IOS/regression-build.ipa`,
        regressionId: cycle1.id,
      }),
    ];
    
    const cronJob = createCronJob(releaseId, Phase.REGRESSION, { stage1: 'COMPLETED', stage2: 'IN_PROGRESS' });
    cronJob.upcomingRegressions = null; // No upcoming slots
    
    return {
      release: {
        id: releaseId,
        releaseId: generateReleaseId(18),
        releaseConfigId: RELEASE_CONFIG_ID,
        tenantId: TENANT_ID,
        type: 'PLANNED',
        status: ReleaseStatus.IN_PROGRESS,
        releasePhase: Phase.REGRESSION,
        branch: 'test-reg-m-2-first-slot-active',
        baseBranch: 'main',
        baseReleaseId: null,
        platformTargetMappings: createPlatformMappings(releaseId, [Platform.ANDROID, Platform.IOS]),
        kickOffReminderDate: addDays(kickoffDate, -1),
        kickOffDate: kickoffDate,
        targetReleaseDate: addDays(kickoffDate, 20),
        releaseDate: null,
        hasManualBuildUpload: true,
        customIntegrationConfigs: null,
        preCreatedBuilds: null,
        createdByAccountId: ACCOUNT_ID,
        releasePilotAccountId: ACCOUNT_ID,
        lastUpdatedByAccountId: ACCOUNT_ID,
        createdAt: addDays(kickoffDate, -5),
        updatedAt: addHours(buildConsumedDate, 1),
        cronJob: cronJob,
        tasks: [...kickoffTasks, ...regressionTasks],
      },
      cycles: [cycle1],
      stagingBuilds: [], // No staging builds - they were consumed
      builds: regressionBuilds, // Builds are in builds table
    };
  },
  
  // Continue with remaining REG-M cases (REG-M-3 through REG-M-16) and other stages...
  // For brevity, I'm adding key representative cases. All 53 cases should follow this pattern.
};

// Export for use in separate file
export {
  testCases,
  generateUUID,
  generateReleaseId,
  addDays,
  addHours,
  createTask,
  createCycle,
  createStagingBuild,
  createBuild,
  createPlatformMappings,
  createCronJob,
  TENANT_ID,
  ACCOUNT_ID,
  RELEASE_CONFIG_ID,
  BASE_DATE,
  TaskType,
  TaskStatus,
  TaskStage,
  Phase,
  ReleaseStatus,
  RegressionCycleStatus,
  Platform,
};

// Main execution (if run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Generating test releases...\n');
  
  // Read existing db.json
  const dbPath = path.join(__dirname, '../mock-server/data/db.json');
  let existingData = { releases: [], releaseTasks: [], regressionCycles: [], buildUploadsStaging: [], builds: [] };
  
  try {
    if (fs.existsSync(dbPath)) {
      existingData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      console.log(`📖 Read existing data: ${existingData.releases?.length || 0} releases`);
    }
  } catch (error) {
    console.log(`⚠️  Could not read existing db.json: ${error.message}`);
    console.log('📝 Will create new file...\n');
  }
  
  // Generate only first 18 test cases
  const FIRST_18_TEST_CASES = [
    'PRE-1', 'PRE-2', 'PRE-3',
    'KO-M-1', 'KO-M-2', 'KO-M-3', 'KO-M-4', 'KO-M-5', 'KO-M-6',
    'KO-C-1', 'KO-C-2', 'KO-C-3', 'KO-C-4',
    'KO-P-1', 'KO-P-2', 'KO-P-3',
    'REG-M-1', 'REG-M-2',
  ];
  
  const testData = {
    releases: [],
    tasks: [],
    regressionCycles: [],
    buildUploadsStaging: [],
    builds: [],
  };
  
  // Filter to only first 18 test cases
  const testCaseIds = Object.keys(testCases)
    .filter(id => FIRST_18_TEST_CASES.includes(id))
    .sort((a, b) => FIRST_18_TEST_CASES.indexOf(a) - FIRST_18_TEST_CASES.indexOf(b));
  
  console.log(`📋 Generating first 18 test cases only...\n`);
  console.log(`📋 Test cases: ${testCaseIds.join(', ')}\n`);
  
  testCaseIds.forEach((testId, index) => {
    try {
      const testCase = testCases[testId]();
      testData.releases.push(testCase.release);
      
      // Tasks are already in testCase.release.tasks, but we also need them in releaseTasks array
      // The mock server looks for tasks in the releaseTasks collection, not in release.tasks
      if (testCase.release.tasks && Array.isArray(testCase.release.tasks)) {
        // Ensure each task has the correct releaseId (UUID) for lookup
        const tasksWithReleaseId = testCase.release.tasks.map(task => ({
          ...task,
          releaseId: testCase.release.id, // Use UUID, not user-facing releaseId
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
  
  // Replace all existing data with only the first 18 test cases
  const mergedData = {
    ...existingData,
    releases: testData.releases, // Replace, don't merge
    releaseTasks: testData.tasks, // Replace, don't merge
    regressionCycles: testData.regressionCycles, // Replace, don't merge
    buildUploadsStaging: testData.buildUploadsStaging, // Replace, don't merge
    builds: testData.builds, // Replace, don't merge
  };
  
  // Write back to file
  try {
    fs.writeFileSync(dbPath, JSON.stringify(mergedData, null, 2));
    console.log(`\n📝 Updated: ${dbPath}`);
    console.log(`\n✨ Total releases in db.json: ${mergedData.releases.length}`);
    
    console.log(`\n✅ Generated first 18 test cases only (as requested)`);
    console.log(`   Test cases: ${testCaseIds.join(', ')}`);
  } catch (error) {
    console.error(`\n❌ Error writing to db.json: ${error.message}`);
    process.exit(1);
  }
}
