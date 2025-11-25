/**
 * Task Creation Utilities
 * 
 * Creates tasks for each stage based on release configuration
 */

import { v4 as uuidv4 } from 'uuid';
import { ReleaseTasksDTO } from '../storage/release/release-tasks-dto';
import { TaskType, TaskStage, TaskIdentifier } from '../storage/release/release-models';

export interface CreateStage1TasksOptions {
  releaseId: string;
  accountId: string;
  cronConfig: {
    kickOffReminder?: boolean;
    preRegressionBuilds?: boolean;
  };
  hasJiraIntegration?: boolean;
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
 * Tasks:
 * 1. PRE_KICK_OFF_REMINDER (optional - if cronConfig.kickOffReminder == true)
 * 2. FORK_BRANCH (always required)
 * 3. CREATE_PROJECT_MANAGEMENT_TICKET (only if project management integrated)
 * 4. CREATE_TEST_SUITE (only if test platform integrated)
 * 5. TRIGGER_PRE_REGRESSION_BUILDS (optional - if cronConfig.preRegressionBuilds == true)
 */
export async function createStage1Tasks(
  releaseTasksDTO: ReleaseTasksDTO,
  options: CreateStage1TasksOptions
): Promise<string[]> {
  const { releaseId, accountId, cronConfig, hasJiraIntegration, hasTestPlatformIntegration } = options;
  const createdTaskIds: string[] = [];

  // 1. PRE_KICK_OFF_REMINDER (optional)
  if (cronConfig.kickOffReminder === true) {
    const task = await releaseTasksDTO.create({
      releaseId,
      taskType: TaskType.PRE_KICK_OFF_REMINDER,
      stage: TaskStage.KICKOFF,
      accountId,
      isReleaseKickOffTask: true,
      identifier: TaskIdentifier.PRE_REGRESSION,
      taskId: `pre-kickoff-reminder-${releaseId}-${uuidv4()}`
    });
    createdTaskIds.push(task.id);
  }

  // 2. FORK_BRANCH (always required)
  const forkBranchTask = await releaseTasksDTO.create({
    releaseId,
    taskType: TaskType.FORK_BRANCH,
    stage: TaskStage.KICKOFF,
    accountId,
    isReleaseKickOffTask: true,
    identifier: TaskIdentifier.PRE_REGRESSION,
    taskId: `fork-branch-${releaseId}-${uuidv4()}`
  });
  createdTaskIds.push(forkBranchTask.id);

  // 3. CREATE_PROJECT_MANAGEMENT_TICKET (only if project management integrated)
  if (hasJiraIntegration === true) {
    const task = await releaseTasksDTO.create({
      releaseId,
      taskType: TaskType.CREATE_PROJECT_MANAGEMENT_TICKET,
      stage: TaskStage.KICKOFF,
      accountId,
      isReleaseKickOffTask: true,
      identifier: TaskIdentifier.PRE_REGRESSION,
      taskId: `create-project-management-ticket-${releaseId}-${uuidv4()}`
    });
    createdTaskIds.push(task.id);
  }

  // 4. CREATE_TEST_SUITE (only if test platform integrated)
  if (hasTestPlatformIntegration === true) {
    const task = await releaseTasksDTO.create({
      releaseId,
      taskType: TaskType.CREATE_TEST_SUITE,
      stage: TaskStage.KICKOFF,
      accountId,
      isReleaseKickOffTask: true,
      identifier: TaskIdentifier.PRE_REGRESSION,
      taskId: `create-test-suite-${releaseId}-${uuidv4()}`
    });
    createdTaskIds.push(task.id);
  }

  // 5. TRIGGER_PRE_REGRESSION_BUILDS (optional)
  if (cronConfig.preRegressionBuilds === true) {
    const task = await releaseTasksDTO.create({
      releaseId,
      taskType: TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
      stage: TaskStage.KICKOFF,
      accountId,
      isReleaseKickOffTask: true,
      identifier: TaskIdentifier.PRE_REGRESSION,
      taskId: `trigger-pre-regression-builds-${releaseId}-${uuidv4()}`
    });
    createdTaskIds.push(task.id);
  }

  return createdTaskIds;
}

/**
 * Create Stage 2 (Regression) tasks for a regression cycle
 * 
 * Tasks (7 tasks):
 * 1. RESET_TEST_SUITE (only for subsequent cycles - if isFirstCycle === false)
 * 2. CREATE_RC_TAG (always required)
 * 3. CREATE_RELEASE_NOTES (always required)
 * 4. TRIGGER_REGRESSION_BUILDS (always required)
 * 5. TRIGGER_AUTOMATION_RUNS (optional - if cronConfig.automationBuilds === true)
 * 6. AUTOMATION_RUNS (optional - if cronConfig.automationRuns === true)
 * 7. SEND_REGRESSION_BUILD_MESSAGE (always required)
 */
export async function createStage2Tasks(
  releaseTasksDTO: ReleaseTasksDTO,
  options: CreateStage2TasksOptions
): Promise<string[]> {
  const { releaseId, regressionId, accountId, cronConfig, hasTestPlatformIntegration, isFirstCycle } = options;
  const createdTaskIds: string[] = [];

  // 1. RESET_TEST_SUITE (only for subsequent cycles)
  if (isFirstCycle === false && hasTestPlatformIntegration === true) {
    const task = await releaseTasksDTO.create({
      releaseId,
      regressionId,
      taskType: TaskType.RESET_TEST_SUITE,
      stage: TaskStage.REGRESSION,
      accountId,
      isRegressionSubTasks: true,
      identifier: TaskIdentifier.REGRESSION,
      taskId: `reset-test-suite-${regressionId}-${uuidv4()}`
    });
    createdTaskIds.push(task.id);
  }

  // 2. CREATE_RC_TAG (always required)
  const createRcTagTask = await releaseTasksDTO.create({
    releaseId,
    regressionId,
    taskType: TaskType.CREATE_RC_TAG,
    stage: TaskStage.REGRESSION,
    accountId,
    isRegressionSubTasks: true,
    identifier: TaskIdentifier.REGRESSION,
    taskId: `create-rc-tag-${regressionId}-${uuidv4()}`
  });
  createdTaskIds.push(createRcTagTask.id);

  // 3. CREATE_RELEASE_NOTES (always required)
  const createReleaseNotesTask = await releaseTasksDTO.create({
    releaseId,
    regressionId,
    taskType: TaskType.CREATE_RELEASE_NOTES,
    stage: TaskStage.REGRESSION,
    accountId,
    isRegressionSubTasks: true,
    identifier: TaskIdentifier.REGRESSION,
    taskId: `create-release-notes-${regressionId}-${uuidv4()}`
  });
  createdTaskIds.push(createReleaseNotesTask.id);

  // 4. TRIGGER_REGRESSION_BUILDS (always required)
  const triggerRegressionBuildsTask = await releaseTasksDTO.create({
    releaseId,
    regressionId,
    taskType: TaskType.TRIGGER_REGRESSION_BUILDS,
    stage: TaskStage.REGRESSION,
    accountId,
    isRegressionSubTasks: true,
    identifier: TaskIdentifier.REGRESSION,
    taskId: `trigger-regression-builds-${regressionId}-${uuidv4()}`
  });
  createdTaskIds.push(triggerRegressionBuildsTask.id);

  // 5. TRIGGER_AUTOMATION_RUNS (optional)
  if (cronConfig.automationBuilds === true) {
    const task = await releaseTasksDTO.create({
      releaseId,
      regressionId,
      taskType: TaskType.TRIGGER_AUTOMATION_RUNS,
      stage: TaskStage.REGRESSION,
      accountId,
      isRegressionSubTasks: true,
      identifier: TaskIdentifier.REGRESSION,
      taskId: `trigger-automation-runs-${regressionId}-${uuidv4()}`
    });
    createdTaskIds.push(task.id);
  }

  // 6. AUTOMATION_RUNS (optional)
  if (cronConfig.automationRuns === true) {
    const task = await releaseTasksDTO.create({
      releaseId,
      regressionId,
      taskType: TaskType.AUTOMATION_RUNS,
      stage: TaskStage.REGRESSION,
      accountId,
      isRegressionSubTasks: true,
      identifier: TaskIdentifier.REGRESSION,
      taskId: `automation-runs-${regressionId}-${uuidv4()}`
    });
    createdTaskIds.push(task.id);
  }

  // 7. SEND_REGRESSION_BUILD_MESSAGE (always required)
  const sendRegressionBuildMessageTask = await releaseTasksDTO.create({
    releaseId,
    regressionId,
    taskType: TaskType.SEND_REGRESSION_BUILD_MESSAGE,
    stage: TaskStage.REGRESSION,
    accountId,
    isRegressionSubTasks: true,
    identifier: TaskIdentifier.REGRESSION,
    taskId: `send-regression-build-message-${regressionId}-${uuidv4()}`
  });
  createdTaskIds.push(sendRegressionBuildMessageTask.id);

  return createdTaskIds;
}

export interface CreateStage3TasksOptions {
  releaseId: string;
  accountId: string;
  cronConfig?: {
    testFlightBuilds?: boolean;
  };
  hasJiraIntegration?: boolean;
  hasIOSPlatform?: boolean; // If true, include TRIGGER_TEST_FLIGHT_BUILD task (also requires cronConfig.testFlightBuilds === true)
}

/**
 * Create Stage 3 (Post-Regression) tasks
 * 
 * Tasks (6 tasks):
 * 1. PRE_RELEASE_CHERRY_PICKS_REMINDER (always required - first task)
 * 2. CREATE_RELEASE_TAG (always required)
 * 3. CREATE_FINAL_RELEASE_NOTES (always required - renamed from CREATE_GITHUB_RELEASE)
 * 4. TRIGGER_TEST_FLIGHT_BUILD (optional - only if hasIOSPlatform === true)
 * 5. SEND_POST_REGRESSION_MESSAGE (always required - 2nd last task)
 * 6. CHECK_PROJECT_RELEASE_APPROVAL (always required - last task, only if hasJiraIntegration === true, renamed from ADD_L6_APPROVAL_CHECK)
 */
export async function createStage3Tasks(
  releaseTasksDTO: ReleaseTasksDTO,
  options: CreateStage3TasksOptions
): Promise<string[]> {
  const { releaseId, accountId, hasJiraIntegration, hasIOSPlatform } = options;
  
  // Check if tasks already exist at the start (race condition prevention)
  // With locks disabled, we have a single instance, but rapid successive calls can still happen
  // Check for specific required base task types, not just count
  const existingTasksAtStart = await releaseTasksDTO.getByReleaseAndStage(releaseId, TaskStage.POST_REGRESSION);
  const existingTaskTypes = existingTasksAtStart.map(t => t.taskType);
  
  // Required base task types (always present)
  const requiredBaseTypes = [
    TaskType.PRE_RELEASE_CHERRY_PICKS_REMINDER,
    TaskType.CREATE_RELEASE_TAG,
    TaskType.CREATE_FINAL_RELEASE_NOTES,
    TaskType.SEND_POST_REGRESSION_MESSAGE
  ];
  
  // Check if all required base tasks exist
  const hasAllBaseTasks = requiredBaseTypes.every(type => existingTaskTypes.includes(type));
  
  if (hasAllBaseTasks) {
    // All base tasks exist - return empty array to indicate no new tasks were created
    return [];
  }
  
  const createdTaskIds: string[] = [];

  // 1. PRE_RELEASE_CHERRY_PICKS_REMINDER (always required - first task)
  const cherryPicksReminderTask = await releaseTasksDTO.create({
    releaseId,
    taskType: TaskType.PRE_RELEASE_CHERRY_PICKS_REMINDER,
    stage: TaskStage.POST_REGRESSION,
    accountId,
    taskId: `pre-release-cherry-picks-reminder-${releaseId}-${uuidv4()}`
  });
  createdTaskIds.push(cherryPicksReminderTask.id);

  // Check again after first task (in case another call started creating tasks)
  const existingTasksAfterFirst = await releaseTasksDTO.getByReleaseAndStage(releaseId, TaskStage.POST_REGRESSION);
  const existingTaskTypesAfterFirst = existingTasksAfterFirst.map(t => t.taskType);
  if (existingTasksAfterFirst.length > createdTaskIds.length) {
    // Check if all required base tasks exist
    const hasAllBaseTasksAfterFirst = requiredBaseTypes.every(type => existingTaskTypesAfterFirst.includes(type));
    if (hasAllBaseTasksAfterFirst) {
      // Another call completed task creation - return what we created so far
      return createdTaskIds;
    }
  }

  // 2. CREATE_RELEASE_TAG (always required)
  const createReleaseTagTask = await releaseTasksDTO.create({
    releaseId,
    taskType: TaskType.CREATE_RELEASE_TAG,
    stage: TaskStage.POST_REGRESSION,
    accountId,
    taskId: `create-release-tag-${releaseId}-${uuidv4()}`
  });
  createdTaskIds.push(createReleaseTagTask.id);

  // 3. CREATE_FINAL_RELEASE_NOTES (always required - renamed from CREATE_GITHUB_RELEASE)
  const createFinalReleaseNotesTask = await releaseTasksDTO.create({
    releaseId,
    taskType: TaskType.CREATE_FINAL_RELEASE_NOTES,
    stage: TaskStage.POST_REGRESSION,
    accountId,
    taskId: `create-final-release-notes-${releaseId}-${uuidv4()}`
  });
  createdTaskIds.push(createFinalReleaseNotesTask.id);

  // 4. TRIGGER_TEST_FLIGHT_BUILD (optional - only if iOS platform exists AND cronConfig.testFlightBuilds === true)
  const cronConfig = options.cronConfig || {};
  const testFlightBuildsEnabled = cronConfig.testFlightBuilds === true;
  
  if (hasIOSPlatform === true && testFlightBuildsEnabled) {
    const testFlightBuildTask = await releaseTasksDTO.create({
      releaseId,
      taskType: TaskType.TRIGGER_TEST_FLIGHT_BUILD,
      stage: TaskStage.POST_REGRESSION,
      accountId,
      taskId: `test-flight-build-${releaseId}-${uuidv4()}`
    });
    createdTaskIds.push(testFlightBuildTask.id);
  }

  // 5. SEND_POST_REGRESSION_MESSAGE (always required - 2nd last task)
  const sendPostRegressionMessageTask = await releaseTasksDTO.create({
    releaseId,
    taskType: TaskType.SEND_POST_REGRESSION_MESSAGE,
    stage: TaskStage.POST_REGRESSION,
    accountId,
    taskId: `send-post-regression-message-${releaseId}-${uuidv4()}`
  });
  createdTaskIds.push(sendPostRegressionMessageTask.id);

  // 6. CHECK_PROJECT_RELEASE_APPROVAL (always required - last task, only if hasJiraIntegration === true, renamed from ADD_L6_APPROVAL_CHECK)
  if (hasJiraIntegration === true) {
    const checkProjectReleaseApprovalTask = await releaseTasksDTO.create({
      releaseId,
      taskType: TaskType.CHECK_PROJECT_RELEASE_APPROVAL,
      stage: TaskStage.POST_REGRESSION,
      accountId,
      taskId: `check-project-release-approval-${releaseId}-${uuidv4()}`
    });
    createdTaskIds.push(checkProjectReleaseApprovalTask.id);
  }

  return createdTaskIds;
}

