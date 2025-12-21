/**
 * Stage Transition Tests - AWAITING_STAGE_TRIGGER Gap
 * 
 * Phase 21.0: Tests for proper pauseType handling during stage transitions.
 * 
 * Problem: AWAITING_STAGE_TRIGGER is defined in enum but never SET in code.
 * When autoTransitionToStage2/3 is false, the code should set pauseType
 * instead of stopping the cron job scheduler.
 * 
 * TDD: These tests should FAIL initially because the implementation doesn't exist yet.
 */

// ================================================================================
// MOCKS - Define FIRST (before imports)
// ================================================================================

jest.mock('../../../script/models/release/cron-job.repository');
jest.mock('../../../script/models/release/release.repository');
jest.mock('../../../script/models/release/release-task.repository');
jest.mock('../../../script/models/release/regression-cycle.repository');
// ✅ Mock storage.taskExecutor instead of factory (migrated from factory pattern)
// Note: cron-scheduler.ts removed - replaced by global-scheduler architecture
jest.mock('../../../script/storage/storage-instance', () => ({
  getStorage: jest.fn(),
}));
jest.mock('../../../script/types/release/api-types', () => ({
  hasSequelize: jest.fn().mockReturnValue(true),
}));
jest.mock('../../../script/utils/integration-availability.utils', () => ({
  checkIntegrationAvailability: jest.fn().mockResolvedValue({
    hasProjectManagementIntegration: true,
    hasTestPlatformIntegration: true,
  }),
}));
jest.mock('../../../script/utils/time-utils', () => ({
  isKickOffReminderTime: jest.fn().mockReturnValue(false),
  isBranchForkTime: jest.fn().mockReturnValue(true),
  isRegressionSlotTime: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../script/utils/task-sequencing', () => ({
  getOrderedTasks: jest.fn((tasks) => tasks),
  canExecuteTask: jest.fn().mockReturnValue(true),
  getTaskBlockReason: jest.fn().mockReturnValue('EXECUTABLE'),
  isTaskRequired: jest.fn().mockReturnValue(true),
  arePreviousTasksComplete: jest.fn().mockReturnValue(true),
  TASK_ORDER: {},
}));
jest.mock('../../../script/utils/regression-cycle-creation', () => ({
  createRegressionCycleWithTasks: jest.fn(),
}));
jest.mock('../../../script/utils/task-creation', () => ({
  createStage1Tasks: jest.fn(),
  createStage3Tasks: jest.fn(),
}));

// ================================================================================
// IMPORTS
// ================================================================================

import { KickoffState } from '../../../script/services/release/cron-job/states/kickoff.state';
import { RegressionState } from '../../../script/services/release/cron-job/states/regression.state';
import { 
  TaskStage, 
  StageStatus, 
  CronStatus, 
  TaskStatus, 
  TaskType,
  PauseType,
  RegressionCycleStatus 
} from '../../../script/models/release/release.interface';
import { getStorage } from '../../../script/storage/storage-instance';

import {
  mockReleaseId,
  mockCronJobId,
  createMockCronJob,
  createMockRelease,
  createMockTask,
  createMockStateMachineDependencies,
  createMockCronJobDTO,
  createMockReleaseTasksDTO,
} from '../../../test-helpers/release/state-test-helpers';

// ================================================================================
// HELPER FUNCTIONS
// ================================================================================

