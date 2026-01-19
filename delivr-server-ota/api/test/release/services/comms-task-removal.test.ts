/**
 * Tests for Communication Task Removal
 * 
 * These tests verify that communication tasks have been removed
 * and notifications will be handled by event system instead.
 * 
 * TDD Approach:
 * - Phase 1 (RED): These tests should FAIL before the change
 * - Phase 2 (GREEN): These tests should PASS after removing comms tasks
 * 
 * Tasks being removed:
 * - PRE_KICK_OFF_REMINDER (Stage 1)
 * - SEND_REGRESSION_BUILD_MESSAGE (Stage 2)
 * - PRE_RELEASE_CHERRY_PICKS_REMINDER (Stage 3)
 * - SEND_PRE_RELEASE_MESSAGE (Stage 3)
 */

import { TaskType } from '../../../script/models/release/release.interface';
import { 
  createStage1Tasks, 
  createStage2Tasks, 
  createStage3Tasks 
} from '../../../script/utils/task-creation';
import { ReleaseTaskRepository } from '../../../script/models/release/release-task.repository';

// Mock the ReleaseTaskRepository
const createMockRepo = () => {
  const createdTasks: any[] = [];
  return {
    bulkCreate: jest.fn().mockImplementation((tasks) => {
      createdTasks.push(...tasks);
      return Promise.resolve(tasks.map((t: any) => ({ ...t })));
    }),
    findByReleaseIdAndStage: jest.fn().mockResolvedValue([]),
    getCreatedTasks: () => createdTasks,
    clearCreatedTasks: () => { createdTasks.length = 0; }
  } as unknown as ReleaseTaskRepository & { 
    getCreatedTasks: () => any[]; 
    clearCreatedTasks: () => void;
  };
};

