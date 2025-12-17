/**
 * Pause/Resume Tests - User-Induced Pause (Feature 5)
 * 
 * Phase 21.1: Tests for user pause/resume functionality.
 * 
 * Architecture Decision:
 * - Scheduler keeps running (not stopped) when user pauses
 * - State machine checks pauseType and skips execution if != NONE
 * - Resume only allowed for USER_REQUESTED (not TASK_FAILURE or AWAITING_STAGE_TRIGGER)
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

import { CronJobStateMachine } from '../../../script/services/release/cron-job/cron-job-state-machine';
import { CronJobService } from '../../../script/services/release/cron-job/cron-job.service';
import { 
  TaskStage, 
  StageStatus, 
  CronStatus, 
  TaskStatus, 
  TaskType,
  PauseType,
  ReleaseStatus 
} from '../../../script/models/release/release.interface';
import { getTaskExecutor } from '../../../script/services/release/task-executor/task-executor-factory';
import { getStorage } from '../../../script/storage/storage-instance';

import {
  mockReleaseId,
  mockCronJobId,
  mockTenantId,
  createMockCronJob,
  createMockRelease,
  createMockTask,
  createMockStateMachineDependencies,
} from '../../../test-helpers/release/state-test-helpers';

// ================================================================================
// TESTS: CronJobService - Pause/Resume
// ================================================================================

describe('User-Induced Pause (Feature 5)', () => {
  describe('CronJobService - pauseRelease()', () => {
    let mockDeps: ReturnType<typeof createMockStateMachineDependencies>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDeps = createMockStateMachineDependencies();
    });

    /**
     * TEST: When user pauses a release, pauseType should be set to USER_REQUESTED.
     * 
     * EXPECTED: This test should FAIL initially because pauseRelease() doesn't exist.
     */
    it('should set pauseType to USER_REQUESTED', async () => {
      // Arrange
      const mockRelease = createMockRelease({
        tenantId: mockTenantId,
        status: ReleaseStatus.IN_PROGRESS
      });
      const mockCronJob = createMockCronJob({
        stage1Status: StageStatus.IN_PROGRESS,
        cronStatus: CronStatus.RUNNING,
        pauseType: PauseType.NONE
      });

      mockDeps.mockReleaseDTO.findById.mockResolvedValue(mockRelease);
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
      mockDeps.mockCronJobDTO.update.mockResolvedValue({ ...mockCronJob, pauseType: PauseType.USER_REQUESTED });

      const service = new CronJobService(
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any, // regressionCycleRepo
        mockDeps.mockPlatformMappingRepo as any,
        mockDeps.mockStorage as any
      );

      // Act
      const result = await service.pauseRelease(mockReleaseId, mockTenantId, 'test-account-id');

      // Assert
      expect(result.success).toBe(true);
      expect(mockDeps.mockCronJobDTO.update).toHaveBeenCalledWith(
        mockCronJobId,
        expect.objectContaining({
          pauseType: PauseType.USER_REQUESTED
        })
      );
    });

    /**
     * TEST: Should return alreadyPaused=true if already paused.
     */
    it('should return alreadyPaused=true if already paused', async () => {
      // Arrange
      const mockRelease = createMockRelease({
        tenantId: mockTenantId,
        status: ReleaseStatus.IN_PROGRESS
      });
      const mockCronJob = createMockCronJob({
        stage1Status: StageStatus.IN_PROGRESS,
        cronStatus: CronStatus.RUNNING,
        pauseType: PauseType.USER_REQUESTED // Already paused
      });

      mockDeps.mockReleaseDTO.findById.mockResolvedValue(mockRelease);
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);

      const service = new CronJobService(
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any,
        mockDeps.mockPlatformMappingRepo as any,
        mockDeps.mockStorage as any
      );

      // Act
      const result = await service.pauseRelease(mockReleaseId, mockTenantId, 'test-account-id');

      // Assert
      expect(result.success).toBe(true);
      expect((result as any).data?.alreadyPaused).toBe(true);
      expect(mockDeps.mockCronJobDTO.update).not.toHaveBeenCalled();
    });

    /**
     * TEST: Should fail for ARCHIVED release.
     */
    it('should fail for ARCHIVED release', async () => {
      // Arrange
      const mockRelease = createMockRelease({
        tenantId: mockTenantId,
        status: ReleaseStatus.ARCHIVED
      });

      mockDeps.mockReleaseDTO.findById.mockResolvedValue(mockRelease);

      const service = new CronJobService(
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any,
        mockDeps.mockPlatformMappingRepo as any,
        mockDeps.mockStorage as any
      );

      // Act
      const result = await service.pauseRelease(mockReleaseId, mockTenantId, 'test-account-id');

      // Assert
      expect(result.success).toBe(false);
      expect((result as any).statusCode).toBe(400);
    });

    /**
     * TEST: Should fail for COMPLETED release.
     */
    it('should fail for COMPLETED release', async () => {
      // Arrange
      const mockRelease = createMockRelease({
        tenantId: mockTenantId,
        status: ReleaseStatus.COMPLETED
      });

      mockDeps.mockReleaseDTO.findById.mockResolvedValue(mockRelease);

      const service = new CronJobService(
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any,
        mockDeps.mockPlatformMappingRepo as any,
        mockDeps.mockStorage as any
      );

      // Act
      const result = await service.pauseRelease(mockReleaseId, mockTenantId, 'test-account-id');

      // Assert
      expect(result.success).toBe(false);
      expect((result as any).statusCode).toBe(400);
    });

    /**
     * TEST: Should fail for wrong tenant.
     */
    it('should fail for wrong tenant', async () => {
      // Arrange
      const mockRelease = createMockRelease({
        tenantId: 'different-tenant-id',
        status: ReleaseStatus.IN_PROGRESS
      });

      mockDeps.mockReleaseDTO.findById.mockResolvedValue(mockRelease);

      const service = new CronJobService(
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any,
        mockDeps.mockPlatformMappingRepo as any,
        mockDeps.mockStorage as any
      );

      // Act
      const result = await service.pauseRelease(mockReleaseId, mockTenantId, 'test-account-id');

      // Assert
      expect(result.success).toBe(false);
      expect((result as any).statusCode).toBe(403);
    });
  });

  // ================================================================================
  // TESTS: CronJobService - resumeRelease()
  // ================================================================================

  describe('CronJobService - resumeRelease()', () => {
    let mockDeps: ReturnType<typeof createMockStateMachineDependencies>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDeps = createMockStateMachineDependencies();
    });

    /**
     * TEST: When user resumes a USER_REQUESTED paused release, pauseType should be set to NONE.
     */
    it('should set pauseType to NONE', async () => {
      // Arrange
      const mockRelease = createMockRelease({
        tenantId: mockTenantId,
        status: ReleaseStatus.IN_PROGRESS
      });
      const mockCronJob = createMockCronJob({
        stage1Status: StageStatus.IN_PROGRESS,
        cronStatus: CronStatus.RUNNING,
        pauseType: PauseType.USER_REQUESTED
      });

      mockDeps.mockReleaseDTO.findById.mockResolvedValue(mockRelease);
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
      mockDeps.mockCronJobDTO.update.mockResolvedValue({ ...mockCronJob, pauseType: PauseType.NONE });

      const service = new CronJobService(
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any,
        mockDeps.mockPlatformMappingRepo as any,
        mockDeps.mockStorage as any
      );

      // Act
      const result = await service.resumeRelease(mockReleaseId, mockTenantId, 'test-account-id');

      // Assert
      expect(result.success).toBe(true);
      expect(mockDeps.mockCronJobDTO.update).toHaveBeenCalledWith(
        mockCronJobId,
        expect.objectContaining({
          pauseType: PauseType.NONE
        })
      );
    });

    /**
     * TEST: Should fail if pauseType is not USER_REQUESTED.
     */
    it('should fail if pauseType is not USER_REQUESTED', async () => {
      // Arrange
      const mockRelease = createMockRelease({
        tenantId: mockTenantId,
        status: ReleaseStatus.IN_PROGRESS
      });
      const mockCronJob = createMockCronJob({
        pauseType: PauseType.NONE // Not paused
      });

      mockDeps.mockReleaseDTO.findById.mockResolvedValue(mockRelease);
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);

      const service = new CronJobService(
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any,
        mockDeps.mockPlatformMappingRepo as any,
        mockDeps.mockStorage as any
      );

      // Act
      const result = await service.resumeRelease(mockReleaseId, mockTenantId, 'test-account-id');

      // Assert
      expect(result.success).toBe(false);
      expect((result as any).statusCode).toBe(400);
    });

    /**
     * TEST: Should fail for TASK_FAILURE paused release.
     */
    it('should fail for TASK_FAILURE paused release', async () => {
      // Arrange
      const mockRelease = createMockRelease({
        tenantId: mockTenantId,
        status: ReleaseStatus.IN_PROGRESS
      });
      const mockCronJob = createMockCronJob({
        pauseType: PauseType.TASK_FAILURE // Paused due to task failure
      });

      mockDeps.mockReleaseDTO.findById.mockResolvedValue(mockRelease);
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);

      const service = new CronJobService(
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any,
        mockDeps.mockPlatformMappingRepo as any,
        mockDeps.mockStorage as any
      );

      // Act
      const result = await service.resumeRelease(mockReleaseId, mockTenantId, 'test-account-id');

      // Assert
      expect(result.success).toBe(false);
      expect((result as any).statusCode).toBe(400);
      expect((result as any).error).toContain('TASK_FAILURE');
    });

    /**
     * TEST: Should fail for AWAITING_STAGE_TRIGGER paused release.
     */
    it('should fail for AWAITING_STAGE_TRIGGER paused release', async () => {
      // Arrange
      const mockRelease = createMockRelease({
        tenantId: mockTenantId,
        status: ReleaseStatus.IN_PROGRESS
      });
      const mockCronJob = createMockCronJob({
        pauseType: PauseType.AWAITING_STAGE_TRIGGER // Waiting for manual stage trigger
      });

      mockDeps.mockReleaseDTO.findById.mockResolvedValue(mockRelease);
      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);

      const service = new CronJobService(
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any,
        mockDeps.mockPlatformMappingRepo as any,
        mockDeps.mockStorage as any
      );

      // Act
      const result = await service.resumeRelease(mockReleaseId, mockTenantId, 'test-account-id');

      // Assert
      expect(result.success).toBe(false);
      expect((result as any).statusCode).toBe(400);
      expect((result as any).error).toContain('awaiting stage approval');
    });
  });

  // ================================================================================
  // TESTS: StateMachine - Pause Check
  // ================================================================================

  describe('StateMachine - Pause Check', () => {
    let mockDeps: ReturnType<typeof createMockStateMachineDependencies>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDeps = createMockStateMachineDependencies();
      (getTaskExecutor as jest.Mock).mockReturnValue(mockDeps.mockTaskExecutor);
      (getStorage as jest.Mock).mockReturnValue(mockDeps.mockStorage);
    });

    /**
     * TEST: State machine should skip execution if pauseType is USER_REQUESTED.
     */
    it('should skip execution if pauseType is USER_REQUESTED', async () => {
      // Arrange
      const mockCronJob = createMockCronJob({
        stage1Status: StageStatus.IN_PROGRESS,
        cronStatus: CronStatus.RUNNING,
        pauseType: PauseType.USER_REQUESTED
      });

      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
      mockDeps.mockReleaseDTO.findById.mockResolvedValue(createMockRelease());

      const stateMachine = new CronJobStateMachine(
        mockReleaseId,
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any,
        mockDeps.mockTaskExecutor as any,
        mockDeps.mockStorage as any,
        mockDeps.mockPlatformMappingRepo as any
      );
      await stateMachine.initialize();

      // Act
      await stateMachine.execute();

      // Assert: No task execution should happen
      expect(mockDeps.mockTaskExecutor.executeTask).not.toHaveBeenCalled();
    });

    /**
     * TEST: State machine should skip execution if pauseType is TASK_FAILURE.
     */
    it('should skip execution if pauseType is TASK_FAILURE', async () => {
      // Arrange
      const mockCronJob = createMockCronJob({
        stage1Status: StageStatus.IN_PROGRESS,
        cronStatus: CronStatus.RUNNING,
        pauseType: PauseType.TASK_FAILURE
      });

      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
      mockDeps.mockReleaseDTO.findById.mockResolvedValue(createMockRelease());

      const stateMachine = new CronJobStateMachine(
        mockReleaseId,
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any,
        mockDeps.mockTaskExecutor as any,
        mockDeps.mockStorage as any,
        mockDeps.mockPlatformMappingRepo as any
      );
      await stateMachine.initialize();

      // Act
      await stateMachine.execute();

      // Assert: No task execution should happen
      expect(mockDeps.mockTaskExecutor.executeTask).not.toHaveBeenCalled();
    });

    /**
     * TEST: State machine should skip execution if pauseType is AWAITING_STAGE_TRIGGER.
     */
    it('should skip execution if pauseType is AWAITING_STAGE_TRIGGER', async () => {
      // Arrange
      const mockCronJob = createMockCronJob({
        stage1Status: StageStatus.IN_PROGRESS,
        cronStatus: CronStatus.RUNNING,
        pauseType: PauseType.AWAITING_STAGE_TRIGGER
      });

      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
      mockDeps.mockReleaseDTO.findById.mockResolvedValue(createMockRelease());

      const stateMachine = new CronJobStateMachine(
        mockReleaseId,
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any,
        mockDeps.mockTaskExecutor as any,
        mockDeps.mockStorage as any,
        mockDeps.mockPlatformMappingRepo as any
      );
      await stateMachine.initialize();

      // Act
      await stateMachine.execute();

      // Assert: No task execution should happen
      expect(mockDeps.mockTaskExecutor.executeTask).not.toHaveBeenCalled();
    });

    /**
     * TEST: State machine should execute normally if pauseType is NONE.
     */
    it('should execute normally if pauseType is NONE', async () => {
      // Arrange
      const mockCronJob = createMockCronJob({
        stage1Status: StageStatus.IN_PROGRESS,
        cronStatus: CronStatus.RUNNING,
        pauseType: PauseType.NONE
      });
      const mockTasks = [
        createMockTask(TaskType.FORK_BRANCH, TaskStatus.PENDING)
      ];

      mockDeps.mockCronJobDTO.findByReleaseId.mockResolvedValue(mockCronJob);
      mockDeps.mockReleaseDTO.findById.mockResolvedValue(createMockRelease({ kickOffDate: new Date() }));
      mockDeps.mockReleaseTasksDTO.getByReleaseAndStage.mockResolvedValue(mockTasks);

      const stateMachine = new CronJobStateMachine(
        mockReleaseId,
        mockDeps.mockCronJobDTO as any,
        mockDeps.mockReleaseDTO as any,
        mockDeps.mockReleaseTasksDTO as any,
        {} as any,
        mockDeps.mockTaskExecutor as any,
        mockDeps.mockStorage as any,
        mockDeps.mockPlatformMappingRepo as any
      );
      await stateMachine.initialize();

      // Act
      await stateMachine.execute();

      // Assert: Task execution should happen
      expect(mockDeps.mockTaskExecutor.executeTask).toHaveBeenCalled();
    });
  });
});

