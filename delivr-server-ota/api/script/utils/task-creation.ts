/**
 * Task Creation Utilities
 * 
 * Creates tasks for each stage based on release configuration
 */

import { v4 as uuidv4 } from 'uuid';
import { ReleaseTaskRepository } from '../models/release/release-task.repository';
import type { CreateReleaseTaskDto } from '../models/release/release.interface';
import { TaskType, TaskStage, TaskIdentifier } from '../models/release/release.interface';

export interface CreateStage1TasksOptions {
  releaseId: string;
  accountId: string;
  cronConfig: {
    kickOffReminder?: boolean;
    preRegressionBuilds?: boolean;
  };
  hasProjectManagementIntegration?: boolean;
  hasTestPlatformIntegration?: boolean;
}

export interface CreateStage2TasksOptions {
  releaseId: string;
  regressionId: string;
  accountId: string;
  cronConfig: {
    automationBuilds?: boolean;
    automationRuns?: boolean;
  };
  hasTestPlatformIntegration?: boolean;
  isFirstCycle?: boolean; // If true, skip RESET_TEST_SUITE (only for subsequent cycles)
}

/**
 * Create Stage 1 (Kickoff) tasks
 * 
 * Tasks (4 tasks):
 * 1. FORK_BRANCH (always required)
 * 2. CREATE_PROJECT_MANAGEMENT_TICKET (only if project management integrated)
 * 3. CREATE_TEST_SUITE (only if test platform integrated)
 * 4. TRIGGER_PRE_REGRESSION_BUILDS (optional - if cronConfig.preRegressionBuilds == true)
 * The kickOffReminder config is preserved for future notification service.
 */
export async function createStage1Tasks(
  releaseTaskRepo: ReleaseTaskRepository,
  options: CreateStage1TasksOptions
): Promise<string[]> {
  const { releaseId, accountId, cronConfig, hasProjectManagementIntegration, hasTestPlatformIntegration } = options;
  const tasksToCreate: CreateReleaseTaskDto[] = [];

  // The cronConfig.kickOffReminder boolean is preserved for future use

  // 1. FORK_BRANCH (always required)
  tasksToCreate.push({
    id: uuidv4(),
    releaseId,
    taskType: TaskType.FORK_BRANCH,
    stage: TaskStage.KICKOFF,
    accountId,
    isReleaseKickOffTask: true,
    identifier: TaskIdentifier.PRE_REGRESSION,
    taskId: `fork-branch-${releaseId}-${uuidv4()}`
  });

  // 2. CREATE_PROJECT_MANAGEMENT_TICKET (only if project management integrated)
  if (hasProjectManagementIntegration === true) {
    tasksToCreate.push({
      id: uuidv4(),
      releaseId,
      taskType: TaskType.CREATE_PROJECT_MANAGEMENT_TICKET,
      stage: TaskStage.KICKOFF,
      accountId,
      isReleaseKickOffTask: true,
      identifier: TaskIdentifier.PRE_REGRESSION,
      taskId: `create-project-management-ticket-${releaseId}-${uuidv4()}`
    });
  }

  // 3. CREATE_TEST_SUITE (only if test platform integrated)
  if (hasTestPlatformIntegration === true) {
    tasksToCreate.push({
      id: uuidv4(),
      releaseId,
      taskType: TaskType.CREATE_TEST_SUITE,
      stage: TaskStage.KICKOFF,
      accountId,
      isReleaseKickOffTask: true,
      identifier: TaskIdentifier.PRE_REGRESSION,
      taskId: `create-test-suite-${releaseId}-${uuidv4()}`
    });
  }

  // 4. TRIGGER_PRE_REGRESSION_BUILDS (optional)
  if (cronConfig.preRegressionBuilds === true) {
    tasksToCreate.push({
      id: uuidv4(),
      releaseId,
      taskType: TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
      stage: TaskStage.KICKOFF,
      accountId,
      isReleaseKickOffTask: true,
      identifier: TaskIdentifier.PRE_REGRESSION,
      taskId: `trigger-pre-regression-builds-${releaseId}-${uuidv4()}`
    });
  }

  // Bulk create tasks for efficiency
  const createdTasks = await releaseTaskRepo.bulkCreate(tasksToCreate);
  return createdTasks.map(t => t.id);
}

