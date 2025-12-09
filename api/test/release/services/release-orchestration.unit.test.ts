/**
 * Release Orchestration - Unit Tests
 * 
 * Consolidated unit tests for all state machine components using mocks.
 * No database interactions. Tests pure business logic and state transitions.
 * 
 * Test Categories:
 * - Kick off State (Stage 1) - State identity, task execution, completion
 * - Regression State (Stage 2) - Cycle creation, task execution, stage completion
 * - Post-Regression State (Stage 3) - Task creation, execution, workflow completion
 * - State Machine - Initialization, state transitions, full workflows
 */

// ================================================================================
// MOCKS - Define FIRST (before imports)
// ================================================================================

jest.mock('../../../script/models/release/cron-job.repository');
jest.mock('../../../script/models/release/release.repository');
jest.mock('../../../script/models/release/release-task.repository');
jest.mock('../../../script/models/release/regression-cycle.repository');
jest.mock('../../../script/services/release/cron-job/cron-scheduler');
jest.mock('../../../script/services/release/task-executor/task-executor-factory', () => ({
  getTaskExecutor: jest.fn(),
}));
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
  isBranchForkTime: jest.fn().mockReturnValue(false),
  isRegressionSlotTime: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../script/utils/task-sequencing', () => ({
  getOrderedTasks: jest.fn((tasks) => tasks),
  canExecuteTask: jest.fn().mockReturnValue(true),
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
import { PostRegressionState } from '../../../script/services/release/cron-job/states/post-regression.state';
import { CronJobStateMachine } from '../../../script/services/release/cron-job/cron-job-state-machine';
import { 
  TaskStage, 
  StageStatus, 
  CronStatus, 
  TaskStatus, 
  TaskType,
  RegressionCycleStatus 
} from '../../../script/models/release/release.interface';
import { stopCronJob, startCronJob } from '../../../script/services/release/cron-job/cron-scheduler';
import { getTaskExecutor } from '../../../script/services/release/task-executor/task-executor-factory';
import { getStorage } from '../../../script/storage/storage-instance';
import { checkIntegrationAvailability } from '../../../script/utils/integration-availability.utils';
import { isRegressionSlotTime } from '../../../script/utils/time-utils';
import { createRegressionCycleWithTasks } from '../../../script/utils/regression-cycle-creation';
import { createStage3Tasks } from '../../../script/utils/task-creation';
import { canExecuteTask, isTaskRequired } from '../../../script/utils/task-sequencing';

import {
  ICronJobState,
  ICronJobStateMachine,
  mockReleaseId,
  mockCronJobId,
  mockTenantId,
  createMockCronJob,
  createMockRelease,
  createMockTask,
  createMockStateMachineDependencies,
  createMockCronJobDTO,
  createMockReleaseDTO,
  createMockReleaseTasksDTO,
  createMockStorage,
  createMockTaskExecutor
} from '../../../test-helpers/release/state-test-helpers';

// Helper for regression cycles
const createMockRegressionCycle = (
  status: RegressionCycleStatus = RegressionCycleStatus.IN_PROGRESS,
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
    // Repository interface methods
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
    // Legacy method names pointing to same mocks (for backwards compatibility)
    getLatest: findLatestMock,
    getByRelease: findByReleaseIdMock,
  getByReleaseAndCycleNumber: jest.fn(),
  getByRegressionCycle: jest.fn(),
  };
};

// ================================================================================
// TESTS: KICKOFF STATE (STAGE 1)
// ================================================================================

