/**
 * Task Executor - Partial Failure Unit Tests (TDD - RED Phase)
 * 
 * Unit tests for multi-platform task partial failure handling using mocks.
 * No database interactions. Tests pure business logic.
 * 
 * Tests verify that CREATE_TEST_SUITE and CREATE_PROJECT_MANAGEMENT_TICKET
 * properly handle partial failures following the same pattern as BUILD tasks.
 * 
 * Expected Behavior:
 * - If ANY platform fails → Task = FAILED, Release = PAUSED
 * - If ALL platforms succeed → Task = COMPLETED
 * - If ALL platforms fail → Task = FAILED, Release = PAUSED
 * 
 * ALL TESTS SHOULD FAIL INITIALLY (RED Phase)
 */

// ================================================================================
// MOCKS - Define FIRST (before imports)
// ================================================================================

jest.mock('../../../script/storage/storage-instance', () => ({
  getStorage: jest.fn().mockReturnValue({
    sequelize: {
      models: {
        PlatformTargetMapping: {
          update: jest.fn().mockResolvedValue([1])
        }
      }
    }
  })
}));

jest.mock('../../../script/types/release/api-types', () => ({
  hasSequelize: jest.fn().mockReturnValue(true)
}));

// ================================================================================
// IMPORTS
// ================================================================================

import { TaskExecutor } from '../../../script/services/release/task-executor/task-executor';
import type { TaskExecutionContext } from '../../../script/services/release/task-executor/task-executor';
import { TaskType, TaskStatus, ReleaseStatus, TaskStage } from '../../../script/models/release/release.interface';
import type { ReleaseTask, Release } from '../../../script/models/release/release.interface';

// ================================================================================
// HELPER FUNCTIONS
// ================================================================================