/**
 * Create Stage 2 (Regression) tasks for a regression cycle
 * 
 * Tasks (6 tasks):
 * 1. RESET_TEST_SUITE (only for subsequent cycles - if isFirstCycle === false)
 * 2. CREATE_RC_TAG (always required)
 * 3. CREATE_RELEASE_NOTES (always required)
 * 4. TRIGGER_REGRESSION_BUILDS (always required)
 * 5. TRIGGER_AUTOMATION_RUNS (optional - if cronConfig.automationBuilds === true)
 * 6. AUTOMATION_RUNS (optional - if cronConfig.automationRuns === true)
 */
export async function createStage2Tasks(
  releaseTaskRepo: ReleaseTaskRepository,
  options: CreateStage2TasksOptions
): Promise<string[]> {
  const { releaseId, regressionId, accountId, cronConfig, hasTestPlatformIntegration, isFirstCycle } = options;
  const tasksToCreate: CreateReleaseTaskDto[] = [];

  // 1. RESET_TEST_SUITE (only for subsequent cycles)
  if (isFirstCycle === false && hasTestPlatformIntegration === true) {
    tasksToCreate.push({
      id: uuidv4(),
      releaseId,
      regressionId,
      taskType: TaskType.RESET_TEST_SUITE,
      stage: TaskStage.REGRESSION,
      accountId,
      isRegressionSubTasks: true,
      identifier: TaskIdentifier.REGRESSION,
      taskId: `reset-test-suite-${regressionId}-${uuidv4()}`
    });
  }

  // 2. CREATE_RC_TAG (always required)
  tasksToCreate.push({
    id: uuidv4(),
    releaseId,
    regressionId,
    taskType: TaskType.CREATE_RC_TAG,
    stage: TaskStage.REGRESSION,
    accountId,
    isRegressionSubTasks: true,
    identifier: TaskIdentifier.REGRESSION,
    taskId: `create-rc-tag-${regressionId}-${uuidv4()}`
  });

  // 3. CREATE_RELEASE_NOTES (always required)
  tasksToCreate.push({
    id: uuidv4(),
    releaseId,
    regressionId,
    taskType: TaskType.CREATE_RELEASE_NOTES,
    stage: TaskStage.REGRESSION,
    accountId,
    isRegressionSubTasks: true,
    identifier: TaskIdentifier.REGRESSION,
    taskId: `create-release-notes-${regressionId}-${uuidv4()}`
  });

  // 4. TRIGGER_REGRESSION_BUILDS (always required)
  tasksToCreate.push({
    id: uuidv4(),
    releaseId,
    regressionId,
    taskType: TaskType.TRIGGER_REGRESSION_BUILDS,
    stage: TaskStage.REGRESSION,
    accountId,
    isRegressionSubTasks: true,
    identifier: TaskIdentifier.REGRESSION,
    taskId: `trigger-regression-builds-${regressionId}-${uuidv4()}`
  });

  // 5. TRIGGER_AUTOMATION_RUNS (optional)
  if (cronConfig.automationBuilds === true) {
    tasksToCreate.push({
      id: uuidv4(),
      releaseId,
      regressionId,
      taskType: TaskType.TRIGGER_AUTOMATION_RUNS,
      stage: TaskStage.REGRESSION,
      accountId,
      isRegressionSubTasks: true,
      identifier: TaskIdentifier.REGRESSION,
      taskId: `trigger-automation-runs-${regressionId}-${uuidv4()}`
    });
  }

  // 6. AUTOMATION_RUNS (optional)
  if (cronConfig.automationRuns === true) {
    tasksToCreate.push({
      id: uuidv4(),
      releaseId,
      regressionId,
      taskType: TaskType.AUTOMATION_RUNS,
      stage: TaskStage.REGRESSION,
      accountId,
      isRegressionSubTasks: true,
      identifier: TaskIdentifier.REGRESSION,
      taskId: `automation-runs-${regressionId}-${uuidv4()}`
    });
  }


  // Bulk create tasks for efficiency
  const createdTasks = await releaseTaskRepo.bulkCreate(tasksToCreate);
  return createdTasks.map(t => t.id);
}