describe('Release Orchestration - Unit Tests', () => {
  describe('KickoffState (Stage 1)', () => {
    let mockDeps: ReturnType<typeof createMockStateMachineDependencies>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDeps = createMockStateMachineDependencies();

      // Setup default mocks
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(
        createMockCronJob({ stage1Status: StageStatus.IN_PROGRESS })
      );
      mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
    });

    describe('State Identity', () => {
      it('should identify as KICKOFF stage', async () => {
        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        
        const state = new KickoffState(stateMachine);
        
        expect(state.getStage()).toBe(TaskStage.KICKOFF);
      });
    });

    describe('execute()', () => {
      it('should execute pending tasks in order', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.IN_PROGRESS,
          stage2Status: StageStatus.PENDING,
          stage3Status: StageStatus.PENDING
        });
        mockCronJob.cronConfig.kickOffReminder = false;
        
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease({
          plannedDate: new Date()
        }));
        
        const tasks = [
          createMockTask(TaskType.FORK_BRANCH, TaskStatus.PENDING),
          createMockTask(TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStatus.PENDING)
        ];
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(tasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        
        const state = new KickoffState(stateMachine);
        await state.execute();

        // Both tasks execute (implementation executes all eligible tasks)
        expect(mockDeps.mockTaskExecutor.executeTask).toHaveBeenCalledTimes(2);
        expect(mockDeps.mockTaskExecutor.executeTask).toHaveBeenCalledWith(
          expect.objectContaining({
            task: tasks[0],
            releaseId: mockReleaseId,
            tenantId: mockTenantId
          })
        );
      });

      it('should skip completed tasks', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.IN_PROGRESS,
          stage2Status: StageStatus.PENDING,
          stage3Status: StageStatus.PENDING
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const tasks = [
          createMockTask(TaskType.FORK_BRANCH, TaskStatus.COMPLETED),
          createMockTask(TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStatus.PENDING)
        ];
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(tasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        
        const state = new KickoffState(stateMachine);
        await state.execute();

        // Only pending task should be processed
        expect(mockDeps.mockTaskExecutor.executeTask).toHaveBeenCalled();
      });

      it('should handle task execution failure gracefully', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.IN_PROGRESS,
          stage2Status: StageStatus.PENDING,
          stage3Status: StageStatus.PENDING
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const tasks = [createMockTask(TaskType.FORK_BRANCH, TaskStatus.PENDING)];
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(tasks);
        mockDeps.mockTaskExecutor.executeTask.mockResolvedValue({
          success: false,
          error: 'Network error'
        });

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        
        const state = new KickoffState(stateMachine);

        // Should not throw error
        await expect(state.execute()).resolves.not.toThrow();
      });
    });

    describe('isComplete()', () => {
      it('should return true when all required tasks are COMPLETED', async () => {
        const tasks = [
          createMockTask(TaskType.FORK_BRANCH, TaskStatus.COMPLETED),
          createMockTask(TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStatus.COMPLETED)
        ];
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(tasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        
        const state = new KickoffState(stateMachine);
        const complete = await state.isComplete();

        expect(complete).toBe(true);
      });

      it('should return false when any required task is PENDING', async () => {
        const tasks = [
          createMockTask(TaskType.FORK_BRANCH, TaskStatus.COMPLETED),
          createMockTask(TaskType.CREATE_PROJECT_MANAGEMENT_TICKET, TaskStatus.PENDING)
        ];
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(tasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        
        const state = new KickoffState(stateMachine);
        const complete = await state.isComplete();

        expect(complete).toBe(false);
      });
    });

    describe('transitionToNext()', () => {
      it('should transition to RegressionState when autoTransition enabled', async () => {
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(
          createMockCronJob({
            stage1Status: StageStatus.IN_PROGRESS,
            autoTransitionToStage2: true
          })
        );
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue([]);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        
        const state = new KickoffState(stateMachine);
        await state.transitionToNext();

        // Verify: Stage 1 marked COMPLETED, Stage 2 started
        expect(mockDeps.mockCronJobDTO.update).toHaveBeenCalledWith(
          mockCronJobId,
          expect.objectContaining({
            stage1Status: StageStatus.COMPLETED,
            stage2Status: StageStatus.IN_PROGRESS
          })
        );

        // Verify: Cron scheduler called
        expect(stopCronJob).toHaveBeenCalledWith(mockReleaseId);
        expect(startCronJob).toHaveBeenCalledWith(mockReleaseId, expect.any(Function));
      });

      it('should NOT transition when autoTransition disabled (manual mode)', async () => {
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(
          createMockCronJob({
            stage1Status: StageStatus.IN_PROGRESS,
            autoTransitionToStage2: false
          })
        );
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue([]);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        
        const state = new KickoffState(stateMachine);
        await state.transitionToNext();

        // Verify: Stage 1 marked COMPLETED, cron PAUSED, but Stage 2 NOT started
        expect(mockDeps.mockCronJobDTO.update).toHaveBeenCalledWith(
          mockCronJobId,
          expect.objectContaining({
            stage1Status: StageStatus.COMPLETED,
            cronStatus: CronStatus.PAUSED
          })
        );

        // Verify: Cron stopped (not started)
        expect(stopCronJob).toHaveBeenCalledWith(mockReleaseId);
      });
    });
  });

  // ================================================================================
  // TESTS: REGRESSION STATE (STAGE 2)
  // ================================================================================

  describe('RegressionState (Stage 2)', () => {
    let mockDeps: {
      mockCronJobDTO: ReturnType<typeof createMockCronJobDTO>;
      mockReleaseDTO: ReturnType<typeof createMockReleaseDTO>;
      mockReleaseTasksDTO: ReturnType<typeof createMockReleaseTasksDTO>;
      mockRegressionCycleDTO: ReturnType<typeof createMockRegressionCycleDTO>;
      mockStorage: ReturnType<typeof createMockStorage>;
      mockTaskExecutor: ReturnType<typeof createMockTaskExecutor>;
    };

    beforeEach(() => {
      jest.clearAllMocks();

      mockDeps = {
        mockCronJobDTO: createMockCronJobDTO(),
        mockReleaseDTO: createMockReleaseDTO(),
        mockReleaseTasksDTO: createMockReleaseTasksDTO(),
        mockRegressionCycleDTO: createMockRegressionCycleDTO(),
        mockStorage: createMockStorage(),
        mockTaskExecutor: createMockTaskExecutor(),
      };

      // Mock singletons (DTOs are now injected via constructor, not dynamically created)
      (getTaskExecutor as jest.Mock).mockReturnValue(mockDeps.mockTaskExecutor);
      (getStorage as jest.Mock).mockReturnValue(mockDeps.mockStorage);
      (checkIntegrationAvailability as jest.Mock).mockResolvedValue({
        hasProjectManagementIntegration: true,
        hasTestPlatformIntegration: true,
      });
    });

    describe('Basic State Pattern Mechanics', () => {
      it('should create RegressionState and verify it implements ICronJobState', () => {
        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        const regressionState = new RegressionState(stateMachine);
        
        expect(regressionState).toBeDefined();
        expect(regressionState).toHaveProperty('execute');
        expect(regressionState).toHaveProperty('isComplete');
        expect(regressionState).toHaveProperty('transitionToNext');
        expect(regressionState).toHaveProperty('getStage');
        expect(regressionState.getStage()).toBe('REGRESSION');
      });

      it('should demonstrate State Machine initialization with Stage 2', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.IN_PROGRESS,
          stage3Status: StageStatus.PENDING
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();

        expect(stateMachine['currentState']).toBeInstanceOf(RegressionState);
      });
    });

    describe('Cycle Creation (Slot Detection)', () => {
      it('should create regression cycle when slot time arrives', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.IN_PROGRESS,
          stage3Status: StageStatus.PENDING,
          cronStatus: CronStatus.RUNNING,
          autoTransitionToStage2: true,
          autoTransitionToStage3: true,
          upcomingRegressions: [{ date: new Date(), config: { automationBuilds: true } }]
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        // No cycle exists yet
        mockDeps.mockRegressionCycleDTO.getLatest.mockResolvedValue(null);
        (mockDeps.mockRegressionCycleDTO as any).findByReleaseId.mockResolvedValue([]);
        
        // Slot time is now
        (isRegressionSlotTime as jest.Mock).mockReturnValue(true);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        await stateMachine.execute();

        // Verify: Cycle creation was called
        expect(createRegressionCycleWithTasks).toHaveBeenCalled();
      });

      it('should NOT create cycle if latest cycle is still IN_PROGRESS', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.IN_PROGRESS,
          stage3Status: StageStatus.PENDING,
          cronStatus: CronStatus.RUNNING,
          autoTransitionToStage2: true,
          autoTransitionToStage3: true,
          upcomingRegressions: [{ date: new Date(), config: { automationBuilds: true } }]
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        // Latest cycle is still IN_PROGRESS
        const latestCycle = createMockRegressionCycle(RegressionCycleStatus.IN_PROGRESS, 1);
        mockDeps.mockRegressionCycleDTO.getLatest.mockResolvedValue(latestCycle);
        (mockDeps.mockRegressionCycleDTO as any).findByReleaseId.mockResolvedValue([latestCycle]);
        
        // Slot time is now
        (isRegressionSlotTime as jest.Mock).mockReturnValue(true);

        // Mock tasks for the existing cycle
        mockDeps.mockReleaseTasksDTO.getByRegressionCycle.mockResolvedValue([
          createMockTask(TaskType.TRIGGER_REGRESSION_BUILDS, TaskStatus.PENDING)
        ]);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        await stateMachine.execute();

        // Verify: Cycle creation was NOT called (wait for current cycle to complete)
        expect(createRegressionCycleWithTasks).not.toHaveBeenCalled();
      });

      it('should create next cycle when previous cycle is DONE', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.IN_PROGRESS,
          stage3Status: StageStatus.PENDING,
          cronStatus: CronStatus.RUNNING,
          autoTransitionToStage2: true,
          autoTransitionToStage3: true,
          upcomingRegressions: [{ date: new Date(), config: { automationBuilds: true } }]
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        // Latest cycle is DONE
        const latestCycle = createMockRegressionCycle(RegressionCycleStatus.DONE, 1);
        mockDeps.mockRegressionCycleDTO.getLatest.mockResolvedValue(latestCycle);
        (mockDeps.mockRegressionCycleDTO as any).findByReleaseId.mockResolvedValue([latestCycle]);
        
        // Slot time is now
        (isRegressionSlotTime as jest.Mock).mockReturnValue(true);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        await stateMachine.execute();

        // Verify: New cycle was created
        expect(createRegressionCycleWithTasks).toHaveBeenCalled();
      });
    });

    describe('Task Execution (Within Cycle)', () => {
      it('should execute pending tasks for current cycle', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.IN_PROGRESS,
          stage3Status: StageStatus.PENDING
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const latestCycle = createMockRegressionCycle(RegressionCycleStatus.IN_PROGRESS, 1);
        mockDeps.mockRegressionCycleDTO.getLatest.mockResolvedValue(latestCycle);
        (mockDeps.mockRegressionCycleDTO as any).findByReleaseId.mockResolvedValue([latestCycle]);
        
        const mockTasks = [
          createMockTask(TaskType.TRIGGER_REGRESSION_BUILDS, TaskStatus.PENDING),
          createMockTask(TaskType.CREATE_RC_TAG, TaskStatus.PENDING),
        ];
        mockDeps.mockReleaseTasksDTO.getByRegressionCycle.mockResolvedValue(mockTasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        await stateMachine.execute();

        // Verify: Tasks were executed
        expect(mockDeps.mockTaskExecutor.executeTask).toHaveBeenCalled();
      });
    });

    describe('Cycle Completion Detection', () => {
      it('should mark cycle as DONE when all tasks complete', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.IN_PROGRESS,
          stage3Status: StageStatus.PENDING
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const latestCycle = createMockRegressionCycle(RegressionCycleStatus.IN_PROGRESS, 1);
        mockDeps.mockRegressionCycleDTO.getLatest.mockResolvedValue(latestCycle);
        (mockDeps.mockRegressionCycleDTO as any).findByReleaseId.mockResolvedValue([latestCycle]);
        
        const mockTasks = [
          createMockTask(TaskType.TRIGGER_REGRESSION_BUILDS, TaskStatus.COMPLETED),
          createMockTask(TaskType.CREATE_RC_TAG, TaskStatus.COMPLETED),
        ];
        mockDeps.mockReleaseTasksDTO.getByRegressionCycle.mockResolvedValue(mockTasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        await stateMachine.execute();

        // Verify: Cycle marked as DONE
        expect(mockDeps.mockRegressionCycleDTO.update).toHaveBeenCalledWith(
          latestCycle.id,
          expect.objectContaining({ status: RegressionCycleStatus.DONE })
        );
      });
    });

    describe('Stage 2 Completion Detection', () => {
      it('should detect Stage 2 complete when all cycles DONE and no upcoming slots', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.IN_PROGRESS,
          stage3Status: StageStatus.PENDING,
          cronStatus: CronStatus.RUNNING,
          autoTransitionToStage2: true,
          autoTransitionToStage3: true,
          upcomingRegressions: null
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const cycle1 = createMockRegressionCycle(RegressionCycleStatus.DONE, 1);
        const cycle2 = createMockRegressionCycle(RegressionCycleStatus.DONE, 2);
        mockDeps.mockRegressionCycleDTO.getLatest.mockResolvedValue(cycle2);
        (mockDeps.mockRegressionCycleDTO as any).findByReleaseId.mockResolvedValue([cycle1, cycle2]);
        
        const mockTasks = [
          createMockTask(TaskType.TRIGGER_REGRESSION_BUILDS, TaskStatus.COMPLETED),
        ];
        mockDeps.mockReleaseTasksDTO.getByRegressionCycle.mockResolvedValue(mockTasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        
        const regressionState = stateMachine['currentState'] as RegressionState;
        const isComplete = await regressionState.isComplete();

        expect(isComplete).toBe(true);
      });

      it('should NOT be complete if upcoming regressions exist', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.IN_PROGRESS,
          stage3Status: StageStatus.PENDING,
          cronStatus: CronStatus.RUNNING,
          autoTransitionToStage2: true,
          autoTransitionToStage3: true,
          upcomingRegressions: [{ date: new Date(Date.now() + 3600000), config: {} }]
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const cycle1 = createMockRegressionCycle(RegressionCycleStatus.DONE, 1);
        mockDeps.mockRegressionCycleDTO.getLatest.mockResolvedValue(cycle1);
        (mockDeps.mockRegressionCycleDTO as any).findByReleaseId.mockResolvedValue([cycle1]);
        
        const mockTasks = [
          createMockTask(TaskType.TRIGGER_REGRESSION_BUILDS, TaskStatus.COMPLETED),
        ];
        mockDeps.mockReleaseTasksDTO.getByRegressionCycle.mockResolvedValue(mockTasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        
        const regressionState = stateMachine['currentState'] as RegressionState;
        const isComplete = await regressionState.isComplete();

        expect(isComplete).toBe(false);
      });
    });

    describe('Transition to Stage 3 (Automatic)', () => {
      it('should transition to Stage 3 when Stage 2 complete and autoTransition = true', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.IN_PROGRESS,
          stage3Status: StageStatus.PENDING,
          cronStatus: CronStatus.RUNNING,
          autoTransitionToStage2: true,
          autoTransitionToStage3: true,
          upcomingRegressions: null
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const cycle1 = createMockRegressionCycle(RegressionCycleStatus.DONE, 1);
        mockDeps.mockRegressionCycleDTO.getLatest.mockResolvedValue(cycle1);
        (mockDeps.mockRegressionCycleDTO as any).findByReleaseId.mockResolvedValue([cycle1]);
        
        const mockTasks = [
          createMockTask(TaskType.TRIGGER_REGRESSION_BUILDS, TaskStatus.COMPLETED),
        ];
        mockDeps.mockReleaseTasksDTO.getByRegressionCycle.mockResolvedValue(mockTasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        await stateMachine.execute();

        // Verify: Stage 2 marked COMPLETED, Stage 3 started
        expect(mockDeps.mockCronJobDTO.update).toHaveBeenCalledWith(
          mockCronJobId,
          expect.objectContaining({
            stage2Status: StageStatus.COMPLETED,
            stage3Status: StageStatus.IN_PROGRESS,
          })
        );

        // Verify: Cron job for Stage 2 stopped
        expect(stopCronJob).toHaveBeenCalledWith(mockReleaseId);
      });
    });

    describe('Transition to Stage 3 (Manual)', () => {
      it('should NOT auto-transition if autoTransitionToStage3 = false', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.IN_PROGRESS,
          stage3Status: StageStatus.PENDING,
          cronStatus: CronStatus.RUNNING,
          autoTransitionToStage2: true,
          autoTransitionToStage3: false,
          upcomingRegressions: null
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const cycle1 = createMockRegressionCycle(RegressionCycleStatus.DONE, 1);
        mockDeps.mockRegressionCycleDTO.getLatest.mockResolvedValue(cycle1);
        (mockDeps.mockRegressionCycleDTO as any).findByReleaseId.mockResolvedValue([cycle1]);
        
        const mockTasks = [
          createMockTask(TaskType.TRIGGER_REGRESSION_BUILDS, TaskStatus.COMPLETED),
        ];
        mockDeps.mockReleaseTasksDTO.getByRegressionCycle.mockResolvedValue(mockTasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        await stateMachine.execute();

        // Verify: Stage 2 marked COMPLETED, but Stage 3 NOT started
        expect(mockDeps.mockCronJobDTO.update).toHaveBeenCalledWith(
          mockCronJobId,
          expect.objectContaining({
            stage2Status: StageStatus.COMPLETED,
          })
        );
        expect(mockDeps.mockCronJobDTO.update).not.toHaveBeenCalledWith(
          mockCronJobId,
          expect.objectContaining({
            stage3Status: StageStatus.IN_PROGRESS,
          })
        );

        // Verify: Cron job stopped (wait for manual trigger)
        expect(stopCronJob).toHaveBeenCalledWith(mockReleaseId);
      });
    });

    describe('Loop Behavior (Multiple Cycles)', () => {
      it('should stay in RegressionState while cycles remain', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.IN_PROGRESS,
          stage3Status: StageStatus.PENDING
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const cycle1 = createMockRegressionCycle(RegressionCycleStatus.DONE, 1);
        const cycle2 = createMockRegressionCycle(RegressionCycleStatus.IN_PROGRESS, 2);
        mockDeps.mockRegressionCycleDTO.getLatest.mockResolvedValue(cycle2);
        (mockDeps.mockRegressionCycleDTO as any).findByReleaseId.mockResolvedValue([cycle1, cycle2]);
        
        const mockTasks = [
          createMockTask(TaskType.TRIGGER_REGRESSION_BUILDS, TaskStatus.PENDING),
        ];
        mockDeps.mockReleaseTasksDTO.getByRegressionCycle.mockResolvedValue(mockTasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        
        const regressionState = stateMachine['currentState'] as RegressionState;
        const isComplete = await regressionState.isComplete();

        // Verify: Stage 2 NOT complete (Cycle 2 still IN_PROGRESS)
        expect(isComplete).toBe(false);
        expect(stateMachine['currentState']).toBeInstanceOf(RegressionState);
      });
    });
  });

  // ================================================================================
  // TESTS: POST-REGRESSION STATE (STAGE 3)
  // ================================================================================

  describe('PostRegressionState (Stage 3)', () => {
    let mockDeps: {
      mockCronJobDTO: ReturnType<typeof createMockCronJobDTO>;
      mockReleaseDTO: ReturnType<typeof createMockReleaseDTO>;
      mockReleaseTasksDTO: ReturnType<typeof createMockReleaseTasksDTO>;
      mockStorage: ReturnType<typeof createMockStorage>;
      mockTaskExecutor: ReturnType<typeof createMockTaskExecutor>;
    };

    beforeEach(() => {
      jest.clearAllMocks();

      mockDeps = {
        mockCronJobDTO: createMockCronJobDTO(),
        mockReleaseDTO: createMockReleaseDTO(),
        mockReleaseTasksDTO: createMockReleaseTasksDTO(),
        mockStorage: createMockStorage(),
        mockTaskExecutor: createMockTaskExecutor(),
      };

      // Mock singletons (DTOs are now injected via constructor, not dynamically created)
      (getTaskExecutor as jest.Mock).mockReturnValue(mockDeps.mockTaskExecutor);
      (getStorage as jest.Mock).mockReturnValue(mockDeps.mockStorage);
      (checkIntegrationAvailability as jest.Mock).mockResolvedValue({
        hasProjectManagementIntegration: true,
        hasTestPlatformIntegration: true,
      });
    });

    describe('Basic State Pattern Mechanics', () => {
      it('should create PostRegressionState and verify it implements ICronJobState', () => {
        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          {} as any, // mockRegressionCycleDTO (not needed for Stage 3)
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        const postRegressionState = new PostRegressionState(stateMachine);
        
        expect(postRegressionState).toBeDefined();
        expect(postRegressionState).toHaveProperty('execute');
        expect(postRegressionState).toHaveProperty('isComplete');
        expect(postRegressionState).toHaveProperty('transitionToNext');
        expect(postRegressionState).toHaveProperty('getStage');
        expect(postRegressionState.getStage()).toBe('POST_REGRESSION');
      });

      it('should demonstrate State Machine initialization with Stage 3', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.COMPLETED,
          stage3Status: StageStatus.IN_PROGRESS
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          {} as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();

        expect(stateMachine['currentState']).toBeInstanceOf(PostRegressionState);
      });
    });

    describe('Stage 3 Task Creation', () => {
      it('should create Stage 3 tasks if they do not exist', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.COMPLETED,
          stage3Status: StageStatus.IN_PROGRESS
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        // No Stage 3 tasks exist yet
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue([]);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          {} as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        await stateMachine.execute();

        // Verify: Stage 3 tasks were created
        expect(createStage3Tasks).toHaveBeenCalled();
      });

      it('should NOT recreate tasks if they already exist', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.COMPLETED,
          stage3Status: StageStatus.IN_PROGRESS
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        // Stage 3 tasks already exist
        const mockTasks = [
          createMockTask(TaskType.CREATE_FINAL_RELEASE_NOTES, TaskStatus.PENDING),
        ];
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(mockTasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          {} as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        await stateMachine.execute();

        // Verify: Tasks were NOT recreated
        expect(createStage3Tasks).not.toHaveBeenCalled();
      });
    });

    describe('Task Execution', () => {
      it('should execute pending Stage 3 tasks', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.COMPLETED,
          stage3Status: StageStatus.IN_PROGRESS
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const mockTasks = [
          createMockTask(TaskType.CREATE_FINAL_RELEASE_NOTES, TaskStatus.PENDING),
          createMockTask(TaskType.SEND_POST_REGRESSION_MESSAGE, TaskStatus.PENDING),
        ];
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(mockTasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          {} as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        await stateMachine.execute();

        // Verify: Tasks were executed
        expect(mockDeps.mockTaskExecutor.executeTask).toHaveBeenCalled();
      });

      it('should NOT execute already completed tasks', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.COMPLETED,
          stage3Status: StageStatus.IN_PROGRESS
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const mockTasks = [
          createMockTask(TaskType.CREATE_FINAL_RELEASE_NOTES, TaskStatus.COMPLETED),
        ];
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(mockTasks);

        // Override canExecuteTask to return false for COMPLETED tasks
        (canExecuteTask as jest.Mock).mockImplementation((task) => task.taskStatus !== TaskStatus.COMPLETED);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          {} as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        await stateMachine.execute();

        // Verify: Tasks were NOT executed (already COMPLETED)
        expect(mockDeps.mockTaskExecutor.executeTask).not.toHaveBeenCalled();
      });
    });

    describe('Stage 3 Completion Detection', () => {
      it('should detect Stage 3 complete when all tasks COMPLETED', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.COMPLETED,
          stage3Status: StageStatus.IN_PROGRESS
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const mockTasks = [
          createMockTask(TaskType.CREATE_FINAL_RELEASE_NOTES, TaskStatus.COMPLETED),
          createMockTask(TaskType.SEND_POST_REGRESSION_MESSAGE, TaskStatus.COMPLETED),
        ];
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(mockTasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          {} as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        
        const postRegressionState = stateMachine['currentState'] as PostRegressionState;
        const isComplete = await postRegressionState.isComplete();

        expect(isComplete).toBe(true);
      });

      it('should NOT be complete if tasks still PENDING', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.COMPLETED,
          stage3Status: StageStatus.IN_PROGRESS
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const mockTasks = [
          createMockTask(TaskType.CREATE_FINAL_RELEASE_NOTES, TaskStatus.COMPLETED),
          createMockTask(TaskType.SEND_POST_REGRESSION_MESSAGE, TaskStatus.PENDING),
        ];
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(mockTasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          {} as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        
        const postRegressionState = stateMachine['currentState'] as PostRegressionState;
        const isComplete = await postRegressionState.isComplete();

        expect(isComplete).toBe(false);
      });
    });

    describe('Workflow Completion (No Stage 4)', () => {
      it('should mark workflow complete and stop cron when Stage 3 done', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.COMPLETED,
          stage3Status: StageStatus.IN_PROGRESS
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        
        const mockTasks = [
          createMockTask(TaskType.CREATE_FINAL_RELEASE_NOTES, TaskStatus.COMPLETED),
        ];
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(mockTasks);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          {} as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        await stateMachine.execute();

        // Verify: Stage 3 marked COMPLETED
        expect(mockDeps.mockCronJobDTO.update).toHaveBeenCalledWith(
          mockCronJobId,
          expect.objectContaining({
            stage3Status: StageStatus.COMPLETED,
          })
        );

        // Verify: Cron status marked COMPLETED (no Stage 4)
        expect(mockDeps.mockCronJobDTO.update).toHaveBeenCalledWith(
          mockCronJobId,
          expect.objectContaining({
            cronStatus: CronStatus.COMPLETED,
          })
        );

        // Verify: Cron job stopped
        expect(stopCronJob).toHaveBeenCalledWith(mockReleaseId);
      });
    });

    describe('Optional Tasks Handling', () => {
      it('should handle optional tasks correctly (consider complete if not required)', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.COMPLETED,
          stage3Status: StageStatus.IN_PROGRESS
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        
        const releaseWithoutJira = {
          ...createMockRelease(),
          releaseConfigId: 'config-no-jira',
        };
        mockDeps.mockReleaseDTO.get.mockResolvedValue(releaseWithoutJira);
        
        // Mock integration availability: no Jira
        (checkIntegrationAvailability as jest.Mock).mockResolvedValue({
          hasProjectManagementIntegration: false,
          hasTestPlatformIntegration: true,
        });
        
        const mockTasks = [
          createMockTask(TaskType.CREATE_FINAL_RELEASE_NOTES, TaskStatus.PENDING), // Optional
          createMockTask(TaskType.SEND_POST_REGRESSION_MESSAGE, TaskStatus.COMPLETED), // Required
        ];
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(mockTasks);

        // Override isTaskRequired: CREATE_FINAL_RELEASE_NOTES is optional
        (isTaskRequired as jest.Mock).mockImplementation((taskType) => {
          return taskType !== TaskType.CREATE_FINAL_RELEASE_NOTES;
        });

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          {} as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        await stateMachine.initialize();
        
        const postRegressionState = stateMachine['currentState'] as PostRegressionState;
        const isComplete = await postRegressionState.isComplete();

        // Verify: Stage 3 IS complete (optional task ignored)
        expect(isComplete).toBe(true);
      });
    });
  });

  // ================================================================================
  // TESTS: STATE MACHINE
  // ================================================================================

  describe('CronJobStateMachine', () => {
    let mockDeps: ReturnType<typeof createMockStateMachineDependencies>;

    beforeEach(() => {
      mockDeps = createMockStateMachineDependencies();
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(
        createMockCronJob({ stage1Status: StageStatus.IN_PROGRESS })
      );
      mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
    });

    describe('Initialization', () => {
      it('should initialize with correct state based on stage status', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.IN_PROGRESS,
          stage2Status: StageStatus.PENDING,
          stage3Status: StageStatus.PENDING
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue([]);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        
        await stateMachine.initialize();
        const currentState = stateMachine.getCurrentState();
        expect(currentState?.getStage()).toBe(TaskStage.KICKOFF);
      });
    });

    describe('execute()', () => {
      it('should delegate execution to current state', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.IN_PROGRESS,
          stage2Status: StageStatus.PENDING,
          stage3Status: StageStatus.PENDING
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue([]);
        mockDeps.mockRegressionCycleDTO.getLatest.mockResolvedValue(null);
        (mockDeps.mockRegressionCycleDTO as any).findByReleaseId.mockResolvedValue([]);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        
        await stateMachine.initialize();
        const currentState = stateMachine.getCurrentState();
        expect(currentState).not.toBeNull();
        expect(currentState?.getStage()).toBe(TaskStage.KICKOFF);
        
        await stateMachine.execute();
      });
    });

    describe('setState()', () => {
      it('should update current state', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.IN_PROGRESS,
          stage2Status: StageStatus.PENDING,
          stage3Status: StageStatus.PENDING
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
        mockDeps.mockReleaseDTO.get.mockResolvedValue(createMockRelease());
        mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue([]);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );
        
        await stateMachine.initialize();
        const initialState = stateMachine.getCurrentState();
        expect(initialState?.getStage()).toBe(TaskStage.KICKOFF);

        // Create and set new state
        const newState = new RegressionState(stateMachine);
        stateMachine.setState(newState);

        // Verify: State changed
        const updatedState = stateMachine.getCurrentState();
        expect(updatedState).toBe(newState);
        expect(updatedState?.getStage()).toBe(TaskStage.REGRESSION);
      });
    });

    describe('isWorkflowComplete()', () => {
      it('should return true when all stages are COMPLETED', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.COMPLETED,
          stage3Status: StageStatus.COMPLETED,
          cronStatus: CronStatus.COMPLETED
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );

        const complete = await stateMachine.isWorkflowComplete();
        expect(complete).toBe(true);
      });

      it('should return false when any stage is not COMPLETED', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.COMPLETED,
          stage2Status: StageStatus.IN_PROGRESS,
          stage3Status: StageStatus.PENDING
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );

        const complete = await stateMachine.isWorkflowComplete();
        expect(complete).toBe(false);
      });
    });

    describe('Dependency Access', () => {
      it('should provide DTOs and IDs to states', async () => {
        const mockCronJob = createMockCronJob({
          stage1Status: StageStatus.IN_PROGRESS,
          stage2Status: StageStatus.PENDING,
          stage3Status: StageStatus.PENDING
        });
        mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);

        const stateMachine = new CronJobStateMachine(
          mockReleaseId,
          mockDeps.mockCronJobDTO as any,
          mockDeps.mockReleaseDTO as any,
          mockDeps.mockReleaseTasksDTO as any,
          mockDeps.mockRegressionCycleDTO as any,
          mockDeps.mockTaskExecutor as any,
          mockDeps.mockStorage as any
        );

        // Verify: States can access all dependencies (method names changed to *Repo)
        expect(stateMachine.getCronJobRepo()).toBe(mockDeps.mockCronJobDTO);
        expect(stateMachine.getReleaseRepo()).toBe(mockDeps.mockReleaseDTO);
        expect(stateMachine.getReleaseTaskRepo()).toBe(mockDeps.mockReleaseTasksDTO);
        expect(stateMachine.getRegressionCycleRepo()).toBe(mockDeps.mockRegressionCycleDTO);
        expect(stateMachine.getTaskExecutor()).toBe(mockDeps.mockTaskExecutor);
        expect(stateMachine.getStorage()).toBe(mockDeps.mockStorage);
        expect(stateMachine.getReleaseId()).toBe(mockReleaseId);
        
        const cronJobId = await stateMachine.getCronJobId();
        expect(cronJobId).toBe(mockCronJobId);
      });
    });
  });
});