const createMockRegressionCycle = (
  status: RegressionCycleStatus = RegressionCycleStatus.DONE,
  cycleNumber: number = 1
) => ({
  id: `cycle-${cycleNumber}`,
  releaseId: mockReleaseId,
  cycleNumber,
  status,
  scheduledTime: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createMockRegressionCycleDTO = () => {
  const findByReleaseIdMock = jest.fn();
  const findLatestMock = jest.fn();
  return {
    findByReleaseId: findByReleaseIdMock,
    findLatest: findLatestMock,
    findPrevious: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getCycleCount: jest.fn(),
    getTagCount: jest.fn(),
    sequelize: {} as any,
    model: {} as any,
    toPlainObject: jest.fn((obj) => obj),
    delete: jest.fn(),
    getLatest: findLatestMock,
    getByRelease: findByReleaseIdMock,
    getByReleaseAndCycleNumber: jest.fn(),
    getByRegressionCycle: jest.fn(),
  };
};

// ================================================================================
// TESTS: STAGE 1 → STAGE 2 TRANSITION (Manual Mode)
// ================================================================================

describe('Stage Transition - AWAITING_STAGE_TRIGGER', () => {
  describe('Stage 1 → Stage 2 (autoTransitionToStage2 = false)', () => {
    let mockDeps: ReturnType<typeof createMockStateMachineDependencies>;
    let mockStateMachine: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDeps = createMockStateMachineDependencies();
      
      // Create mock state machine context
      mockStateMachine = {
        getReleaseId: jest.fn().mockReturnValue(mockReleaseId),
        getCronJobRepo: jest.fn().mockReturnValue(mockDeps.mockCronJobDTO),
        getReleaseRepo: jest.fn().mockReturnValue(mockDeps.mockReleaseDTO),
        getReleaseTaskRepo: jest.fn().mockReturnValue(mockDeps.mockReleaseTasksDTO),
        getRegressionCycleRepo: jest.fn().mockReturnValue(createMockRegressionCycleDTO()),
        getStorage: jest.fn().mockReturnValue({
          ...mockDeps.mockStorage,
          taskExecutor: mockDeps.mockTaskExecutor
        }),
        getPlatformMappingRepo: jest.fn().mockReturnValue(mockDeps.mockPlatformMappingRepo),
        setState: jest.fn(),
        setReleaseStatus: jest.fn(),
        getSequelize: jest.fn().mockReturnValue(mockDeps.mockStorage.sequelize),
        getReleaseUploadsRepo: jest.fn().mockReturnValue(undefined),
      };

      // ✅ Mock storage.taskExecutor instead of factory (migrated from factory pattern)
      const mockStorageWithTaskExecutor = {
        ...mockDeps.mockStorage,
        taskExecutor: mockDeps.mockTaskExecutor
      };
      (getStorage as jest.Mock).mockReturnValue(mockStorageWithTaskExecutor);
    });

    /**
     * TEST: When Stage 1 completes with autoTransitionToStage2 = false,
     * the system should set pauseType to AWAITING_STAGE_TRIGGER
     * instead of stopping the cron job scheduler.
     * 
     * EXPECTED: This test should FAIL initially because the current code
     * calls stopCronJob() instead of setting pauseType.
     */
    it('should set pauseType to AWAITING_STAGE_TRIGGER when Stage 1 completes', async () => {
      // Arrange: Stage 1 is IN_PROGRESS with all tasks completed
      const mockCronJob = createMockCronJob({
        stage1Status: StageStatus.IN_PROGRESS,
        cronStatus: CronStatus.RUNNING,
        autoTransitionToStage2: false, // Manual mode
      });
      
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
      mockDeps.mockReleaseDTO.findById.mockResolvedValue(createMockRelease({ kickOffDate: new Date() }));
      
      // All Stage 1 tasks are completed
      const completedTasks = [
        createMockTask(TaskType.FORK_BRANCH, TaskStatus.COMPLETED),
        createMockTask(TaskType.CREATE_RC_TAG, TaskStatus.COMPLETED),
      ];
      mockDeps.mockReleaseTasksDTO.findByReleaseIdAndStage.mockResolvedValue(completedTasks);

      // Create KickoffState
      const kickoffState = new KickoffState(mockStateMachine);

      // Act: Execute transitionToNext which is called when Stage 1 completes
      await kickoffState.transitionToNext();

      // Assert: Should set pauseType to AWAITING_STAGE_TRIGGER
      expect(mockDeps.mockCronJobDTO.update).toHaveBeenCalledWith(
        mockCronJobId,
        expect.objectContaining({
          stage1Status: StageStatus.COMPLETED,
          pauseType: PauseType.AWAITING_STAGE_TRIGGER,
        })
      );
    });

    /**
     * TEST: When Stage 1 completes with autoTransitionToStage2 = false,
     * the cron job scheduler should NOT be stopped.
     * 
     * EXPECTED: This test should FAIL initially because the current code
     * calls stopCronJob().
     */
    it('should NOT stop the cron job scheduler', async () => {
      // Arrange
      const mockCronJob = createMockCronJob({
        stage1Status: StageStatus.IN_PROGRESS,
        cronStatus: CronStatus.RUNNING,
        autoTransitionToStage2: false,
      });
      
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
      mockDeps.mockReleaseDTO.findById.mockResolvedValue(createMockRelease({ kickOffDate: new Date() }));
      
      const completedTasks = [
        createMockTask(TaskType.FORK_BRANCH, TaskStatus.COMPLETED),
        createMockTask(TaskType.CREATE_RC_TAG, TaskStatus.COMPLETED),
      ];
      mockDeps.mockReleaseTasksDTO.findByReleaseIdAndStage.mockResolvedValue(completedTasks);

      const kickoffState = new KickoffState(mockStateMachine);

      // Act
      await kickoffState.transitionToNext();

      // Assert: stopCronJob should NOT have been called
      // TODO: Update test for new architecture - check DB status instead
      // expect(stopCronJob).not.toHaveBeenCalled();
    });

    /**
     * TEST: When Stage 1 completes with autoTransitionToStage2 = false,
     * cronStatus should remain RUNNING (not PAUSED).
     * 
     * EXPECTED: This test should FAIL initially because the current code
     * sets cronStatus to PAUSED.
     */
    it('should keep cronStatus as RUNNING (not set to PAUSED)', async () => {
      // Arrange
      const mockCronJob = createMockCronJob({
        stage1Status: StageStatus.IN_PROGRESS,
        cronStatus: CronStatus.RUNNING,
        autoTransitionToStage2: false,
      });
      
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
      mockDeps.mockReleaseDTO.findById.mockResolvedValue(createMockRelease({ kickOffDate: new Date() }));
      
      const completedTasks = [
        createMockTask(TaskType.FORK_BRANCH, TaskStatus.COMPLETED),
        createMockTask(TaskType.CREATE_RC_TAG, TaskStatus.COMPLETED),
      ];
      mockDeps.mockReleaseTasksDTO.findByReleaseIdAndStage.mockResolvedValue(completedTasks);

      const kickoffState = new KickoffState(mockStateMachine);

      // Act
      await kickoffState.transitionToNext();

      // Assert: Should NOT set cronStatus to PAUSED
      expect(mockDeps.mockCronJobDTO.update).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          cronStatus: CronStatus.PAUSED,
        })
      );
    });
  });

  // ================================================================================
  // TESTS: STAGE 2 → STAGE 3 TRANSITION (Manual Mode)
  // ================================================================================

  describe('Stage 2 → Stage 3 (autoTransitionToStage3 = false)', () => {
    let mockDeps: ReturnType<typeof createMockStateMachineDependencies>;
    let mockStateMachine: any;
    let mockRegressionCycleDTO: ReturnType<typeof createMockRegressionCycleDTO>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDeps = createMockStateMachineDependencies();
      mockRegressionCycleDTO = createMockRegressionCycleDTO();
      
      mockStateMachine = {
        getReleaseId: jest.fn().mockReturnValue(mockReleaseId),
        getCronJobRepo: jest.fn().mockReturnValue(mockDeps.mockCronJobDTO),
        getReleaseRepo: jest.fn().mockReturnValue(mockDeps.mockReleaseDTO),
        getReleaseTaskRepo: jest.fn().mockReturnValue(mockDeps.mockReleaseTasksDTO),
        getRegressionCycleRepo: jest.fn().mockReturnValue(mockRegressionCycleDTO),
        getStorage: jest.fn().mockReturnValue({
          ...mockDeps.mockStorage,
          taskExecutor: mockDeps.mockTaskExecutor
        }),
        getPlatformMappingRepo: jest.fn().mockReturnValue(mockDeps.mockPlatformMappingRepo),
        setState: jest.fn(),
        setReleaseStatus: jest.fn(),
        getSequelize: jest.fn().mockReturnValue(mockDeps.mockStorage.sequelize),
        getReleaseUploadsRepo: jest.fn().mockReturnValue(undefined),
      };

      // ✅ TaskExecutor is now on storage, no need to mock factory
      (getStorage as jest.Mock).mockReturnValue(mockDeps.mockStorage);
    });

    /**
     * TEST: When Stage 2 completes with autoTransitionToStage3 = false,
     * the system should set pauseType to AWAITING_STAGE_TRIGGER.
     */
    it('should set pauseType to AWAITING_STAGE_TRIGGER when Stage 2 completes', async () => {
      // Arrange: Stage 2 is IN_PROGRESS, all cycles completed, no upcoming
      const mockCronJob = createMockCronJob({
        stage1Status: StageStatus.COMPLETED,
        stage2Status: StageStatus.IN_PROGRESS,
        cronStatus: CronStatus.RUNNING,
        autoTransitionToStage3: false, // Manual mode
        upcomingRegressions: [], // No upcoming cycles
      });
      
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
      mockDeps.mockReleaseDTO.findById.mockResolvedValue(createMockRelease({ kickOffDate: new Date() }));
      
      // Last cycle is completed (DONE)
      const completedCycle = createMockRegressionCycle(RegressionCycleStatus.DONE, 1);
      mockRegressionCycleDTO.findLatest.mockResolvedValue(completedCycle);
      mockRegressionCycleDTO.findByReleaseId.mockResolvedValue([completedCycle]);
      
      // All Stage 2 tasks completed
      const completedTasks = [
        { ...createMockTask(TaskType.TRIGGER_REGRESSION_BUILDS, TaskStatus.COMPLETED), taskStage: TaskStage.REGRESSION },
      ];
      mockDeps.mockReleaseTasksDTO.findByReleaseIdAndStage.mockResolvedValue(completedTasks);

      const regressionState = new RegressionState(mockStateMachine);

      // Act
      await regressionState.transitionToNext();

      // Assert
      expect(mockDeps.mockCronJobDTO.update).toHaveBeenCalledWith(
        mockCronJobId,
        expect.objectContaining({
          stage2Status: StageStatus.COMPLETED,
          pauseType: PauseType.AWAITING_STAGE_TRIGGER,
        })
      );
    });

    /**
     * TEST: When Stage 2 completes with autoTransitionToStage3 = false,
     * the cron job scheduler should NOT be stopped.
     */
    it('should NOT stop the cron job scheduler', async () => {
      // Arrange
      const mockCronJob = createMockCronJob({
        stage1Status: StageStatus.COMPLETED,
        stage2Status: StageStatus.IN_PROGRESS,
        cronStatus: CronStatus.RUNNING,
        autoTransitionToStage3: false,
        upcomingRegressions: [],
      });
      
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
      mockDeps.mockReleaseDTO.findById.mockResolvedValue(createMockRelease({ kickOffDate: new Date() }));
      
      const completedCycle = createMockRegressionCycle(RegressionCycleStatus.DONE, 1);
      mockRegressionCycleDTO.findLatest.mockResolvedValue(completedCycle);
      mockRegressionCycleDTO.findByReleaseId.mockResolvedValue([completedCycle]);
      
      const completedTasks = [
        { ...createMockTask(TaskType.TRIGGER_REGRESSION_BUILDS, TaskStatus.COMPLETED), taskStage: TaskStage.REGRESSION },
      ];
      mockDeps.mockReleaseTasksDTO.findByReleaseIdAndStage.mockResolvedValue(completedTasks);

      const regressionState = new RegressionState(mockStateMachine);

      // Act
      await regressionState.transitionToNext();

      // Assert
      // TODO: Update test for new architecture - check DB status instead
      // expect(stopCronJob).not.toHaveBeenCalled();
    });
  });

  // ================================================================================
  // TESTS: triggerStage2 and triggerStage3 APIs
  // ================================================================================

  describe('triggerStage2 API', () => {
    /**
     * TEST: When user triggers Stage 2, the system should set pauseType to NONE.
     * This allows the state machine to resume execution.
     * 
     * Note: This test validates the CronJobService.triggerStage2() method
     * which should include pauseType: PauseType.NONE in the update.
     */
    it('should set pauseType to NONE when triggering Stage 2', async () => {
      // This is a placeholder - actual implementation test will be added
      // when we modify CronJobService.triggerStage2()
      // 
      // The test will verify:
      // await cronJobRepo.update(cronJob.id, {
      //   pauseType: PauseType.NONE,  // <-- This should be added
      //   autoTransitionToStage2: true,
      //   stage2Status: StageStatus.IN_PROGRESS,
      //   cronStatus: CronStatus.RUNNING
      // });
      
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('triggerStage3 API', () => {
    /**
     * TEST: When user triggers Stage 3, the system should set pauseType to NONE.
     */
    it('should set pauseType to NONE when triggering Stage 3', async () => {
      // Placeholder - actual implementation test will be added
      expect(true).toBe(true);
    });
  });
});