export interface CreateStage3TasksOptions {
  releaseId: string;
  accountId: string;
  cronConfig?: {
    testFlightBuilds?: boolean;
    aabBuilds?: boolean;
  };
  hasProjectManagementIntegration?: boolean;
  hasIOSPlatform?: boolean; // If true, include TRIGGER_TEST_FLIGHT_BUILD task
  hasAndroidPlatform?: boolean; // If true, include CREATE_AAB_BUILD task
}

/**
 * Create Stage 3 (Pre-Release) tasks
 * 
 * Tasks (4 tasks max):
 * 1. CREATE_RELEASE_TAG (always required)
 * 2. CREATE_FINAL_RELEASE_NOTES (always required)
 * 3. TRIGGER_TEST_FLIGHT_BUILD (if hasIOSPlatform === true)
 * 4. CREATE_AAB_BUILD (if hasAndroidPlatform === true)
 * Platform tasks are NOT optional - if platform exists, task is created
 */
export async function createStage3Tasks(
  releaseTaskRepo: ReleaseTaskRepository,
  options: CreateStage3TasksOptions
): Promise<string[]> {
  const { releaseId, accountId, hasIOSPlatform, hasAndroidPlatform } = options;
  
  // Check if tasks already exist at the start (race condition prevention)
  const existingTasksAtStart = await releaseTaskRepo.findByReleaseIdAndStage(releaseId, TaskStage.PRE_RELEASE);
  const existingTaskTypes = existingTasksAtStart.map(t => t.taskType);
  
  // Required base task types (always present)
  const requiredBaseTypes = [
    TaskType.CREATE_RELEASE_TAG,
    TaskType.CREATE_FINAL_RELEASE_NOTES
  ];
  
  // Check if all required base tasks exist
  const hasAllBaseTasks = requiredBaseTypes.every(type => existingTaskTypes.includes(type));
  
  if (hasAllBaseTasks) {
    // All base tasks exist - return empty array to indicate no new tasks were created
    return [];
  }
  
  const tasksToCreate: CreateReleaseTaskDto[] = [];


  // 1. CREATE_RELEASE_TAG (always required)
  tasksToCreate.push({
    id: uuidv4(),
    releaseId,
    taskType: TaskType.CREATE_RELEASE_TAG,
    stage: TaskStage.PRE_RELEASE,
    accountId,
    taskId: `create-release-tag-${releaseId}-${uuidv4()}`
  });

  // 2. CREATE_FINAL_RELEASE_NOTES (always required)
  tasksToCreate.push({
    id: uuidv4(),
    releaseId,
    taskType: TaskType.CREATE_FINAL_RELEASE_NOTES,
    stage: TaskStage.PRE_RELEASE,
    accountId,
    taskId: `create-final-release-notes-${releaseId}-${uuidv4()}`
  });

  // 3. TRIGGER_TEST_FLIGHT_BUILD (if iOS platform exists - NOT optional based on cronConfig)
  if (hasIOSPlatform === true) {
    tasksToCreate.push({
      id: uuidv4(),
      releaseId,
      taskType: TaskType.TRIGGER_TEST_FLIGHT_BUILD,
      stage: TaskStage.PRE_RELEASE,
      accountId,
      taskId: `test-flight-build-${releaseId}-${uuidv4()}`
    });
  }

  // 4. CREATE_AAB_BUILD (if Android platform exists - NOT optional based on cronConfig)
  if (hasAndroidPlatform === true) {
    tasksToCreate.push({
      id: uuidv4(),
      releaseId,
      taskType: TaskType.CREATE_AAB_BUILD,
      stage: TaskStage.PRE_RELEASE,
      accountId,
      taskId: `create-aab-build-${releaseId}-${uuidv4()}`
    });
  }

  // Bulk create tasks for efficiency
  const createdTasks = await releaseTaskRepo.bulkCreate(tasksToCreate);
  return createdTasks.map(t => t.id);
}