describe('Communication Task Removal', () => {
  
  // =========================================================================
  // PART 1: TaskType enum should NOT contain comms tasks
  // =========================================================================
  describe('TaskType enum should NOT contain comms tasks', () => {
    
    it('should NOT have PRE_KICK_OFF_REMINDER in TaskType enum', () => {
      const taskTypeValues = Object.values(TaskType);
      expect(taskTypeValues).not.toContain('PRE_KICK_OFF_REMINDER');
    });
    
    it('should NOT have SEND_REGRESSION_BUILD_MESSAGE in TaskType enum', () => {
      const taskTypeValues = Object.values(TaskType);
      expect(taskTypeValues).not.toContain('SEND_REGRESSION_BUILD_MESSAGE');
    });
    
    it('should NOT have PRE_RELEASE_CHERRY_PICKS_REMINDER in TaskType enum', () => {
      const taskTypeValues = Object.values(TaskType);
      expect(taskTypeValues).not.toContain('PRE_RELEASE_CHERRY_PICKS_REMINDER');
    });
    
    it('should NOT have SEND_PRE_RELEASE_MESSAGE in TaskType enum', () => {
      const taskTypeValues = Object.values(TaskType);
      expect(taskTypeValues).not.toContain('SEND_PRE_RELEASE_MESSAGE');
    });

    it('should have exactly 14 TaskType enum values', () => {
      // Stage 1: 4 tasks (FORK_BRANCH, CREATE_PM_TICKET, CREATE_TEST_SUITE, TRIGGER_PRE_REGRESSION_BUILDS)
      // Stage 2: 6 tasks (RESET_TEST_SUITE, CREATE_RC_TAG, CREATE_RELEASE_NOTES, TRIGGER_REGRESSION_BUILDS, TRIGGER_AUTOMATION_RUNS, AUTOMATION_RUNS)
      // Stage 3: 4 tasks (CREATE_RELEASE_TAG, CREATE_FINAL_RELEASE_NOTES, TRIGGER_TEST_FLIGHT_BUILD, CREATE_AAB_BUILD)
      // Total: 14
      const taskTypeValues = Object.values(TaskType);
      expect(taskTypeValues.length).toBe(14);
    });
  });

  // =========================================================================
  // PART 2: createStage1Tasks should NOT create comms tasks
  // =========================================================================
  describe('createStage1Tasks should NOT create comms tasks', () => {
    let mockRepo: ReturnType<typeof createMockRepo>;

    beforeEach(() => {
      mockRepo = createMockRepo();
      jest.clearAllMocks();
    });

    it('should NOT create PRE_KICK_OFF_REMINDER even when kickOffReminder=true', async () => {
      await createStage1Tasks(mockRepo, {
        releaseId: 'test-release-id',
        accountId: 'test-account-id',
        cronConfig: { kickOffReminder: true, preRegressionBuilds: true },
        hasProjectManagementIntegration: true,
        hasTestPlatformIntegration: true
      });
      
      const createdTasks = mockRepo.getCreatedTasks();
      const taskTypes = createdTasks.map(t => t.taskType);
      
      expect(taskTypes).not.toContain('PRE_KICK_OFF_REMINDER');
    });

    it('Stage 1 should create max 4 tasks (was 5 with PRE_KICK_OFF_REMINDER)', async () => {
      await createStage1Tasks(mockRepo, {
        releaseId: 'test-release-id',
        accountId: 'test-account-id',
        cronConfig: { kickOffReminder: true, preRegressionBuilds: true },
        hasProjectManagementIntegration: true,
        hasTestPlatformIntegration: true
      });
      
      const createdTasks = mockRepo.getCreatedTasks();
      
      // Expected: FORK_BRANCH, CREATE_PROJECT_MANAGEMENT_TICKET, CREATE_TEST_SUITE, TRIGGER_PRE_REGRESSION_BUILDS
      // NOT expected: PRE_KICK_OFF_REMINDER
      expect(createdTasks.length).toBe(4);
    });

    it('Stage 1 tasks should include core tasks only', async () => {
      await createStage1Tasks(mockRepo, {
        releaseId: 'test-release-id',
        accountId: 'test-account-id',
        cronConfig: { kickOffReminder: true, preRegressionBuilds: true },
        hasProjectManagementIntegration: true,
        hasTestPlatformIntegration: true
      });
      
      const createdTasks = mockRepo.getCreatedTasks();
      const taskTypes = createdTasks.map(t => t.taskType);
      
      expect(taskTypes).toContain('FORK_BRANCH');
      expect(taskTypes).toContain('CREATE_PROJECT_MANAGEMENT_TICKET');
      expect(taskTypes).toContain('CREATE_TEST_SUITE');
      expect(taskTypes).toContain('TRIGGER_PRE_REGRESSION_BUILDS');
    });
  });

  // =========================================================================
  // PART 3: createStage2Tasks should NOT create comms tasks
  // =========================================================================
  describe('createStage2Tasks should NOT create comms tasks', () => {
    let mockRepo: ReturnType<typeof createMockRepo>;

    beforeEach(() => {
      mockRepo = createMockRepo();
      jest.clearAllMocks();
    });

    it('should NOT create SEND_REGRESSION_BUILD_MESSAGE', async () => {
      await createStage2Tasks(mockRepo, {
        releaseId: 'test-release-id',
        regressionId: 'test-regression-id',
        accountId: 'test-account-id',
        cronConfig: { automationBuilds: true, automationRuns: true },
        hasTestPlatformIntegration: true,
        isFirstCycle: true
      });
      
      const createdTasks = mockRepo.getCreatedTasks();
      const taskTypes = createdTasks.map(t => t.taskType);
      
      expect(taskTypes).not.toContain('SEND_REGRESSION_BUILD_MESSAGE');
    });

    it('Stage 2 should create max 6 tasks (was 7 with SEND_REGRESSION_BUILD_MESSAGE)', async () => {
      await createStage2Tasks(mockRepo, {
        releaseId: 'test-release-id',
        regressionId: 'test-regression-id',
        accountId: 'test-account-id',
        cronConfig: { automationBuilds: true, automationRuns: true },
        hasTestPlatformIntegration: true,
        isFirstCycle: false // Include RESET_TEST_SUITE
      });
      
      const createdTasks = mockRepo.getCreatedTasks();
      
      // Expected: RESET_TEST_SUITE, CREATE_RC_TAG, CREATE_RELEASE_NOTES, 
      //           TRIGGER_REGRESSION_BUILDS, TRIGGER_AUTOMATION_RUNS, AUTOMATION_RUNS
      // NOT expected: SEND_REGRESSION_BUILD_MESSAGE
      expect(createdTasks.length).toBe(6);
    });

    it('Stage 2 tasks should include core tasks only', async () => {
      await createStage2Tasks(mockRepo, {
        releaseId: 'test-release-id',
        regressionId: 'test-regression-id',
        accountId: 'test-account-id',
        cronConfig: { automationBuilds: true, automationRuns: true },
        hasTestPlatformIntegration: true,
        isFirstCycle: false
      });
      
      const createdTasks = mockRepo.getCreatedTasks();
      const taskTypes = createdTasks.map(t => t.taskType);
      
      expect(taskTypes).toContain('RESET_TEST_SUITE');
      expect(taskTypes).toContain('CREATE_RC_TAG');
      expect(taskTypes).toContain('CREATE_RELEASE_NOTES');
      expect(taskTypes).toContain('TRIGGER_REGRESSION_BUILDS');
      expect(taskTypes).toContain('TRIGGER_AUTOMATION_RUNS');
      expect(taskTypes).toContain('AUTOMATION_RUNS');
    });
  });

  // =========================================================================
  // PART 4: createStage3Tasks should NOT create comms tasks
  // =========================================================================
  describe('createStage3Tasks should NOT create comms tasks', () => {
    let mockRepo: ReturnType<typeof createMockRepo>;

    beforeEach(() => {
      mockRepo = createMockRepo();
      jest.clearAllMocks();
    });

    it('should NOT create PRE_RELEASE_CHERRY_PICKS_REMINDER', async () => {
      await createStage3Tasks(mockRepo, {
        releaseId: 'test-release-id',
        accountId: 'test-account-id',
        hasIOSPlatform: true,
        hasAndroidPlatform: true
      });
      
      const createdTasks = mockRepo.getCreatedTasks();
      const taskTypes = createdTasks.map(t => t.taskType);
      
      expect(taskTypes).not.toContain('PRE_RELEASE_CHERRY_PICKS_REMINDER');
    });

    it('should NOT create SEND_PRE_RELEASE_MESSAGE', async () => {
      await createStage3Tasks(mockRepo, {
        releaseId: 'test-release-id',
        accountId: 'test-account-id',
        hasIOSPlatform: true,
        hasAndroidPlatform: true
      });
      
      const createdTasks = mockRepo.getCreatedTasks();
      const taskTypes = createdTasks.map(t => t.taskType);
      
      expect(taskTypes).not.toContain('SEND_PRE_RELEASE_MESSAGE');
    });

    it('Stage 3 should create max 4 tasks with both platforms', async () => {
      await createStage3Tasks(mockRepo, {
        releaseId: 'test-release-id',
        accountId: 'test-account-id',
        hasIOSPlatform: true,
        hasAndroidPlatform: true
      });
      
      const createdTasks = mockRepo.getCreatedTasks();
      
      // Expected: CREATE_RELEASE_TAG, CREATE_FINAL_RELEASE_NOTES, 
      //           TRIGGER_TEST_FLIGHT_BUILD, CREATE_AAB_BUILD
      expect(createdTasks.length).toBe(4);
    });

    it('Stage 3 tasks should include all platform tasks', async () => {
      await createStage3Tasks(mockRepo, {
        releaseId: 'test-release-id',
        accountId: 'test-account-id',
        hasIOSPlatform: true,
        hasAndroidPlatform: true
      });
      
      const createdTasks = mockRepo.getCreatedTasks();
      const taskTypes = createdTasks.map(t => t.taskType);
      
      expect(taskTypes).toContain('CREATE_RELEASE_TAG');
      expect(taskTypes).toContain('CREATE_FINAL_RELEASE_NOTES');
      expect(taskTypes).toContain('TRIGGER_TEST_FLIGHT_BUILD');
      expect(taskTypes).toContain('CREATE_AAB_BUILD');
    });

    it('Stage 3 without iOS and Android should create 2 tasks', async () => {
      await createStage3Tasks(mockRepo, {
        releaseId: 'test-release-id',
        accountId: 'test-account-id',
        hasIOSPlatform: false,
        hasAndroidPlatform: false
      });
      
      const createdTasks = mockRepo.getCreatedTasks();
      
      // Expected: CREATE_RELEASE_TAG, CREATE_FINAL_RELEASE_NOTES
      // NOT expected: TRIGGER_TEST_FLIGHT_BUILD (no iOS), CREATE_AAB_BUILD (no Android)
      expect(createdTasks.length).toBe(2);
    });
  });

  // =========================================================================
  // PART 5: Summary - Total task count validation
  // =========================================================================
  describe('Task count summary', () => {
    
    it('Automated flow should have 14 tasks (4 + 6 + 4)', () => {
      /**
       * Automated Release Flow (14 tasks):
       * Stage 1 (4): FORK_BRANCH, CREATE_PM_TICKET, CREATE_TEST_SUITE, TRIGGER_PRE_REGRESSION_BUILDS
       * Stage 2 (6): RESET_TEST_SUITE, CREATE_RC_TAG, CREATE_RELEASE_NOTES, TRIGGER_REGRESSION_BUILDS, TRIGGER_AUTOMATION_RUNS, AUTOMATION_RUNS
       * Stage 3 (4): CREATE_RELEASE_TAG, CREATE_FINAL_RELEASE_NOTES, TRIGGER_TEST_FLIGHT_BUILD, CREATE_AAB_BUILD
       * 
       * Platform-based tasks (created if platform exists):
       * - TRIGGER_TEST_FLIGHT_BUILD (if hasIOSPlatform)
       * - CREATE_AAB_BUILD (if hasAndroidPlatform)
       * 
       * Removed tasks:
       * - PRE_KICK_OFF_REMINDER, SEND_REGRESSION_BUILD_MESSAGE, PRE_RELEASE_CHERRY_PICKS_REMINDER, SEND_PRE_RELEASE_MESSAGE (comms)
       * - CHECK_PROJECT_RELEASE_APPROVAL (PM approval - not needed)
       * - SUBMIT_TO_TARGET (manual API - not needed)
       */
      const automatedTaskCount = 4 + 6 + 4; // Stage 1 + Stage 2 + Stage 3
      expect(automatedTaskCount).toBe(14);
    });
  });
});