function createMockRelease(): Release {
  return {
    id: 'release-1',
    releaseId: 'REL-001',
    tenantId: 'tenant-1',
    releaseConfigId: 'config-1',
    type: 'MINOR',
    branch: 'release/1.0.0',
    baseBranch: 'main',
    baseReleaseId: null,
    releaseTag: null,
    kickOffReminderDate: null,
    status: ReleaseStatus.IN_PROGRESS,
    kickOffDate: new Date('2024-01-01'),
    targetReleaseDate: new Date('2024-01-15'),
    releaseDate: null,
    delayReason: null,
    hasManualBuildUpload: false,
    createdByAccountId: 'user-1',
    releasePilotAccountId: null,
    lastUpdatedByAccountId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function createMockTask(taskType: TaskType, taskId: string): ReleaseTask {
  return {
    id: taskId,
    releaseId: 'release-1',
    taskId: taskId,
    taskType,
    taskStatus: TaskStatus.PENDING,
    taskConclusion: null,
    stage: TaskStage.KICKOFF,
    branch: null,
    isReleaseKickOffTask: true,
    isRegressionSubTasks: false,
    identifier: null,
    accountId: null,
    regressionId: null,
    externalId: null,
    externalData: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// ================================================================================
// TESTS
// ================================================================================

describe('TaskExecutor - Partial Failure Handling (TDD - RED Phase)', () => {
  let taskExecutor: TaskExecutor;
  let mockTaskRepo: any;
  let mockReleaseRepo: any;
  let mockTestRunService: any;
  let mockPMTicketService: any;
  let mockReleaseConfigRepo: any;

  beforeEach(() => {
    // Mock repositories
    mockTaskRepo = {
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn()
    };

    mockReleaseRepo = {
      update: jest.fn().mockResolvedValue(undefined)
    };

    // Mock test run service
    mockTestRunService = {
      createTestRuns: jest.fn()
    };

    // Mock PM ticket service
    mockPMTicketService = {
      createTickets: jest.fn()
    };

    // Mock release config repo
    mockReleaseConfigRepo = {
      findById: jest.fn()
    };

    // Create task executor with all required dependencies
    // ✅ Pass mock Sequelize directly to avoid circular dependency (TaskExecutor no longer calls getStorage())
    const mockSequelize = {
      models: {
        PlatformTargetMapping: {
          update: jest.fn().mockResolvedValue([1])
        }
      }
    } as any;
    
    taskExecutor = new TaskExecutor(
      {} as any, // scmService
      {} as any, // cicdIntegrationRepo
      {} as any, // cicdWorkflowRepo
      {} as any, // cicdConfigService
      mockPMTicketService,
      mockTestRunService,
      {} as any, // messagingService
      mockReleaseConfigRepo,
      mockTaskRepo,
      mockReleaseRepo,
      {} as any, // releaseUploadsRepo - ✅ Required - actively initialized in aws-storage.ts
      {} as any, // cronJobRepo - ✅ Required - actively initialized in aws-storage.ts
      undefined, // releaseNotificationService
      mockSequelize,  // ✅ Pass Sequelize directly instead of TaskExecutor calling getStorage()
      {} as any,  // regressionCycleRepo - ✅ Required - actively initialized in aws-storage.ts
      {} as any  // buildNotificationService - ✅ Required for build notifications
    );
  });

  describe('CREATE_TEST_SUITE - Partial Failure Scenarios', () => {
    const mockRelease: Release = {
      id: 'release-1',
      releaseId: 'REL-001',
      tenantId: 'tenant-1',
      releaseConfigId: 'config-1',
      type: 'MINOR',
      branch: 'release/1.0.0',
      baseBranch: 'main',
      baseReleaseId: null,
      releaseTag: null,
      kickOffReminderDate: null,
      status: ReleaseStatus.IN_PROGRESS,
      kickOffDate: new Date('2024-01-01'),
      targetReleaseDate: new Date('2024-01-15'),
      releaseDate: null,
      delayReason: null,
      hasManualBuildUpload: false,
      createdByAccountId: 'user-1',
      releasePilotAccountId: null,
      lastUpdatedByAccountId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockTask: ReleaseTask = {
      id: 'task-1',
      releaseId: 'release-1',
      taskId: 'CREATE_TEST_SUITE_1',
      taskType: TaskType.CREATE_TEST_SUITE,
      taskStatus: TaskStatus.PENDING,
      taskConclusion: null,
      stage: TaskStage.KICKOFF,
      branch: null,
      isReleaseKickOffTask: true,
      isRegressionSubTasks: false,
      identifier: null,
      accountId: null,
      regressionId: null,
      externalId: null,
      externalData: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const platformMappings = [
      { id: 'mapping-1', releaseId: 'release-1', platform: 'IOS', target: 'APP_STORE', version: '1.0.0' },
      { id: 'mapping-2', releaseId: 'release-1', platform: 'ANDROID_WEB', target: 'WEB', version: '1.0.0' }
    ];

    beforeEach(() => {
      mockReleaseConfigRepo.findById.mockResolvedValue({
        id: 'config-1',
        testManagementConfigId: 'test-config-1'
      } as any); // Partial mock for simplicity
    });

    /**
     * TEST 1: Partial Failure - 1 out of 2 platforms fails
     * 
     * Expected Behavior:
     * - Task status should be FAILED
     * - Release status should be PAUSED
     * - Error message should include which platform failed and why
     * - Successful platform's test run should still be created
     * 
     * This test WILL FAIL initially because current implementation
     * silently ignores the ANDROID_WEB failure and marks task as COMPLETED.
     */
    it('should FAIL task when 1 out of 2 platforms fails to create test run', async () => {
      // Arrange: IOS succeeds, ANDROID_WEB fails
      mockTestRunService.createTestRuns
        .mockResolvedValueOnce({
          IOS: { runId: 'run-ios-1', url: 'http://test.com/ios', status: 'PENDING' }
        } as any)
        .mockResolvedValueOnce({
          ANDROID_WEB: { error: 'Failed to create test run: Connection timeout' }
        } as any);

      const context: TaskExecutionContext = {
        releaseId: 'release-1',
        tenantId: 'tenant-1',
        release: mockRelease,
        task: mockTask,
        platformTargetMappings: platformMappings
      };

      // Act
      const result = await taskExecutor.executeTask(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Failed to create test runs');
      expect(result.error).toContain('1/2 platforms');
      expect(result.error).toContain('ANDROID_WEB');
      expect(result.error).toContain('Connection timeout');
      
      // Verify task marked as FAILED
      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          taskStatus: TaskStatus.FAILED
        })
      );

      // Verify release PAUSED
      expect(mockReleaseRepo.update).toHaveBeenCalledWith(
        'release-1',
        expect.objectContaining({
          status: ReleaseStatus.PAUSED
        })
      );

      // Note: We can't verify platform mapping updates in unit tests easily
      // since it uses Sequelize model directly. This will be tested in integration tests.
    });

    /**
     * TEST 2: Complete Failure - ALL platforms fail
     * 
     * Expected Behavior:
     * - Task status should be FAILED
     * - Release status should be PAUSED
     * - Error message should list ALL failed platforms with reasons
     * 
     * This test WILL FAIL initially because current implementation
     * returns 'no-runs-created' and marks task as COMPLETED.
     */
    it('should FAIL task when ALL platforms fail to create test run', async () => {
      // Arrange: Both platforms fail
      mockTestRunService.createTestRuns
        .mockResolvedValueOnce({
          IOS: { error: 'Failed to create test run: Invalid project ID' }
        } as any)
        .mockResolvedValueOnce({
          ANDROID_WEB: { error: 'Failed to create test run: Authentication failed' }
        } as any);

      const context: TaskExecutionContext = {
        releaseId: 'release-1',
        tenantId: 'tenant-1',
        release: mockRelease,
        task: mockTask,
        platformTargetMappings: platformMappings
      };

      // Act
      const result = await taskExecutor.executeTask(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Failed to create test runs for 2/2 platforms');
      expect(result.error).toContain('IOS');
      expect(result.error).toContain('Invalid project ID');
      expect(result.error).toContain('ANDROID_WEB');
      expect(result.error).toContain('Authentication failed');
      
      // Verify task marked as FAILED
      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          taskStatus: TaskStatus.FAILED
        })
      );

      // Verify release PAUSED
      expect(mockReleaseRepo.update).toHaveBeenCalledWith(
        'release-1',
        expect.objectContaining({
          status: ReleaseStatus.PAUSED
        })
      );

      // Note: Platform mapping updates tested in integration tests
    });

    /**
     * TEST 3: Success Case - ALL platforms succeed
     * 
     * Expected Behavior:
     * - Task status should be COMPLETED
     * - Release status should remain IN_PROGRESS (not paused)
     * - Both platforms' test runs should be created
     * 
     * This test should PASS even with current implementation.
     */
    it('should SUCCEED task when ALL platforms succeed', async () => {
      // Arrange: Both platforms succeed
      mockTestRunService.createTestRuns
        .mockResolvedValueOnce({
          IOS: { runId: 'run-ios-1', url: 'http://test.com/ios', status: 'PENDING' }
        } as any)
        .mockResolvedValueOnce({
          ANDROID_WEB: { runId: 'run-android-1', url: 'http://test.com/android', status: 'PENDING' }
        } as any);

      mockTaskRepo.findById.mockResolvedValue({
        ...mockTask,
        taskStatus: TaskStatus.COMPLETED
      });

      const context: TaskExecutionContext = {
        releaseId: 'release-1',
        tenantId: 'tenant-1',
        release: mockRelease,
        task: mockTask,
        platformTargetMappings: platformMappings
      };

      // Act
      const result = await taskExecutor.executeTask(context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      
      // Verify task marked as COMPLETED
      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          taskStatus: TaskStatus.COMPLETED
        })
      );

      // Verify release NOT paused
      const pauseCalls = (mockReleaseRepo.update as jest.Mock).mock.calls.filter(
        call => call[1]?.status === ReleaseStatus.PAUSED
      );
      expect(pauseCalls.length).toBe(0);

      // Note: Platform mapping updates tested in integration tests
    });

    /**
     * TEST 4: Edge Case - No runId returned (null response)
     * 
     * Expected Behavior:
     * - Task should FAIL if no runId is returned (even without explicit error)
     * - Error message should indicate no run ID was returned
     * 
     * This test WILL FAIL initially because current implementation
     * treats null runId as silent success.
     */
    it('should FAIL task when platform returns no runId (null response)', async () => {
      // Arrange: IOS succeeds, ANDROID_WEB returns null (no error, no runId)
      mockTestRunService.createTestRuns
        .mockResolvedValueOnce({
          IOS: { runId: 'run-ios-1', url: 'http://test.com/ios', status: 'PENDING' }
        } as any)
        .mockResolvedValueOnce({
          ANDROID_WEB: {} // No runId, no error
        } as any);

      const context: TaskExecutionContext = {
        releaseId: 'release-1',
        tenantId: 'tenant-1',
        release: mockRelease,
        task: mockTask,
        platformTargetMappings: platformMappings
      };

      // Act
      const result = await taskExecutor.executeTask(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Failed to create test runs');
      expect(result.error).toContain('ANDROID_WEB');
      expect(result.error).toMatch(/no run ID returned|Failed to create test run/i);
      
      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          taskStatus: TaskStatus.FAILED
        })
      );
    });
  });

  describe('CREATE_PROJECT_MANAGEMENT_TICKET - Partial Failure Scenarios', () => {
    const mockRelease: Release = {
      id: 'release-1',
      releaseId: 'REL-001',
      tenantId: 'tenant-1',
      releaseConfigId: 'config-1',
      type: 'MINOR',
      branch: 'release/1.0.0',
      baseBranch: 'main',
      baseReleaseId: null,
      releaseTag: null,
      kickOffReminderDate: null,
      status: ReleaseStatus.IN_PROGRESS,
      kickOffDate: new Date('2024-01-01'),
      targetReleaseDate: new Date('2024-01-15'),
      releaseDate: null,
      delayReason: null,
      hasManualBuildUpload: false,
      createdByAccountId: 'user-1',
      releasePilotAccountId: null,
      lastUpdatedByAccountId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockTask: ReleaseTask = {
      id: 'task-2',
      releaseId: 'release-1',
      taskId: 'CREATE_PM_TICKET_1',
      taskType: TaskType.CREATE_PROJECT_MANAGEMENT_TICKET,
      taskStatus: TaskStatus.PENDING,
      taskConclusion: null,
      stage: TaskStage.KICKOFF,
      branch: null,
      isReleaseKickOffTask: true,
      isRegressionSubTasks: false,
      identifier: null,
      accountId: null,
      regressionId: null,
      externalId: null,
      externalData: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const platformMappings = [
      { id: 'mapping-1', releaseId: 'release-1', platform: 'IOS', target: 'APP_STORE', version: '1.0.0' },
      { id: 'mapping-2', releaseId: 'release-1', platform: 'ANDROID_WEB', target: 'WEB', version: '1.0.0' }
    ];

    beforeEach(() => {
      mockReleaseConfigRepo.findById.mockResolvedValue({
        id: 'config-1',
        projectManagementConfigId: 'pm-config-1'
      } as any); // Partial mock for simplicity
    });

    /**
     * TEST 5: Partial Failure - 1 out of 2 platforms fails
     * 
     * Expected Behavior:
     * - Task status should be FAILED
     * - Release status should be PAUSED
     * - Error message should include which platform failed and why
     * - Successful platform's ticket should still be created
     * 
     * This test WILL FAIL initially because current implementation
     * silently ignores the ANDROID_WEB failure and marks task as COMPLETED.
     */
    it('should FAIL task when 1 out of 2 platforms fails to create ticket', async () => {
      // Arrange: IOS succeeds, ANDROID_WEB fails
      mockPMTicketService.createTickets.mockResolvedValue({
        IOS: {
          success: true,
          ticketKey: 'PROJ-123',
          ticketId: 'ticket-123',
          ticketUrl: 'http://jira.com/PROJ-123',
          projectKey: 'PROJ',
          completedStatus: 'Done'
        },
        ANDROID_WEB: {
          success: false,
          error: 'Failed to create ticket: Invalid project key'
        }
      } as any);

      const context: TaskExecutionContext = {
        releaseId: 'release-1',
        tenantId: 'tenant-1',
        release: mockRelease,
        task: mockTask,
        platformTargetMappings: platformMappings
      };

      // Act
      const result = await taskExecutor.executeTask(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Failed to create tickets');
      expect(result.error).toContain('1/2 platforms');
      expect(result.error).toContain('ANDROID_WEB');
      expect(result.error).toContain('Invalid project key');
      
      // Verify task marked as FAILED
      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        'task-2',
        expect.objectContaining({
          taskStatus: TaskStatus.FAILED
        })
      );

      // Verify release PAUSED
      expect(mockReleaseRepo.update).toHaveBeenCalledWith(
        'release-1',
        expect.objectContaining({
          status: ReleaseStatus.PAUSED
        })
      );

      // Note: Platform mapping updates tested in integration tests
    });

    /**
     * TEST 6: Complete Failure - ALL platforms fail
     * 
     * Expected Behavior:
     * - Task status should be FAILED
     * - Release status should be PAUSED
     * - Error message should list ALL failed platforms with reasons
     * 
     * This test WILL FAIL initially because current implementation
     * returns empty string and marks task as COMPLETED.
     */
    it('should FAIL task when ALL platforms fail to create ticket', async () => {
      // Arrange: Both platforms fail
      mockPMTicketService.createTickets.mockResolvedValue({
        IOS: {
          success: false,
          error: 'Failed to create ticket: Authentication failed'
        },
        ANDROID_WEB: {
          success: false,
          error: 'Failed to create ticket: Project not found'
        }
      } as any);

      const context: TaskExecutionContext = {
        releaseId: 'release-1',
        tenantId: 'tenant-1',
        release: mockRelease,
        task: mockTask,
        platformTargetMappings: platformMappings
      };

      // Act
      const result = await taskExecutor.executeTask(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Failed to create tickets for 2/2 platforms');
      expect(result.error).toContain('IOS');
      expect(result.error).toContain('Authentication failed');
      expect(result.error).toContain('ANDROID_WEB');
      expect(result.error).toContain('Project not found');
      
      // Verify task marked as FAILED
      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        'task-2',
        expect.objectContaining({
          taskStatus: TaskStatus.FAILED
        })
      );

      // Verify release PAUSED
      expect(mockReleaseRepo.update).toHaveBeenCalledWith(
        'release-1',
        expect.objectContaining({
          status: ReleaseStatus.PAUSED
        })
      );

      // Note: Platform mapping updates tested in integration tests
    });

    /**
     * TEST 7: Success Case - ALL platforms succeed
     * 
     * Expected Behavior:
     * - Task status should be COMPLETED
     * - Release status should remain IN_PROGRESS (not paused)
     * - Both platforms' tickets should be created
     * 
     * This test should PASS even with current implementation.
     */
    it('should SUCCEED task when ALL platforms succeed', async () => {
      // Arrange: Both platforms succeed
      mockPMTicketService.createTickets.mockResolvedValue({
        IOS: {
          success: true,
          ticketKey: 'PROJ-123',
          ticketId: 'ticket-123',
          ticketUrl: 'http://jira.com/PROJ-123',
          projectKey: 'PROJ',
          completedStatus: 'Done'
        },
        ANDROID_WEB: {
          success: true,
          ticketKey: 'PROJ-124',
          ticketId: 'ticket-124',
          ticketUrl: 'http://jira.com/PROJ-124',
          projectKey: 'PROJ',
          completedStatus: 'Done'
        }
      } as any);

      mockTaskRepo.findById.mockResolvedValue({
        ...mockTask,
        taskStatus: TaskStatus.COMPLETED
      });

      const context: TaskExecutionContext = {
        releaseId: 'release-1',
        tenantId: 'tenant-1',
        release: mockRelease,
        task: mockTask,
        platformTargetMappings: platformMappings
      };

      // Act
      const result = await taskExecutor.executeTask(context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      
      // Verify task marked as COMPLETED
      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        'task-2',
        expect.objectContaining({
          taskStatus: TaskStatus.COMPLETED
        })
      );

      // Verify release NOT paused
      const pauseCalls = (mockReleaseRepo.update as jest.Mock).mock.calls.filter(
        call => call[1]?.status === ReleaseStatus.PAUSED
      );
      expect(pauseCalls.length).toBe(0);

      // Note: Platform mapping updates tested in integration tests
    });

    /**
     * TEST 8: Edge Case - No ticketKey returned (success but null ticket)
     * 
     * Expected Behavior:
     * - Task should FAIL if no ticketKey is returned
     * - Error message should indicate no ticket ID was returned
     * 
     * This test WILL FAIL initially because current implementation
     * treats null ticketKey as silent success.
     */
    it('should FAIL task when platform returns success but no ticketKey', async () => {
      // Arrange: IOS succeeds, ANDROID_WEB returns success but no ticketKey
      mockPMTicketService.createTickets.mockResolvedValue({
        IOS: {
          success: true,
          ticketKey: 'PROJ-123',
          ticketId: 'ticket-123',
          ticketUrl: 'http://jira.com/PROJ-123',
          projectKey: 'PROJ',
          completedStatus: 'Done'
        },
        ANDROID_WEB: {
          success: true,
          // No ticketKey!
          projectKey: 'PROJ',
          completedStatus: 'Done'
        }
      } as any);

      const context: TaskExecutionContext = {
        releaseId: 'release-1',
        tenantId: 'tenant-1',
        release: mockRelease,
        task: mockTask,
        platformTargetMappings: platformMappings
      };

      // Act
      const result = await taskExecutor.executeTask(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Failed to create tickets');
      expect(result.error).toContain('ANDROID_WEB');
      expect(result.error).toMatch(/no ticket ID returned|Failed to create ticket/i);
      
      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        'task-2',
        expect.objectContaining({
          taskStatus: TaskStatus.FAILED
        })
      );
    });
  });
});

